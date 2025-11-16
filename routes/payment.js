const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Voucher = require("../models/Voucher");
const Notification = require("../models/Notification");
const zalopayService = require("../services/zalopayService");
const { verifyToken } = require("../middleware/authMiddleware");

/**
 * POST /api/payment/zalopay/create
 * Tạo đơn hàng và gọi ZaloPay API để tạo payment order
 * Bước 2 trong flow: Merchant gửi yêu cầu tạo đơn thanh toán sang ZaloPay
 */
router.post("/zalopay/create", verifyToken, async (req, res) => {
  try {
    const { shippingAddress, notes, voucherCode, orderId } = req.body;

    let order;

    // Nếu có orderId, lấy đơn hàng đã tạo (cho trường hợp tạo order trước)
    if (orderId) {
      order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Không tìm thấy đơn hàng!" });
      }
      if (order.customer.toString() !== req.user.userId) {
        return res.status(403).json({ message: "Không có quyền truy cập đơn hàng này!" });
      }
      if (order.paymentMethod !== "zalopay") {
        return res.status(400).json({ message: "Đơn hàng không phải thanh toán ZaloPay!" });
      }
    } else {
      // Tạo đơn hàng mới từ giỏ hàng
      if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.address || !shippingAddress.city) {
        return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin địa chỉ giao hàng!" });
      }

      // Lấy giỏ hàng
      const cart = await Cart.findOne({ user: req.user.userId }).populate("items.product");
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ message: "Giỏ hàng trống!" });
      }

      // Kiểm tra tồn kho và tính toán
      let subtotal = 0;
      const orderItems = [];
      const productIds = [];

      for (const item of cart.items) {
        const product = item.product;
        
        if (product.status === 0) {
          return res.status(400).json({ message: `Sản phẩm ${product.name} đã bị ẩn!` });
        }

        if (product.stock < item.quantity) {
          return res.status(400).json({ 
            message: `Sản phẩm ${product.name} chỉ còn ${product.stock} sản phẩm trong kho!` 
          });
        }

        const price = product.salePrice || product.price;
        const itemSubtotal = price * item.quantity;

        orderItems.push({
          product: product._id,
          quantity: item.quantity,
          color: item.color || "",
          size: item.size || "",
          price,
          discount: 0,
          subtotal: itemSubtotal,
        });

        subtotal += itemSubtotal;
        productIds.push(product._id);
      }

      // Tính phí vận chuyển
      const shippingFee = 30000; // Mặc định 30k

      // Xử lý voucher nếu có
      let voucher = null;
      let voucherDiscount = 0;
      let voucherCodeUsed = null;

      if (voucherCode) {
        voucher = await Voucher.findOne({ code: voucherCode.toUpperCase() })
          .populate("applicableProducts", "name category")
          .populate("applicableCategories", "name");

        if (!voucher) {
          return res.status(400).json({ message: "Mã voucher không tồn tại!" });
        }

        // Kiểm tra voucher hợp lệ
        const now = new Date();
        if (voucher.status === 0) {
          return res.status(400).json({ message: "Voucher đã bị vô hiệu hóa!" });
        }
        if (voucher.usedCount >= voucher.quantity) {
          return res.status(400).json({ message: "Voucher đã hết lượt sử dụng!" });
        }
        if (now < voucher.startDate || now > voucher.endDate) {
          return res.status(400).json({ message: "Voucher không còn hiệu lực!" });
        }
        if (subtotal < voucher.minOrderValue) {
          return res.status(400).json({ 
            message: `Đơn hàng tối thiểu ${voucher.minOrderValue.toLocaleString()} VNĐ để sử dụng voucher này!` 
          });
        }

        // Kiểm tra user được áp dụng
        if (voucher.applicableUsers.length > 0) {
          const isApplicable = voucher.applicableUsers.some(
            id => id.toString() === req.user.userId.toString()
          );
          if (!isApplicable) {
            return res.status(400).json({ message: "Bạn không được sử dụng voucher này!" });
          }
        }

        // Kiểm tra sản phẩm áp dụng
        if (voucher.applicableProducts.length > 0) {
          const applicable = productIds.some(productId => 
            voucher.applicableProducts.some(p => p._id.toString() === productId.toString())
          );
          if (!applicable) {
            return res.status(400).json({ message: "Voucher không áp dụng cho sản phẩm trong giỏ hàng!" });
          }
        }

        // Tính toán giảm giá
        if (voucher.type === "percentage") {
          voucherDiscount = (subtotal * voucher.value) / 100;
          if (voucher.maxDiscount && voucherDiscount > voucher.maxDiscount) {
            voucherDiscount = voucher.maxDiscount;
          }
        } else {
          voucherDiscount = voucher.value;
        }

        voucherCodeUsed = voucher.code;
      }

      // Tính tổng tiền cuối cùng
      const total = subtotal + shippingFee - voucherDiscount;

      // Tạo đơn hàng với paymentMethod = "zalopay" và paymentStatus = "pending"
      order = new Order({
        customer: req.user.userId,
        shippingAddress,
        items: orderItems,
        subtotal,
        shippingFee,
        discount: 0,
        voucher: voucher ? voucher._id : null,
        voucherCode: voucherCodeUsed,
        voucherDiscount,
        total: total > 0 ? total : 0,
        paymentMethod: "zalopay",
        paymentStatus: "pending",
        status: "new",
        notes: notes || "",
        timeline: [{
          status: "new",
          message: "Đơn hàng đã được tạo, chờ thanh toán ZaloPay",
          updatedBy: req.user.userId,
        }],
      });

      await order.save();

      // Tăng số lần sử dụng voucher (nhưng chưa trừ tồn kho vì chưa thanh toán)
      if (voucher) {
        voucher.usedCount += 1;
        await voucher.save();
      }
    }

    // Tạo app_trans_id cho ZaloPay
    const appTransId = zalopayService.generateAppTransId(order._id);

    // Chuẩn bị thông tin items cho ZaloPay (JSON string)
    const zalopayItems = order.items.map((item, index) => ({
      itemid: `item_${index + 1}`,
      itemname: `Sản phẩm ${index + 1}`,
      itemprice: item.price,
      itemquantity: item.quantity,
    }));
    const itemString = JSON.stringify(zalopayItems);

    // Embed data (có thể chứa orderId để xử lý callback)
    const embedData = {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
    };

    // Gọi ZaloPay API để tạo payment order
    const zalopayResult = await zalopayService.createOrder({
      app_trans_id: appTransId,
      amount: order.total,
      description: `Thanh toán đơn hàng ${order.orderNumber}`,
      item: itemString,
      embed_data: JSON.stringify(embedData),
    });

    if (!zalopayResult.success) {
      return res.status(400).json({
        message: "Không thể tạo đơn hàng thanh toán ZaloPay!",
        error: zalopayResult.return_message,
      });
    }

    // Lưu thông tin ZaloPay vào order
    order.zalopayTransToken = zalopayResult.zp_trans_token;
    order.zalopayOrderId = appTransId;
    order.paymentStatus = "processing";
    await order.save();

    // Cập nhật timeline
    if (!order.timeline) {
      order.timeline = [];
    }
    order.timeline.push({
      status: "new",
      message: "Đã tạo yêu cầu thanh toán ZaloPay",
      updatedBy: req.user.userId,
    });
    await order.save();

    // Trả về zp_trans_token để client SDK sử dụng
    res.json({
      success: true,
      message: "Tạo đơn hàng thanh toán ZaloPay thành công!",
      zp_trans_token: zalopayResult.zp_trans_token,
      order_url: zalopayResult.order_url,
      order_token: zalopayResult.order_token,
      orderId: order._id,
      orderNumber: order.orderNumber,
    });
  } catch (error) {
    console.error("Create ZaloPay payment error:", error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
});

