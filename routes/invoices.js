const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const Voucher = require('../models/Voucher');
const { verifyToken, requireCustomer } = require('../middleware/authMiddleware');
const zalopayService = require('../services/zalopayService');
const momoService = require('../services/momoService');

// ============================================
// HELPER FUNCTION: Tạo orderNumber (unique)
// ============================================
async function generateOrderNumber() {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    try {
      // Đếm số order hiện có để tạo số thứ tự
      const count = await Order.countDocuments();
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      
      // Tạo orderNumber với timestamp để tránh duplicate
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
      const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
      
      // Format: DHYYYYMMDD-HHMMSS-MMM-RR
      const orderNumber = `DH${year}${month}${day}-${hours}${minutes}${seconds}-${milliseconds}-${random}`;
      
      // Kiểm tra xem orderNumber đã tồn tại chưa
      const existingOrder = await Order.findOne({ orderNumber });
      if (!existingOrder) {
        return orderNumber;
      }
      
      // Nếu đã tồn tại, thử lại với random khác
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 10)); // Đợi 10ms trước khi thử lại
    } catch (error) {
      console.error('Error generating orderNumber:', error);
      // Fallback nếu có lỗi
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      return `DH${year}${month}${day}${hours}${minutes}${seconds}${random}`;
    }
  }
  
  // Nếu vẫn không tạo được sau maxAttempts, dùng format đơn giản với timestamp
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `DH${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}${random}`;
}

