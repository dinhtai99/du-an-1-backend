const express = require("express");
const router = express.Router();
const Support = require("../models/Support");
const Order = require("../models/Order");
const Notification = require("../models/Notification");
const { verifyToken, requireAdmin, requireCustomer } = require("../middleware/authMiddleware");

// 📋 Lấy danh sách ticket (Customer: chỉ của mình, Admin: tất cả)
router.get("/", verifyToken, async (req, res) => {
  try {
    const { status, category, priority, page = 1, limit = 10 } = req.query;
    const query = {};

    // Customer chỉ xem ticket của mình
    if (req.user.role === "customer") {
      query.customer = req.user.userId;
    }

    // Lọc theo trạng thái
    if (status) {
      query.status = status;
    }

    // Lọc theo loại
    if (category) {
      query.category = category;
    }

    // Lọc theo mức độ ưu tiên
    if (priority) {
      query.priority = priority;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const tickets = await Support.find(query)
      .populate("customer", "fullName email phone")
      .populate("assignedTo", "fullName")
      .populate("order", "orderNumber")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Support.countDocuments(query);

    res.json({
      tickets,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Get support tickets error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 📋 Lấy chi tiết ticket
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const ticket = await Support.findById(req.params.id)
      .populate("customer", "fullName email phone")
      .populate("assignedTo", "fullName email")
      .populate("order", "orderNumber total status")
      .populate("messages.senderId", "fullName role");

    if (!ticket) {
      return res.status(404).json({ message: "Không tìm thấy ticket!" });
    }

    // Customer chỉ xem ticket của mình
    if (req.user.role === "customer" && ticket.customer._id.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Không có quyền xem ticket này!" });
    }

    res.json(ticket);
  } catch (error) {
    console.error("Get ticket error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// ➕ Tạo ticket mới (chỉ customer)
router.post("/", verifyToken, requireCustomer, async (req, res) => {
  try {
    const { subject, category, priority, order, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin!" });
    }

    // Kiểm tra order nếu có
    if (order) {
      const orderExists = await Order.findById(order);
      if (!orderExists || orderExists.customer.toString() !== req.user.userId) {
        return res.status(400).json({ message: "Đơn hàng không hợp lệ!" });
      }
    }

    const ticket = new Support({
      customer: req.user.userId,
      order: order || null,
      subject,
      category: category || "other",
      priority: priority || "medium",
      status: "open",
      messages: [{
        sender: "customer",
        senderId: req.user.userId,
        message,
      }],
    });

    await ticket.save();

    // Tạo thông báo cho admin
    await Notification.create({
      user: null, // null = thông báo cho tất cả admin
      type: "support",
      title: "Ticket mới",
      message: `Ticket ${ticket.ticketNumber}: ${subject}`,
      link: `/support/${ticket._id}`,
    });

    await ticket.populate("customer", "fullName email");
    await ticket.populate("order", "orderNumber");

    res.status(201).json({
      message: "Tạo ticket thành công!",
      ticket,
    });
  } catch (error) {
    console.error("Create ticket error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 💬 Gửi tin nhắn trong ticket
router.post("/:id/message", verifyToken, async (req, res) => {
  try {
    const { message, attachments } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Vui lòng nhập nội dung tin nhắn!" });
    }

    const ticket = await Support.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: "Không tìm thấy ticket!" });
    }

    // Customer chỉ gửi tin nhắn trong ticket của mình
    if (req.user.role === "customer" && ticket.customer.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Không có quyền gửi tin nhắn!" });
    }

    // Tự động cập nhật trạng thái
    if (ticket.status === "resolved" || ticket.status === "closed") {
      ticket.status = "open"; // Mở lại nếu đã đóng
    }

    ticket.messages.push({
      sender: req.user.role === "admin" ? "admin" : "customer",
      senderId: req.user.userId,
      message,
      attachments: attachments || [],
    });

    await ticket.save();

    // Tạo thông báo
    const notifyUser = req.user.role === "admin" ? ticket.customer : null; // Admin reply -> notify customer, Customer reply -> notify admin
    if (notifyUser) {
      await Notification.create({
        user: notifyUser,
        type: "support",
        title: "Phản hồi ticket",
        message: `Ticket ${ticket.ticketNumber} có phản hồi mới`,
        link: `/support/${ticket._id}`,
      });
    }

    await ticket.populate("messages.senderId", "fullName role");

    res.json({
      message: "Gửi tin nhắn thành công!",
      ticket,
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// ✏️ Cập nhật ticket (Admin)
router.put("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { status, priority, assignedTo, subject, category } = req.body;

    const ticket = await Support.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: "Không tìm thấy ticket!" });
    }

    if (status) ticket.status = status;
    if (priority) ticket.priority = priority;
    if (assignedTo) ticket.assignedTo = assignedTo;
    if (subject) ticket.subject = subject;
    if (category) ticket.category = category;

    // Đánh dấu thời gian
    if (status === "resolved") {
      ticket.resolvedAt = new Date();
    }
    if (status === "closed") {
      ticket.closedAt = new Date();
    }

    await ticket.save();

    // Tạo thông báo cho customer
    await Notification.create({
      user: ticket.customer,
      type: "support",
      title: "Cập nhật ticket",
      message: `Ticket ${ticket.ticketNumber} đã được cập nhật`,
      link: `/support/${ticket._id}`,
    });

    await ticket.populate("customer", "fullName email");
    await ticket.populate("assignedTo", "fullName");
    await ticket.populate("order", "orderNumber");

    res.json({
      message: "Cập nhật ticket thành công!",
      ticket,
    });
  } catch (error) {
    console.error("Update ticket error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// ❌ Đóng ticket (Customer hoặc Admin)
router.put("/:id/close", verifyToken, async (req, res) => {
  try {
    const ticket = await Support.findById(req.params.id);

    if (!ticket) {
      return res.status(404).json({ message: "Không tìm thấy ticket!" });
    }

    // Customer chỉ đóng ticket của mình
    if (req.user.role === "customer" && ticket.customer.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Không có quyền đóng ticket này!" });
    }

    ticket.status = "closed";
    ticket.closedAt = new Date();

    await ticket.save();

    res.json({
      message: "Đóng ticket thành công!",
      ticket,
    });
  } catch (error) {
    console.error("Close ticket error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

module.exports = router;

