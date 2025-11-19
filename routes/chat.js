const express = require("express");
const router = express.Router();
const Chat = require("../models/Chat");
const Notification = require("../models/Notification");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");

/**
 * POST /api/chat/messages
 * Gửi tin nhắn (Customer gửi cho Admin, Admin gửi cho Customer)
 */
router.post("/messages", verifyToken, async (req, res) => {
  try {
    const { message, customerId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập nội dung tin nhắn!",
      });
    }

    let chat;

    if (req.user.role === "admin") {
      // Admin gửi tin nhắn cho customer
      if (!customerId) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng chọn khách hàng!",
        });
      }

      // Tìm hoặc tạo chat với customer này
      chat = await Chat.findOne({ customer: customerId });
      if (!chat) {
        chat = new Chat({
          customer: customerId,
          messages: [],
        });
      }

      // Thêm tin nhắn từ admin
      chat.messages.push({
        senderId: req.user.userId,
        senderRole: "admin",
        message: message.trim(),
        isRead: false,
      });

      // Tăng unread count cho customer
      chat.customerUnreadCount = (chat.customerUnreadCount || 0) + 1;
      chat.adminUnreadCount = 0; // Admin đã đọc (vì admin vừa gửi)

      await chat.save();

      // Tạo thông báo cho customer
      await Notification.create({
        user: customerId,
        type: "chat",
        title: "Tin nhắn mới từ admin",
        message: message.trim().substring(0, 50),
        link: `/chat`,
      });

      res.json({
        success: true,
        message: "Gửi tin nhắn thành công!",
        chat: await Chat.findById(chat._id).populate("customer", "fullName email"),
      });
    } else {
      // Customer gửi tin nhắn cho admin
      // Tìm hoặc tạo chat của customer này
      chat = await Chat.findOne({ customer: req.user.userId });
      if (!chat) {
        chat = new Chat({
          customer: req.user.userId,
          messages: [],
        });
      }

      // Thêm tin nhắn từ customer
      chat.messages.push({
        senderId: req.user.userId,
        senderRole: "customer",
        message: message.trim(),
        isRead: false,
      });

      // Tăng unread count cho admin
      chat.adminUnreadCount = (chat.adminUnreadCount || 0) + 1;
      chat.customerUnreadCount = 0; // Customer đã đọc (vì customer vừa gửi)

      await chat.save();

      // Tạo thông báo cho tất cả admin
      await Notification.create({
        user: null, // null = thông báo cho tất cả admin
        type: "chat",
        title: "Tin nhắn mới từ khách hàng",
        message: `${req.user.fullName || req.user.email}: ${message.trim().substring(0, 50)}`,
        link: `/admin?section=chat&customerId=${req.user.userId}`,
      });

      res.json({
        success: true,
        message: "Gửi tin nhắn thành công!",
        chat: await Chat.findById(chat._id).populate("customer", "fullName email"),
      });
    }
  } catch (error) {
    console.error("Send chat message error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server!",
      error: error.message,
    });
  }
});

/**
 * GET /api/chat/messages
 * Lấy danh sách tin nhắn
 * Customer: lấy tin nhắn của mình
 * Admin: có thể lấy tin nhắn của một customer cụ thể hoặc tất cả
 */
router.get("/messages", verifyToken, async (req, res) => {
  try {
    const { customerId, page = 1, limit = 50 } = req.query;

    if (req.user.role === "admin") {
      // Admin có thể xem chat của một customer cụ thể hoặc tất cả
      if (customerId) {
        const chat = await Chat.findOne({ customer: customerId })
          .populate("customer", "fullName email phone")
          .populate("messages.senderId", "fullName email role")
          .sort({ "messages.createdAt": -1 });

        if (!chat) {
          return res.json({
            success: true,
            messages: [],
            customer: null,
          });
        }

        // Đánh dấu tất cả tin nhắn từ customer là đã đọc
        chat.messages.forEach((msg) => {
          if (msg.senderRole === "customer") {
            msg.isRead = true;
          }
        });
        chat.adminUnreadCount = 0;
        await chat.save();

        // Sắp xếp messages theo thời gian tăng dần
        const sortedMessages = [...chat.messages].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );

        res.json({
          success: true,
          messages: sortedMessages,
          customer: chat.customer,
          unreadCount: chat.adminUnreadCount,
        });
      } else {
        // Lấy danh sách tất cả chat (cho admin)
        const chats = await Chat.find({ isActive: true })
          .populate("customer", "fullName email phone")
          .sort({ lastMessageAt: -1 })
          .limit(parseInt(limit))
          .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await Chat.countDocuments({ isActive: true });

        res.json({
          success: true,
          chats: chats.map((chat) => ({
            _id: chat._id,
            customer: chat.customer,
            lastMessage: chat.lastMessage,
            lastMessageAt: chat.lastMessageAt,
            adminUnreadCount: chat.adminUnreadCount || 0,
            customerUnreadCount: chat.customerUnreadCount || 0,
            messageCount: chat.messages.length,
          })),
          total,
          page: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
        });
      }
    } else {
      // Customer chỉ xem tin nhắn của mình
      const chat = await Chat.findOne({ customer: req.user.userId })
        .populate("messages.senderId", "fullName email role")
        .sort({ "messages.createdAt": -1 });

      if (!chat) {
        return res.json({
          success: true,
          messages: [],
          unreadCount: 0,
        });
      }

      // Đánh dấu tất cả tin nhắn từ admin là đã đọc
      chat.messages.forEach((msg) => {
        if (msg.senderRole === "admin") {
          msg.isRead = true;
        }
      });
      chat.customerUnreadCount = 0;
      await chat.save();

      // Sắp xếp messages theo thời gian tăng dần
      const sortedMessages = [...chat.messages].sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );

      res.json({
        success: true,
        messages: sortedMessages,
        unreadCount: chat.customerUnreadCount,
      });
    }
  } catch (error) {
    console.error("Get chat messages error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server!",
      error: error.message,
    });
  }
});

/**
 * GET /api/chat/unread-count
 * Lấy số tin nhắn chưa đọc
 */
router.get("/unread-count", verifyToken, async (req, res) => {
  try {
    if (req.user.role === "admin") {
      // Tổng số tin nhắn chưa đọc từ tất cả customer
      const totalUnread = await Chat.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, total: { $sum: "$adminUnreadCount" } } },
      ]);

      res.json({
        success: true,
        unreadCount: totalUnread[0]?.total || 0,
      });
    } else {
      // Số tin nhắn chưa đọc của customer
      const chat = await Chat.findOne({ customer: req.user.userId });
      res.json({
        success: true,
        unreadCount: chat?.customerUnreadCount || 0,
      });
    }
  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server!",
    });
  }
});

module.exports = router;

