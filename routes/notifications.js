// Import các thư viện và modules cần thiết
const express = require("express"); // Framework web server
const router = express.Router(); // Router để định nghĩa các routes
const Notification = require("../models/Notification"); // Model Notification từ database
const { verifyToken } = require("../middleware/authMiddleware"); // Middleware xác thực JWT token

/**
 * 🔔 Lấy danh sách thông báo
 * GET /api/notifications
 * Lấy danh sách thông báo của user đang đăng nhập
 * @middleware verifyToken - Phải đăng nhập
 * @query {Boolean} isRead - Lọc theo trạng thái đã đọc/chưa đọc (optional)
 * @query {String} type - Lọc theo loại thông báo (optional)
 * @query {Number} page - Trang hiện tại (optional, mặc định 1)
 * @query {Number} limit - Số lượng mỗi trang (optional, mặc định 20)
 * @returns {Object} { notifications, total, unreadCount, page, limit, totalPages }
 */
router.get("/", verifyToken, async (req, res) => {
  try {
    // Lấy các query parameters từ request
    const { isRead, type, page = 1, limit = 20 } = req.query;
    
    // Khởi tạo query object: chỉ lấy thông báo của user đang đăng nhập
    const query = { user: req.user.userId };

    // Lọc theo trạng thái đã đọc/chưa đọc
    if (isRead !== undefined) {
      query.isRead = isRead === "true"; // Chuyển string "true" thành boolean true
    }

    // Lọc theo loại thông báo (order, product, system, etc.)
    if (type) {
      query.type = type;
    }

    // Tính toán skip cho pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Tìm thông báo với các filter, sort, skip, limit
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 }) // Sắp xếp theo ngày tạo giảm dần (mới nhất trước)
      .skip(skip)
      .limit(parseInt(limit));

    // Đếm tổng số thông báo thỏa mãn query (không phân trang)
    const total = await Notification.countDocuments(query);
    
    // Đếm số thông báo chưa đọc của user
    const unreadCount = await Notification.countDocuments({ user: req.user.userId, isRead: false });

    // Trả về danh sách thông báo với pagination info và số thông báo chưa đọc
    res.json({
      notifications, // Danh sách thông báo
      total, // Tổng số thông báo thỏa mãn query
      unreadCount, // Số thông báo chưa đọc
      page: parseInt(page), // Trang hiện tại
      limit: parseInt(limit), // Số lượng mỗi trang
      totalPages: Math.ceil(total / parseInt(limit)), // Tổng số trang
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

/**
 * 🔔 Đánh dấu đã đọc
 * PUT /api/notifications/:id/read
 * Đánh dấu một thông báo là đã đọc
 * @middleware verifyToken - Phải đăng nhập
 * @param {String} id - ID của thông báo
 * @returns {Object} { message, notification }
 */
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

/**
 * 🔔 Đánh dấu tất cả đã đọc
 * PUT /api/notifications/read-all
 * Đánh dấu tất cả thông báo của user là đã đọc
 * @middleware verifyToken - Phải đăng nhập
 * @returns {Object} { message }
 */
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

/**
 * 🗑️ Xóa thông báo
 * DELETE /api/notifications/:id
 * Xóa một thông báo (chỉ thông báo của chính mình)
 * @middleware verifyToken - Phải đăng nhập
 * @param {String} id - ID của thông báo
 * @returns {Object} { message }
 */
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

