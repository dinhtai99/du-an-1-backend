const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const Voucher = require('../models/Voucher');
const Address = require('../models/Address');
const User = require('../models/User');
const { verifyToken, requireCustomer } = require('../middleware/authMiddleware');
const zalopayService = require('../services/zalopayService');
const momoService = require('../services/momoService');
const vnpayService = require('../services/vnpayService');

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
    const { addressId, items, discount, paymentMethod, notes, voucherCode } = req.body;
    
    // ============================================
    // 1. VALIDATE VÀ LẤY ĐỊA CHỈ GIAO HÀNG
    // ============================================
    let finalShippingAddress = null;
    
    // Nếu có addressId, lấy địa chỉ từ Address collection
    if (addressId) {
      console.log('📍 Lấy địa chỉ từ ID:', addressId);
      const address = await Address.findOne({ _id: addressId, user: req.user.userId });
      if (!address) {
        return res.status(400).json({
          success: false,
          message: "Không tìm thấy địa chỉ hoặc địa chỉ không thuộc về bạn!",
          data: null
        });
      }
      finalShippingAddress = {
        fullName: address.fullName,
        phone: address.phone,
        address: address.address,
        ward: address.ward || "",
        district: address.district || "",
        city: address.city || ""
      };
      console.log('✅ Địa chỉ từ database:', finalShippingAddress);
    } else {
      // Nếu không có addressId, tự động tạo địa chỉ từ thông tin User profile
      console.log('📍 Không có addressId, lấy địa chỉ từ User profile');
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy thông tin người dùng!",
          data: null
        });
      }
      
      // Kiểm tra xem user có đủ thông tin địa chỉ không
      if (!user.fullName || !user.phone || !user.address) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng cung cấp addressId hoặc cập nhật đầy đủ thông tin địa chỉ trong profile (Họ tên, SĐT, Địa chỉ)!",
          data: null
        });
      }
      
      // Tự động tạo Address từ thông tin User profile
      // Tìm xem đã có địa chỉ tương tự chưa (để tránh tạo trùng)
      let existingAddress = await Address.findOne({ 
        user: req.user.userId,
        fullName: user.fullName,
        phone: user.phone,
        address: user.address
      });
      
      if (!existingAddress) {
        // Tạo địa chỉ mới từ User profile
        // Lưu ý: user.address chỉ là chuỗi đơn giản, không có ward, district, city riêng
        // Nên ta sẽ lưu toàn bộ vào field address, và để ward, district, city trống
        // Không set city mặc định vì user có thể ở bất kỳ đâu
        existingAddress = new Address({
          user: req.user.userId,
          fullName: user.fullName,
          phone: user.phone,
          address: user.address,
          ward: "",
          district: "",
          city: "", // Để trống, user sẽ cập nhật sau hoặc thêm vào địa chỉ chi tiết
          isDefault: false
        });
        await existingAddress.save();
        console.log('✅ Đã tự động tạo địa chỉ từ User profile:', existingAddress._id);
      } else {
        console.log('✅ Sử dụng địa chỉ đã tồn tại từ User profile:', existingAddress._id);
      }
      
      finalShippingAddress = {
        fullName: existingAddress.fullName,
        phone: existingAddress.phone,
        address: existingAddress.address,
        ward: existingAddress.ward || "",
        district: existingAddress.district || "",
        city: existingAddress.city || "" // Có thể để trống nếu không có thông tin
      };
      console.log('✅ Địa chỉ đã được lấy từ User profile:', finalShippingAddress);
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
    // 2. VALIDATE VOUCHER (nếu có) - Tạm thời chỉ khai báo, sẽ validate sau khi tính subtotal
    // ============================================
    let voucher = null;
    let voucherDiscount = 0;

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

    // ============================================
    // 4. VALIDATE VÀ ÁP DỤNG VOUCHER (sau khi tính subtotal)
    // ============================================
    if (voucherCode) {
      voucher = await Voucher.findOne({ code: voucherCode.toUpperCase() })
        .populate("applicableProducts", "name category")
        .populate("applicableCategories", "name")
        .populate("applicableUsers", "fullName email");
      
      if (!voucher) {
        return res.status(400).json({
          success: false,
          message: "Mã voucher không tồn tại!",
          data: null
        });
      }

      // Kiểm tra voucher hợp lệ
      const now = new Date();
      if (voucher.status === 0) {
        return res.status(400).json({
          success: false,
          message: "Voucher đã bị vô hiệu hóa!",
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
      if (now < voucher.startDate || now > voucher.endDate) {
        return res.status(400).json({
          success: false,
          message: "Voucher không còn hiệu lực!",
          data: null
        });
      }

      // Kiểm tra đơn hàng tối thiểu (PHẢI KIỂM TRA TRƯỚC KHI TÍNH DISCOUNT)
      if (subtotal < voucher.minOrderValue) {
        return res.status(400).json({
          success: false,
          message: `Đơn hàng tối thiểu ${voucher.minOrderValue.toLocaleString('vi-VN')} VNĐ để sử dụng voucher này!`,
          data: null
        });
      }

      // Kiểm tra user được áp dụng
      // Lưu ý: applicableUsers có thể đã được populate (User object) hoặc chưa (ObjectId)
      if (voucher.applicableUsers.length > 0) {
        const isApplicable = voucher.applicableUsers.some(
          id => {
            // Nếu đã populate, id là User object → dùng id._id
            // Nếu chưa populate, id là ObjectId → dùng id trực tiếp
            const userId = id._id ? id._id.toString() : id.toString();
            return userId === req.user.userId.toString();
          }
        );
        if (!isApplicable) {
          return res.status(400).json({
            success: false,
            message: "Bạn không được sử dụng voucher này!",
            data: null
          });
        }
      }

      // Kiểm tra sản phẩm áp dụng
      const productIds = items.map(item => item.product);
      if (voucher.applicableProducts.length > 0) {
        const applicable = productIds.some(productId => 
          voucher.applicableProducts.some(p => p._id.toString() === productId.toString())
        );
        if (!applicable) {
          return res.status(400).json({
            success: false,
            message: "Voucher không áp dụng cho sản phẩm trong giỏ hàng!",
            data: null
          });
        }
      }

      // Tính toán giảm giá (SAU KHI VALIDATE)
      if (voucher.type === "percentage") {
        voucherDiscount = (subtotal * voucher.value) / 100;
      if (voucher.maxDiscount && voucherDiscount > voucher.maxDiscount) {
        voucherDiscount = voucher.maxDiscount;
        }
      } else {
        voucherDiscount = voucher.value;
      }
    }

    // Tính phí vận chuyển
    const shippingFee = 30000; // Mặc định 30k
    
    // Tính tổng tiền cuối cùng (chỉ trừ voucherDiscount, không trừ discount từ request body)
    const total = subtotal + shippingFee - voucherDiscount;

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
        fullName: finalShippingAddress.fullName,
        phone: finalShippingAddress.phone,
        address: finalShippingAddress.address,
        ward: finalShippingAddress.ward || "",
        district: finalShippingAddress.district || "",
        city: finalShippingAddress.city || "" // Đảm bảo luôn có giá trị (có thể là empty string)
      },
      items: orderItems,
      subtotal: subtotal,
      shippingFee: shippingFee,
      discount: 0, // Discount tổng (không dùng trong invoice)
      voucher: voucher ? voucher._id : null,
      voucherCode: voucherCode ? voucherCode.toUpperCase() : null,
      voucherDiscount: voucherDiscount,
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
    // 7. XỬ LÝ THANH TOÁN ONLINE (ZaloPay/MoMo/VNPay)
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

    if (finalPaymentMethod === "vnpay") {
      // Tạo vnp_TxnRef cho VNPay
      const vnp_TxnRef = vnpayService.generateTxnRef(order._id);

      // Tạo payment URL
      // Extract IP address (có thể có IPv6 prefix)
      // Lấy IP từ nhiều nguồn, ưu tiên x-forwarded-for (khi có proxy/ngrok)
      let clientIp = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || req.ip || req.connection.remoteAddress;
      
      // Nếu có x-forwarded-for, lấy IP đầu tiên (có thể có nhiều IP)
      if (clientIp && clientIp.includes(",")) {
        clientIp = clientIp.split(",")[0].trim();
      }
      
      // Nếu không có IP, dùng default
      if (!clientIp) {
        clientIp = "192.168.1.1"; // Dùng IP mặc định hợp lệ thay vì localhost
      }
      
      console.log("🌐 Client IP extracted:", {
        original: req.ip || req.connection.remoteAddress,
        xForwardedFor: req.headers["x-forwarded-for"],
        xRealIp: req.headers["x-real-ip"],
        final: clientIp
      });
      
      const vnpayResult = vnpayService.createPaymentUrl({
        vnp_Amount: Math.round(order.total * 100), // VNPay yêu cầu số tiền tính bằng xu (x100)
        vnp_TxnRef: vnp_TxnRef,
        vnp_OrderInfo: `Thanh toán đơn hàng ${order.orderNumber}`,
        vnp_IpAddr: clientIp,
      });

      if (!vnpayResult.success) {
        // Xóa order nếu không tạo được payment
        await Order.findByIdAndDelete(order._id);
        return res.status(400).json({
          success: false,
          message: "Không thể tạo đơn hàng thanh toán VNPay!",
          error: vnpayResult.message,
          data: null
        });
      }

      // Lưu thông tin VNPay vào order
      order.vnpayTxnRef = vnp_TxnRef;
      order.paymentStatus = "processing";
      order.timeline.push({
        status: "new",
        message: "Đã tạo yêu cầu thanh toán VNPay",
        updatedBy: req.user.userId,
      });
      await order.save();

      // Trả về thông tin thanh toán VNPay
      return res.status(201).json({
        success: true,
        message: "Tạo đơn hàng thanh toán VNPay thành công!",
        data: {
          _id: order._id,
          invoiceNumber: order.orderNumber,
          paymentMethod: "vnpay",
          paymentInfo: {
            paymentUrl: vnpayResult.paymentUrl,
            vnp_TxnRef: vnp_TxnRef,
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
    // Tăng số lần sử dụng voucher (chỉ với COD/cash, online payment sẽ tăng sau khi thanh toán thành công)
    if (voucher && (finalPaymentMethod === "COD" || finalPaymentMethod === "cash")) {
      voucher.usedCount += 1;
      await voucher.save();
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