// ============================================
// POST /api/invoices
// Tạo đơn hàng (Invoice) - Dùng cho COD và các phương thức thanh toán khác
// ============================================
router.post('/', verifyToken, requireCustomer, async (req, res) => {
  console.log('=== 📥 CREATE INVOICE REQUEST ===');
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('User ID:', req.user.userId);
  
  try {
    const { shippingAddress, items, discount, paymentMethod, notes, voucherCode } = req.body;
    
    // ============================================
    // 1. VALIDATE INPUT
    // ============================================
    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.address || !shippingAddress.city) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin địa chỉ giao hàng!",
        data: null
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Giỏ hàng trống!",
        data: null
      });
    }

    // Mặc định paymentMethod là COD nếu không có
    let finalPaymentMethod = paymentMethod || "COD";
    
    // Xử lý cash thành COD
    if (finalPaymentMethod === "cash") {
      finalPaymentMethod = "COD";
    }

    // ============================================
    // 2. VALIDATE VOUCHER (nếu có)
    // ============================================
    let voucherDiscount = 0;
    let finalDiscount = discount || 0;
    
    if (voucherCode) {
      const voucher = await Voucher.findOne({ code: voucherCode });
      
      if (!voucher) {
        return res.status(400).json({
          success: false,
          message: "Mã voucher không hợp lệ!",
          data: null
        });
      }

      // Kiểm tra voucher còn hiệu lực
      const now = new Date();
      if (voucher.status !== 1) {
        return res.status(400).json({
          success: false,
          message: "Voucher không còn hiệu lực!",
          data: null
        });
      }

      if (voucher.startDate && new Date(voucher.startDate) > now) {
        return res.status(400).json({
          success: false,
          message: "Voucher chưa đến thời gian sử dụng!",
          data: null
        });
      }

      if (voucher.endDate && new Date(voucher.endDate) < now) {
        return res.status(400).json({
          success: false,
          message: "Voucher đã hết hạn!",
          data: null
        });
      }

      if (voucher.usedCount >= voucher.quantity) {
        return res.status(400).json({
          success: false,
          message: "Voucher đã hết lượt sử dụng!",
          data: null
        });
      }
    }

    // ============================================
    // 3. TÍNH TOÁN TỔNG TIỀN
    // ============================================
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      // Validate item
      if (!item.product || !item.quantity || !item.price) {
        return res.status(400).json({
          success: false,
          message: "Thông tin sản phẩm không đầy đủ!",
          data: null
        });
      }

      // Lấy thông tin sản phẩm từ database
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm ${item.product} không tồn tại!`,
          data: null
        });
      }

      // Kiểm tra số lượng tồn kho
      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm ${product.name} chỉ còn ${product.stock} sản phẩm!`,
          data: null
        });
      }

      const itemSubtotal = item.price * item.quantity;
      subtotal += itemSubtotal;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        color: item.color || "",
        size: item.size || "",
        price: item.price,
        discount: item.discount || 0,
        subtotal: itemSubtotal
      });
    }

    // Áp dụng voucher discount
    if (voucherCode) {
      const voucher = await Voucher.findOne({ code: voucherCode });
      
      if (voucher.type === 'percentage') {
        voucherDiscount = (subtotal * voucher.value) / 100;
      } else {
        voucherDiscount = voucher.value;
      }

      // Kiểm tra điều kiện đơn hàng tối thiểu
      if (voucher.minOrderValue && subtotal < voucher.minOrderValue) {
        return res.status(400).json({
          success: false,
          message: `Đơn hàng tối thiểu ${voucher.minOrderValue.toLocaleString('vi-VN')} VNĐ để sử dụng voucher này!`,
          data: null
        });
      }

      // Giới hạn discount tối đa
      if (voucher.maxDiscount && voucherDiscount > voucher.maxDiscount) {
        voucherDiscount = voucher.maxDiscount;
      }

      finalDiscount = (discount || 0) + voucherDiscount;
    }

    // Tính phí vận chuyển
    const shippingFee = 30000; // Mặc định 30k
    
    // Tính tổng tiền cuối cùng
    const total = subtotal + shippingFee - finalDiscount;

    // Xử lý voucher
    let voucherDoc = null;
    if (voucherCode) {
      voucherDoc = await Voucher.findOne({ code: voucherCode.toUpperCase() });
    }

    // ============================================
    // 5. TẠO ORDER NUMBER TRƯỚC KHI TẠO ORDER
    // ============================================
    const orderNumber = await generateOrderNumber();
    console.log('📝 Generated orderNumber:', orderNumber);

    // ============================================
    // 6. TẠO ORDER TRONG DATABASE
    // ============================================
    const order = new Order({
      orderNumber: orderNumber, // ✅ QUAN TRỌNG: Phải set orderNumber trước
      customer: req.user.userId, // Sử dụng user từ token
      shippingAddress: {
        fullName: shippingAddress.fullName,
        phone: shippingAddress.phone,
        address: shippingAddress.address,
        ward: shippingAddress.ward || "",
        district: shippingAddress.district || "",
        city: shippingAddress.city
      },
      items: orderItems,
      subtotal: subtotal,
      shippingFee: shippingFee,
      discount: 0, // Discount tổng (không dùng trong invoice)
      voucher: voucherDoc ? voucherDoc._id : null,
      voucherCode: voucherCode ? voucherCode.toUpperCase() : null,
      voucherDiscount: finalDiscount,
      total: total > 0 ? total : 0,
      paymentMethod: finalPaymentMethod,
      paymentStatus: (finalPaymentMethod === "COD" || finalPaymentMethod === "cash") ? "pending" : "pending",
      status: "new",
      notes: notes || '',
      timeline: [{
        status: "new",
        message: finalPaymentMethod === "COD" || finalPaymentMethod === "cash" 
          ? "Đơn hàng đã được tạo" 
          : `Đơn hàng đã được tạo, chờ thanh toán ${finalPaymentMethod}`,
        updatedBy: req.user.userId,
      }]
    });

    await order.save();

    // ============================================
    // 7. XỬ LÝ THANH TOÁN ONLINE (ZaloPay/MoMo)
    // ============================================
    if (finalPaymentMethod === "zalopay") {
      // Tạo app_trans_id cho ZaloPay
      const appTransId = zalopayService.generateAppTransId(order._id);

      // Chuẩn bị thông tin items cho ZaloPay
      const zalopayItems = order.items.map((item, index) => ({
        itemid: `item_${index + 1}`,
        itemname: `Sản phẩm ${index + 1}`,
        itemprice: item.price,
        itemquantity: item.quantity,
      }));
      const itemString = JSON.stringify(zalopayItems);

      // Embed data
      const embedData = {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
      };

      // Gọi ZaloPay API
      const zalopayResult = await zalopayService.createOrder({
        app_trans_id: appTransId,
        amount: order.total,
        description: `Thanh toán đơn hàng ${order.orderNumber}`,
        item: itemString,
        embed_data: JSON.stringify(embedData),
      });

      if (!zalopayResult.success) {
        // Xóa order nếu không tạo được payment
        await Order.findByIdAndDelete(order._id);
        return res.status(400).json({
          success: false,
          message: "Không thể tạo đơn hàng thanh toán ZaloPay!",
          error: zalopayResult.return_message,
          data: null
        });
      }

      // Lưu thông tin ZaloPay vào order
      order.zalopayTransToken = zalopayResult.zp_trans_token;
      order.zalopayOrderId = appTransId;
      order.paymentStatus = "processing";
      order.timeline.push({
        status: "new",
        message: "Đã tạo yêu cầu thanh toán ZaloPay",
        updatedBy: req.user.userId,
      });
      await order.save();

      // Trả về thông tin thanh toán ZaloPay
      return res.status(201).json({
        success: true,
        message: "Tạo đơn hàng thanh toán ZaloPay thành công!",
        data: {
          _id: order._id,
          invoiceNumber: order.orderNumber,
          paymentMethod: "zalopay",
          paymentInfo: {
            zp_trans_token: zalopayResult.zp_trans_token,
            order_url: zalopayResult.order_url,
            order_token: zalopayResult.order_token,
          }
        }
      });
    }

    if (finalPaymentMethod === "momo") {
      // Tạo orderId cho MoMo
      const momoOrderId = momoService.generateOrderId(order._id);

      // Gọi MoMo API
      const momoResult = await momoService.createOrder({
        orderId: momoOrderId,
        amount: order.total,
        orderInfo: `Thanh toán đơn hàng ${order.orderNumber}`,
        extraData: JSON.stringify({
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
        }),
      });

      if (!momoResult.success) {
        // Xóa order nếu không tạo được payment
        await Order.findByIdAndDelete(order._id);
        return res.status(400).json({
          success: false,
          message: "Không thể tạo đơn hàng thanh toán MoMo!",
          error: momoResult.message,
          data: null
        });
      }

      // Lưu thông tin MoMo vào order
      order.momoOrderId = momoResult.orderId || momoOrderId;
      order.momoRequestId = momoResult.requestId || `${momoOrderId}_${Date.now()}`;
      order.paymentStatus = "processing";
      order.timeline.push({
        status: "new",
        message: "Đã tạo yêu cầu thanh toán MoMo",
        updatedBy: req.user.userId,
      });
      await order.save();

      // Trả về thông tin thanh toán MoMo
      return res.status(201).json({
        success: true,
        message: "Tạo đơn hàng thanh toán MoMo thành công!",
        data: {
          _id: order._id,
          invoiceNumber: order.orderNumber,
          paymentMethod: "momo",
          paymentInfo: {
            payUrl: momoResult.payUrl,
            deeplink: momoResult.deeplink,
            qrCodeUrl: momoResult.qrCodeUrl,
          }
        }
      });
    }

    // ============================================
    // 8. XỬ LÝ COD/CASH - TRỪ TỒN KHO VÀ VOUCHER
    // ============================================
    // Giảm số lượng sản phẩm trong kho (chỉ với COD/cash)
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity }
      });
    }

    // Tăng số lượt sử dụng voucher (chỉ với COD/cash)
    if (voucherDoc) {
      voucherDoc.usedCount += 1;
      await voucherDoc.save();
    }

    // ============================================
    // 9. POPULATE ORDER VỚI THÔNG TIN ĐẦY ĐỦ
    // ============================================
    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'fullName email phone')
      .populate('items.product', 'name price image images')
      .populate('voucher', 'code name type value')
      .lean();

    // ============================================
    // 10. TRẢ VỀ RESPONSE CHO COD/CASH
    // ============================================
    console.log('✅ Invoice created successfully:', order._id);
    
    res.status(201).json({
      success: true,
      message: "Đặt hàng thành công!",
      data: {
        _id: populatedOrder._id,
        invoiceNumber: populatedOrder.orderNumber,
        customer: populatedOrder.customer,
        items: populatedOrder.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
          subtotal: item.subtotal
        })),
        subtotal: populatedOrder.subtotal,
        shippingFee: populatedOrder.shippingFee,
        voucherDiscount: populatedOrder.voucherDiscount,
        total: populatedOrder.total,
        status: populatedOrder.status,
        paymentMethod: populatedOrder.paymentMethod,
        paymentStatus: populatedOrder.paymentStatus,
        shippingAddress: populatedOrder.shippingAddress,
        createdAt: populatedOrder.createdAt,
        updatedAt: populatedOrder.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ Create invoice error:', error);
    res.status(500).json({
      success: false,
      message: "Lỗi server!",
      error: error.message
    });
  }
});

