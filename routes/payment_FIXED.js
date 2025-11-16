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
    const { shippingAddress, notes, voucherCode, orderId, items } = req.body;

    console.log("=== ZALOPAY CREATE REQUEST ===");
    console.log("Has items in body:", !!items);
    console.log("Items count:", items ? items.length : 0);

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

      // ============================================
      // LẤY GIỎ HÀNG TỪ REQUEST BODY HOẶC DATABASE
      // ============================================
      let cartItems = [];
      let cart = null;

      if (items && items.length > 0) {
        // Nếu có items trong request body (từ mobile app)
        console.log("📦 Using items from request body:", items.length, "items");
        cartItems = items;
        
        // Populate product info cho từng item
        for (const item of cartItems) {
          const product = await Product.findById(item.product);
          if (!product) {
            return res.status(400).json({ message: `Sản phẩm ${item.product} không tồn tại!` });
          }
          // Gán product object để dùng sau
          item.product = product;
        }
      } else {
        // Nếu không có items trong request, lấy từ database (web app)
        console.log("📦 Loading cart from database");
        cart = await Cart.findOne({ user: req.user.userId }).populate("items.product");
        if (!cart || cart.items.length === 0) {
          return res.status(400).json({ message: "Giỏ hàng trống!" });
        }
        cartItems = cart.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          color: item.color || "",
          size: item.size || "",
          price: item.product.salePrice || item.product.price
        }));
      }

      // Kiểm tra tồn kho và tính toán
      let subtotal = 0;
      const orderItems = [];
      const productIds = [];

      for (const item of cartItems) {
        const product = item.product;
        const quantity = item.quantity;
        const price = item.price || (product.salePrice || product.price);
        
        if (product.status === 0) {
          return res.status(400).json({ message: `Sản phẩm ${product.name} đã bị ẩn!` });
        }

        if (product.stock < quantity) {
          return res.status(400).json({ 
            message: `Sản phẩm ${product.name} chỉ còn ${product.stock} sản phẩm trong kho!` 
          });
        }

        const itemSubtotal = price * quantity;

        orderItems.push({
          product: product._id,
          quantity: quantity,
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

// ... (giữ nguyên các route khác: callback, status)

module.exports = router;

