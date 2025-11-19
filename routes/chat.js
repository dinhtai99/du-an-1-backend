const express = require("express");
const router = express.Router();
const Chat = require("../models/Chat");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");

/**
 * POST /api/chat/messages
 * Gửi tin nhắn (Customer gửi cho Admin, Admin gửi cho Customer)
 */
router.post("/messages", verifyToken, async (req, res) => {
  try {
    console.log("📨 POST /api/chat/messages - Request received");
    console.log("Request body:", req.body);
    console.log("User:", { userId: req.user.userId, role: req.user.role });
    
    const { message, customerId } = req.body;

    // Validate message
    if (!message || typeof message !== 'string' || !message.trim()) {
      console.log("❌ Error: Message is empty or invalid");
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập nội dung tin nhắn!",
        error: "MESSAGE_REQUIRED"
      });
    }

    // Validate message length (max 5000 characters)
    if (message.trim().length > 5000) {
      console.log("❌ Error: Message too long");
      return res.status(400).json({
        success: false,
        message: "Tin nhắn không được vượt quá 5000 ký tự!",
        error: "MESSAGE_TOO_LONG"
      });
    }

    let chat;

    if (req.user.role === "admin") {
      // Admin gửi tin nhắn cho customer
      if (!customerId || typeof customerId !== 'string') {
        console.log("❌ Error: customerId is missing or invalid");
        return res.status(400).json({
          success: false,
          message: "Vui lòng chọn khách hàng!",
          error: "CUSTOMER_ID_REQUIRED"
        });
      }

      // Validate customer exists
      const customerExists = await User.findById(customerId);
      if (!customerExists) {
        console.log("❌ Error: Customer not found");
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy khách hàng!",
          error: "CUSTOMER_NOT_FOUND"
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

      const adminChat = await Chat.findById(chat._id).populate("customer", "fullName email");
      const lastMessage = adminChat.messages[adminChat.messages.length - 1];
      
      res.json({
        success: true,
        message: "Gửi tin nhắn thành công!",
        data: {
          messageId: lastMessage._id,
          chatId: adminChat._id,
          senderId: req.user.userId,
          senderRole: "admin",
          message: lastMessage.message,
          createdAt: lastMessage.createdAt,
          isRead: lastMessage.isRead,
          customerId: customerId
        },
        chat: adminChat
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
      try {
        const admins = await User.find({ role: "admin" }).select("_id");
        const notificationPromises = admins.map(admin => 
          Notification.create({
            user: admin._id,
            type: "chat",
            title: "Tin nhắn mới từ khách hàng",
            message: `${req.user.fullName || req.user.email}: ${message.trim().substring(0, 50)}`,
            link: `/admin?section=chat&customerId=${req.user.userId}`,
          })
        );
        await Promise.all(notificationPromises);
        console.log(`✅ Created notifications for ${admins.length} admin(s)`);
      } catch (notifError) {
        console.error("⚠️ Error creating notifications:", notifError);
        // Không throw error, vì tin nhắn đã được lưu thành công
      }

      const populatedChat = await Chat.findById(chat._id).populate("customer", "fullName email");
      console.log("✅ Message sent successfully");
      
      // Format response cho Android
      const lastMessage = populatedChat.messages[populatedChat.messages.length - 1];
      res.json({
        success: true,
        message: "Gửi tin nhắn thành công!",
        data: {
          messageId: lastMessage._id,
          chatId: populatedChat._id,
          senderId: req.user.userId,
          senderRole: "customer",
          message: lastMessage.message,
          createdAt: lastMessage.createdAt,
          isRead: lastMessage.isRead
        },
        chat: populatedChat
      });
    }
  } catch (error) {
    console.error("❌ Send chat message error:", error);
    console.error("Error stack:", error.stack);
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
    console.log("📥 GET /api/chat/messages - Request received");
    console.log("Query params:", req.query);
    console.log("User:", { userId: req.user.userId, role: req.user.role });
    
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
          messages: sortedMessages.map(msg => ({
            _id: msg._id,
            senderId: msg.senderId?._id || msg.senderId,
            senderRole: msg.senderRole,
            senderName: msg.senderId?.fullName || (msg.senderRole === 'admin' ? 'Admin' : 'Khách hàng'),
            message: msg.message,
            isRead: msg.isRead,
            createdAt: msg.createdAt
          })),
          customer: chat.customer ? {
            _id: chat.customer._id,
            fullName: chat.customer.fullName,
            email: chat.customer.email,
            phone: chat.customer.phone
          } : null,
          unreadCount: chat.adminUnreadCount,
          chatId: chat._id
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
        messages: sortedMessages.map(msg => ({
          _id: msg._id,
          senderId: msg.senderId?._id || msg.senderId,
          senderRole: msg.senderRole,
          senderName: msg.senderId?.fullName || (msg.senderRole === 'admin' ? 'Admin' : 'Khách hàng'),
          message: msg.message,
          isRead: msg.isRead,
          createdAt: msg.createdAt
        })),
        unreadCount: chat.customerUnreadCount,
        chatId: chat._id
      });
    }
  } catch (error) {
    console.error("❌ Get chat messages error:", error);
    console.error("Error stack:", error.stack);
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
    console.log("📊 GET /api/chat/unread-count - Request received");
    console.log("User:", { userId: req.user.userId, role: req.user.role });
    
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
    console.error("❌ Get unread count error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Lỗi server!",
      error: error.message
    });
  }
});

/**
 * GET /api/chat/info
 * Lấy thông tin chat của user hiện tại (cho Android)
 */
router.get("/info", verifyToken, async (req, res) => {
  try {
    console.log("📋 GET /api/chat/info - Request received");
    console.log("User:", { userId: req.user.userId, role: req.user.role });
    
    if (req.user.role === "customer") {
      const chat = await Chat.findOne({ customer: req.user.userId });
      
      if (!chat) {
        return res.json({
          success: true,
          hasChat: false,
          unreadCount: 0,
          lastMessageAt: null
        });
      }
      
      res.json({
        success: true,
        hasChat: true,
        chatId: chat._id,
        unreadCount: chat.customerUnreadCount || 0,
        lastMessage: chat.lastMessage || "",
        lastMessageAt: chat.lastMessageAt,
        messageCount: chat.messages.length
      });
    } else {
      // Admin: trả về tổng số chat chưa đọc
      const totalUnread = await Chat.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, total: { $sum: "$adminUnreadCount" } } },
      ]);
      
      const totalChats = await Chat.countDocuments({ isActive: true });
      
      res.json({
        success: true,
        hasChat: true,
        unreadCount: totalUnread[0]?.total || 0,
        totalChats: totalChats
      });
    }
  } catch (error) {
    console.error("❌ Get chat info error:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Lỗi server!",
      error: error.message
    });
  }
});

module.exports = router;