// ============================================
// GET /api/invoices
// Lấy danh sách đơn hàng
// ============================================
router.get('/', verifyToken, async (req, res) => {
  try {
    const { 
      search, 
      customer, 
      staff, 
      status, 
      paymentMethod, 
      startDate, 
      endDate,
      page = 1,
      limit = 10
    } = req.query;

    const query = {};

    // Filter theo customer (nếu là customer)
    if (req.user.role === 'customer') {
      query.customer = req.user.userId;
    } else if (customer) {
      query.customer = customer;
    }

    // Filter theo staff (nếu là admin/staff)
    if (staff) {
      query.staff = staff;
    }

    // Filter theo status
    if (status) {
      query.status = status;
    }

    // Filter theo payment method
    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    // Filter theo ngày
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Search
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(query)
      .populate('customer', 'fullName email phone')
      .populate('items.product', 'name price image images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('❌ Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: "Lỗi server!",
      error: error.message
    });
  }
});

// ============================================
// GET /api/invoices/:id
// Lấy chi tiết đơn hàng
// ============================================
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate('customer', 'fullName email phone')
      .populate('items.product', 'name price image images')
      .populate('voucher', 'code name type value')
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Đơn hàng không tồn tại!",
        data: null
      });
    }

    // Kiểm tra quyền truy cập (customer chỉ xem được đơn của mình)
    if (req.user.role === 'customer' && order.customer._id.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền truy cập!",
        data: null
      });
    }

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('❌ Get invoice error:', error);
    res.status(500).json({
      success: false,
      message: "Lỗi server!",
      error: error.message
    });
  }
});

// ============================================
// PATCH /api/invoices/:id/status
// Cập nhật trạng thái đơn hàng
// ============================================
router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Thiếu trạng thái!",
        data: null
      });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { 
        status: status,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('customer', 'fullName email phone')
     .populate('items.product', 'name price image images')
     .populate('voucher', 'code name type value')
     .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Đơn hàng không tồn tại!",
        data: null
      });
    }

    res.json({
      success: true,
      message: "Cập nhật trạng thái thành công!",
      data: order
    });

  } catch (error) {
    console.error('❌ Update invoice status error:', error);
    res.status(500).json({
      success: false,
      message: "Lỗi server!",
      error: error.message
    });
  }
});

module.exports = router;

