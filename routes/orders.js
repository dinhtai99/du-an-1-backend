const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Notification = require("../models/Notification");
const { verifyToken, requireAdmin, requireAdminOrStaff } = require("../middleware/authMiddleware");

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
      .populate("items.product", "name image price category");

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

// ➕ Tạo đơn hàng từ giỏ hàng
router.post("/", verifyToken, async (req, res) => {
  try {
    const { shippingAddress, paymentMethod, notes } = req.body;

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
    }

    // Tính phí vận chuyển (có thể tính theo khoảng cách)
    const shippingFee = 30000; // Mặc định 30k

    // Tạo đơn hàng
    const order = new Order({
      customer: req.user.userId,
      shippingAddress,
      items: orderItems,
      subtotal,
      shippingFee,
      discount: 0,
      total: subtotal + shippingFee,
      paymentMethod: paymentMethod || "COD",
      status: "new",
      notes: notes || "",
    });

    await order.save();

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
    const { status, shipper } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng!" });
    }

    const oldStatus = order.status;
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

    await order.save();

    // Tạo thông báo cho customer
    await Notification.create({
      user: order.customer,
      type: "order",
      title: "Cập nhật đơn hàng",
      message: `Đơn hàng ${order.orderNumber} đã chuyển sang trạng thái: ${status}`,
      link: `/orders/${order._id}`,
    });

    await order.populate("customer", "fullName email");
    await order.populate("shipper", "fullName");
    await order.populate("items.product", "name image price");

    res.json({
      message: "Cập nhật trạng thái đơn hàng thành công!",
      order,
    });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// ❌ Hủy đơn hàng (Customer)
router.put("/:id/cancel", verifyToken, async (req, res) => {
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

    order.status = "cancelled";
    order.cancelledAt = new Date();
    order.cancelledReason = reason || "Khách hàng hủy";

    // Hoàn lại tồn kho nếu đã trừ
    if (order.status === "processing") {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
      }
    }

    await order.save();

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