/**
 * POST /api/payment/zalopay/callback
 * Webhook callback từ ZaloPay khi thanh toán hoàn tất
 * Bước 4 trong flow: ZaloPay trả về kết quả giao dịch
 */
router.post("/zalopay/callback", async (req, res) => {
  try {
    // ZaloPay gửi callback với format: { data: {...}, mac: "..." }
    const { data, mac } = req.body;

    if (!data || !mac) {
      return res.status(400).json({ return_code: -1, return_message: "Thiếu dữ liệu!" });
    }

    // Xác thực MAC
    const isValid = zalopayService.verifyCallback({ data, mac });
    if (!isValid) {
      console.error("ZaloPay callback MAC invalid:", { data, mac });
      return res.status(400).json({ return_code: -1, return_message: "MAC không hợp lệ!" });
    }

    // Parse embed_data để lấy orderId
    let orderId = null;
    try {
      const embedData = JSON.parse(data.embed_data || "{}");
      orderId = embedData.orderId;
    } catch (e) {
      console.error("Parse embed_data error:", e);
    }

    // Nếu không có orderId trong embed_data, thử parse từ app_trans_id
    if (!orderId && data.app_trans_id) {
      // app_trans_id format: YYMMDD_orderId
      const parts = data.app_trans_id.split("_");
      if (parts.length > 1) {
        // Tìm order theo zalopayOrderId
        const order = await Order.findOne({ zalopayOrderId: data.app_trans_id });
        if (order) {
          orderId = order._id.toString();
        }
      }
    }

    if (!orderId) {
      console.error("Cannot find orderId from callback:", data);
      return res.status(400).json({ return_code: -1, return_message: "Không tìm thấy đơn hàng!" });
    }

    // Tìm đơn hàng
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ return_code: -1, return_message: "Không tìm thấy đơn hàng!" });
    }

    // Kiểm tra nếu đã xử lý callback này rồi (idempotency)
    if (order.paymentStatus === "success" && order.status !== "new") {
      return res.json({ return_code: 1, return_message: "OK" });
    }

    // Xử lý kết quả thanh toán
    if (data.status === 1) {
      // Thanh toán thành công
      order.paymentStatus = "success";
      order.zalopayMac = mac;
      
      // Cập nhật timeline
      if (!order.timeline) {
        order.timeline = [];
      }
      order.timeline.push({
        status: "processing",
        message: "Thanh toán ZaloPay thành công",
        updatedBy: order.customer,
      });
      await order.save();

      // Trừ tồn kho
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product && product.stock >= item.quantity) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: -item.quantity },
          });
        }
      }

      // Tạo thông báo
      await Notification.create({
        user: order.customer,
        type: "order",
        title: "Thanh toán thành công",
        message: `Đơn hàng ${order.orderNumber} đã được thanh toán thành công qua ZaloPay!`,
        link: `/orders/${order._id}`,
      });

      // Xóa giỏ hàng nếu có
      const cart = await Cart.findOne({ user: order.customer });
      if (cart) {
        cart.items = [];
        await cart.save();
      }
    } else {
      // Thanh toán thất bại
      order.paymentStatus = "failed";
      
      if (!order.timeline) {
        order.timeline = [];
      }
      order.timeline.push({
        status: "new",
        message: `Thanh toán ZaloPay thất bại: ${data.return_message || "Lỗi không xác định"}`,
        updatedBy: order.customer,
      });
      await order.save();

      // Hoàn lại voucher đã sử dụng
      if (order.voucher) {
        const voucher = await Voucher.findById(order.voucher);
        if (voucher) {
          voucher.usedCount = Math.max(0, voucher.usedCount - 1);
          await voucher.save();
        }
      }
    }

    // Trả về success cho ZaloPay
    res.json({ return_code: 1, return_message: "OK" });
  } catch (error) {
    console.error("ZaloPay callback error:", error);
    res.status(500).json({ return_code: -1, return_message: "Lỗi server!" });
  }
});

/**
 * GET /api/payment/zalopay/status/:orderId
 * Kiểm tra trạng thái thanh toán của đơn hàng
 */
router.get("/zalopay/status/:orderId", verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng!" });
    }

    // Customer chỉ xem đơn hàng của mình
    if (req.user.role === "customer" && order.customer.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Không có quyền xem đơn hàng này!" });
    }

    // Nếu có zalopayOrderId, query từ ZaloPay để lấy trạng thái mới nhất
    if (order.zalopayOrderId && order.paymentStatus === "processing") {
      const queryResult = await zalopayService.queryOrder(order.zalopayOrderId);
      if (queryResult.success && queryResult.data) {
        // Cập nhật payment status nếu có thay đổi
        if (queryResult.data.return_code === 1 && queryResult.data.status === 1) {
          if (order.paymentStatus !== "success") {
            order.paymentStatus = "success";
            await order.save();
          }
        }
      }
    }

    res.json({
      orderId: order._id,
      orderNumber: order.orderNumber,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status,
      total: order.total,
      zalopayTransToken: order.zalopayTransToken,
    });
  } catch (error) {
    console.error("Check ZaloPay payment status error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

module.exports = router;

