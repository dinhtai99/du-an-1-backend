// Import thư viện mongoose để tạo schema và model
const mongoose = require("mongoose");

/**
 * ChatMessage Schema - Định nghĩa cấu trúc dữ liệu cho từng tin nhắn trong chat
 * Mỗi chat có thể có nhiều messages
 */
const chatMessageSchema = new mongoose.Schema({
  // ID người gửi - Reference đến User model, bắt buộc
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  
  // Vai trò người gửi - Bắt buộc
  // "customer" = Khách hàng, "admin" = Admin
  senderRole: {
    type: String,
    enum: ["customer", "admin"],
    required: true
  },
  
  // Nội dung tin nhắn - Bắt buộc
  message: {
    type: String,
    required: true
  },
  
  // Đã đọc chưa - Mặc định false
  // isRead = true: Người nhận đã đọc tin nhắn này
  isRead: {
    type: Boolean,
    default: false
  },
  
  // Thời gian tạo - Tự động set khi tạo message mới
  createdAt: {
    type: Date,
    default: Date.now
  }
});

/**
 * Chat Schema - Định nghĩa cấu trúc dữ liệu cho Chat trong MongoDB
 * Schema này định nghĩa các trường dữ liệu và validation rules cho Chat (Chat real-time)
 */
const chatSchema = new mongoose.Schema({
  // Khách hàng - Reference đến User model, bắt buộc, có index để tìm nhanh
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  
  // Tin nhắn cuối cùng - Mặc định chuỗi rỗng
  // Lưu 100 ký tự đầu của tin nhắn cuối để hiển thị preview
  lastMessage: {
    type: String,
    default: ""
  },
  
  // Thời gian tin nhắn cuối - Mặc định Date.now
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  
  // Tổng số tin nhắn chưa đọc - Mặc định 0
  unreadCount: {
    type: Number,
    default: 0
  },
  
  // Số tin nhắn chưa đọc của customer - Mặc định 0
  customerUnreadCount: {
    type: Number,
    default: 0
  },
  
  // Số tin nhắn chưa đọc của admin - Mặc định 0
  adminUnreadCount: {
    type: Number,
    default: 0
  },
  
  // Chat còn hoạt động không - Mặc định true
  // isActive = false: Chat đã bị đóng
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Danh sách tin nhắn - Mảng các chatMessageSchema
  messages: [chatMessageSchema],
  
  // Thời gian tạo - Tự động set khi tạo chat mới
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // Thời gian cập nhật - Tự động cập nhật mỗi khi save
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

/**
 * Pre-save hook - Tự động cập nhật updatedAt và lastMessage
 * Hook này chạy trước khi save chat vào database
 */
chatSchema.pre("save", function (next) {
  // Cập nhật updatedAt mỗi khi save
  this.updatedAt = Date.now();
  
  // Nếu có messages, cập nhật lastMessage và lastMessageAt
  if (this.messages && this.messages.length > 0) {
    const lastMsg = this.messages[this.messages.length - 1];
    // Lấy 100 ký tự đầu của tin nhắn cuối để preview
    this.lastMessage = lastMsg.message.substring(0, 100);
    // Lấy thời gian của tin nhắn cuối
    this.lastMessageAt = lastMsg.createdAt || Date.now();
  }
  
  // Chuyển sang bước tiếp theo (lưu vào database)
  next();
});

// Export Chat model để sử dụng trong các file khác
// mongoose.model("Chat", chatSchema) - Tạo model từ schema
module.exports = mongoose.model("Chat", chatSchema);

