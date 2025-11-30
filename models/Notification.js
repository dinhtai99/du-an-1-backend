// Import thư viện mongoose để tạo schema và model
const mongoose = require("mongoose");

/**
 * Notification Schema - Định nghĩa cấu trúc dữ liệu cho Notification trong MongoDB
 * Schema này định nghĩa các trường dữ liệu và validation rules cho Notification (Thông báo)
 */
const notificationSchema = new mongoose.Schema({
  // User - Reference đến User model, bắt buộc
  // User nhận thông báo này
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  
  // Loại thông báo - Bắt buộc
  // "order" = Thông báo về đơn hàng
  // "promotion" = Thông báo khuyến mãi
  // "support" = Thông báo hỗ trợ
  // "system" = Thông báo hệ thống
  // "chat" = Thông báo chat
  type: { 
    type: String, 
    enum: ["order", "promotion", "support", "system", "chat"], 
    required: true 
  },
  
  // Tiêu đề thông báo - Bắt buộc
  title: { type: String, required: true },
  
  // Nội dung thông báo - Bắt buộc
  message: { type: String, required: true },
  
  // Link đến trang liên quan - Optional
  // URL để redirect user khi click vào thông báo
  link: { type: String },
  
  // Đã đọc chưa - Mặc định false
  // isRead = true: User đã đọc thông báo này
  isRead: { type: Boolean, default: false },
  
  // Thời gian tạo - Tự động set khi tạo notification mới
  createdAt: { type: Date, default: Date.now },
});

// Export Notification model để sử dụng trong các file khác
// mongoose.model("Notification", notificationSchema) - Tạo model từ schema
module.exports = mongoose.model("Notification", notificationSchema);

