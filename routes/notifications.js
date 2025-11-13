const express = require("express");
const router = express.Router();
const Notification = require("../models/Notification");
const { verifyToken } = require("../middleware/authMiddleware");

// 🔔 Lấy danh sách thông báo
router.get("/", verifyToken, async (req, res) => {
  try {
    const { isRead, type, page = 1, limit = 20 } = req.query;
    const query = { user: req.user.userId };

    if (isRead !== undefined) {
      query.isRead = isRead === "true";
    }

    if (type) {
      query.type = type;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ user: req.user.userId, isRead: false });

    res.json({
      notifications,
      total,
      unreadCount,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 🔔 Đánh dấu đã đọc
router.put("/:id/read", verifyToken, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!notification) {
      return res.status(404).json({ message: "Không tìm thấy thông báo!" });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ message: "Đã đánh dấu đã đọc!", notification });
  } catch (error) {
    console.error("Mark notification read error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 🔔 Đánh dấu tất cả đã đọc
router.put("/read-all", verifyToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.userId, isRead: false },
      { isRead: true }
    );

    res.json({ message: "Đã đánh dấu tất cả đã đọc!" });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 🗑️ Xóa thông báo
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!notification) {
      return res.status(404).json({ message: "Không tìm thấy thông báo!" });
    }

    res.json({ message: "Xóa thông báo thành công!" });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

module.exports = router;

