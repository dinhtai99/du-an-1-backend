const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Voucher = require("../models/Voucher");
const Notification = require("../models/Notification");
const { verifyToken, requireAdmin, requireAdminOrStaff, requireCustomer } = require("../middleware/authMiddleware");

// 📦 Lấy danh sách đơn hàng (Admin/Staff: tất cả, Customer: chỉ của mình)
router.get("/", verifyToken, async (req, res) => {
  try {
    const { status, startDate, endDate, page = 1, limit = 10 } = req.query;
    const query = {};

    // Customer chỉ xem đơn hàng của mình
    if (req.user.role === "customer") {
      query.customer = req.user.userId;
    }

    // Lọc theo trạng thái
    if (status) {
      query.status = status;
    }

    // Lọc theo ngày
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const orders = await Order.find(query)
      .populate("customer", "fullName email phone")
      .populate("shipper", "fullName")
      .populate("items.product", "name image price")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      orders,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 📦 Lấy chi tiết đơn hàng
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customer", "fullName email phone")
      .populate("shipper", "fullName")
      .populate("items.product", "name image price category")
      .populate("voucher", "code name type value")
      .populate("timeline.updatedBy", "fullName role");

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng!" });
    }

    // Customer chỉ xem đơn hàng của mình
    if (req.user.role === "customer" && order.customer._id.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Không có quyền xem đơn hàng này!" });
    }

    res.json(order);
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 📋 Lấy timeline đơn hàng
router.get("/:id/timeline", verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("timeline.updatedBy", "fullName role")
      .select("timeline orderNumber status");

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng!" });
    }

    // Customer chỉ xem đơn hàng của mình
    if (req.user.role === "customer") {
      const orderFull = await Order.findById(req.params.id).select("customer");
      if (orderFull.customer.toString() !== req.user.userId) {
        return res.status(403).json({ message: "Không có quyền xem đơn hàng này!" });
      }
    }

    res.json({
      orderNumber: order.orderNumber,
      currentStatus: order.status,
      timeline: order.timeline || [],
    });
  } catch (error) {
    console.error("Get order timeline error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// ➕ Tạo đơn hàng từ giỏ hàng (chỉ customer)
router.post("/", verifyToken, requireCustomer, async (req, res) => {
  try {
    const { shippingAddress, paymentMethod, notes, voucherCode } = req.body;

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

    // Tính phí vận chuyển (có thể tính theo khoảng cách)
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

    // Xử lý paymentMethod: cash và COD đều là thanh toán tiền mặt
    let finalPaymentMethod = paymentMethod || "COD";
    if (finalPaymentMethod === "cash") {
      finalPaymentMethod = "COD"; // Chuyển cash thành COD để thống nhất
    }

    // Nếu là ZaloPay, redirect đến payment endpoint
    if (finalPaymentMethod === "zalopay") {
      return res.status(400).json({ 
        message: "Vui lòng sử dụng endpoint /api/payment/zalopay/create để thanh toán ZaloPay!",
        redirectTo: "/api/payment/zalopay/create"
      });
    }

    // Nếu là MoMo, redirect đến payment endpoint
    if (finalPaymentMethod === "momo") {
      return res.status(400).json({ 
        message: "Vui lòng sử dụng endpoint /api/payment/momo/create để thanh toán MoMo!",
        redirectTo: "/api/payment/momo/create"
      });
    }

    // Tạo đơn hàng
    // Với COD/cash: paymentStatus = "pending" (chờ thanh toán khi nhận hàng)
    // Với online payment: paymentStatus sẽ được cập nhật sau khi thanh toán thành công
    const order = new Order({
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
      paymentMethod: finalPaymentMethod,
      paymentStatus: (finalPaymentMethod === "COD" || finalPaymentMethod === "cash") ? "pending" : "pending",
      status: "new",
      notes: notes || "",
      timeline: [{
        status: "new",
        message: "Đơn hàng đã được tạo",
        updatedBy: req.user.userId,
      }],
    });

    await order.save();

    // Tăng số lần sử dụng voucher
    if (voucher) {
      voucher.usedCount += 1;
      await voucher.save();
    }

    // Xóa giỏ hàng
    cart.items = [];
    await cart.save();

    // Tạo thông báo
    await Notification.create({
      user: req.user.userId,
      type: "order",
      title: "Đặt hàng thành công",
      message: `Đơn hàng ${order.orderNumber} đã được tạo thành công!`,
      link: `/orders/${order._id}`,
    });

    await order.populate("items.product", "name image price");
    await order.populate("timeline.updatedBy", "fullName");

    res.status(201).json({
      message: "Đặt hàng thành công!",
      order,
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// ✏️ Cập nhật trạng thái đơn hàng (Admin/Staff)
router.put("/:id/status", verifyToken, requireAdminOrStaff, async (req, res) => {
  try {
    const { status, shipper, note } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng!" });
    }

    const oldStatus = order.status;
    const statusMessages = {
      new: "Đơn hàng đã được tạo",
      processing: "Đơn hàng đang được xử lý",
      shipping: "Đơn hàng đang được giao",
      completed: "Đơn hàng đã hoàn thành",
      cancelled: "Đơn hàng đã bị hủy",
    };

    order.status = status;

    // Gán shipper khi chuyển sang shipping
    if (status === "shipping" && shipper) {
      order.shipper = shipper;
    }

    // Trừ tồn kho khi chuyển sang processing
    if (status === "processing" && oldStatus === "new") {
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product.stock < item.quantity) {
          return res.status(400).json({ 
            message: `Sản phẩm ${product.name} không đủ tồn kho!` 
          });
        }
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity },
        });
      }
    }

    // Hoàn lại tồn kho nếu hủy đơn đã processing
    if (status === "cancelled" && (oldStatus === "processing" || oldStatus === "shipping")) {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
      }
      order.cancelledAt = new Date();
    }

    // Đánh dấu hoàn thành
    if (status === "completed") {
      order.completedAt = new Date();
    }

    // Thêm vào timeline
    if (!order.timeline) {
      order.timeline = [];
    }
    order.timeline.push({
      status,
      message: note || statusMessages[status] || `Đơn hàng chuyển sang trạng thái: ${status}`,
      updatedBy: req.user.userId,
    });

    await order.save();

    // Tạo thông báo cho customer
    await Notification.create({
      user: order.customer,
      type: "order",
      title: "Cập nhật đơn hàng",
      message: `Đơn hàng ${order.orderNumber} đã chuyển sang trạng thái: ${statusMessages[status] || status}`,
      link: `/orders/${order._id}`,
    });

    await order.populate("customer", "fullName email");
    await order.populate("shipper", "fullName");
    await order.populate("items.product", "name image price");
    await order.populate("timeline.updatedBy", "fullName");

    res.json({
      message: "Cập nhật trạng thái đơn hàng thành công!",
      order,
    });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// ❌ Hủy đơn hàng (chỉ customer)
router.put("/:id/cancel", verifyToken, requireCustomer, async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng!" });
    }

    // Customer chỉ hủy đơn hàng của mình
    if (order.customer.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Không có quyền hủy đơn hàng này!" });
    }

    // Chỉ hủy được đơn hàng mới hoặc đang xử lý
    if (order.status === "shipping" || order.status === "completed") {
      return res.status(400).json({ message: "Không thể hủy đơn hàng đang giao hoặc đã hoàn thành!" });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({ message: "Đơn hàng đã bị hủy!" });
    }

    const oldStatus = order.status;
    order.status = "cancelled";
    order.cancelledAt = new Date();
    order.cancelledReason = reason || "Khách hàng hủy";

    // Hoàn lại tồn kho nếu đã trừ
    if (oldStatus === "processing") {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
      }
    }

    // Thêm vào timeline
    if (!order.timeline) {
      order.timeline = [];
    }
    order.timeline.push({
      status: "cancelled",
      message: `Đơn hàng đã bị hủy. Lý do: ${reason || "Khách hàng hủy"}`,
      updatedBy: req.user.userId,
    });

    await order.save();

    await order.populate("timeline.updatedBy", "fullName");

    res.json({
      message: "Hủy đơn hàng thành công!",
      order,
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

module.exports = router;

