// Import thư viện mongoose để tạo schema và model
const mongoose = require("mongoose");

/**
 * SupportMessage Schema - Định nghĩa cấu trúc dữ liệu cho từng tin nhắn trong support ticket
 * Mỗi support ticket có thể có nhiều messages
 */
const supportMessageSchema = new mongoose.Schema({
  // Người gửi - Bắt buộc
  // "customer" = Khách hàng, "admin" = Admin
  sender: { 
    type: String, 
    enum: ["customer", "admin"], 
    required: true 
  },
  
  // ID người gửi - Reference đến User model, bắt buộc
  senderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  
  // Nội dung tin nhắn - Bắt buộc
  message: { 
    type: String, 
    required: true 
  },
  
  // File đính kèm - Mảng các URL, optional
  // User có thể upload file kèm theo tin nhắn
  attachments: [{ 
    type: String 
  }],
  
  // Thời gian tạo - Tự động set khi tạo message mới
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
});

/**
 * Support Schema - Định nghĩa cấu trúc dữ liệu cho Support trong MongoDB
 * Schema này định nghĩa các trường dữ liệu và validation rules cho Support (Hỗ trợ khách hàng)
 */
const supportSchema = new mongoose.Schema({
  // Mã ticket tự động - Unique, bắt buộc
  // Format: TKYYYYMMDDXXXX (ví dụ: TK202511280001)
  ticketNumber: { 
    type: String, 
    unique: true, 
    required: true 
  },
  
  // Khách hàng - Reference đến User model, bắt buộc
  customer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  
  // Đơn hàng liên quan - Reference đến Order model, optional
  // Nếu yêu cầu hỗ trợ liên quan đến một đơn hàng cụ thể
  order: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Order" 
  },
  
  // Tiêu đề - Bắt buộc
  subject: { 
    type: String, 
    required: true 
  },
  
  // Loại yêu cầu - Mặc định "other"
  // "order" = Về đơn hàng, "product" = Về sản phẩm
  // "payment" = Về thanh toán, "shipping" = Về vận chuyển
  // "refund" = Về hoàn tiền, "other" = Khác
  category: { 
    type: String, 
    enum: ["order", "product", "payment", "shipping", "refund", "other"], 
    default: "other" 
  },
  
  // Mức độ ưu tiên - Mặc định "medium"
  // "low" = Thấp, "medium" = Trung bình
  // "high" = Cao, "urgent" = Khẩn cấp
  priority: { 
    type: String, 
    enum: ["low", "medium", "high", "urgent"], 
    default: "medium" 
  },
  
  // Trạng thái - Mặc định "open"
  // "open" = Mới mở, "in_progress" = Đang xử lý
  // "resolved" = Đã giải quyết, "closed" = Đã đóng
  status: { 
    type: String, 
    enum: ["open", "in_progress", "resolved", "closed"], 
    default: "open" 
  },
  
  // Admin được gán xử lý - Reference đến User model, optional
  assignedTo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  
  // Danh sách tin nhắn - Mảng các supportMessageSchema
  messages: [supportMessageSchema],
  
  // Thời gian giải quyết - Optional
  resolvedAt: { 
    type: Date 
  },
  
  // Thời gian đóng - Optional
  closedAt: { 
    type: Date 
  },
  
  // Thời gian tạo - Tự động set khi tạo support ticket mới
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  
  // Thời gian cập nhật - Tự động cập nhật mỗi khi save
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
});

/**
 * Pre-save hook - Tự động tạo mã ticket trước khi lưu
 * Hook này chạy trước khi save support ticket vào database
 * Nếu ticketNumber chưa có, sẽ tự động tạo theo format: TKYYYYMMDDXXXX
 */
supportSchema.pre("save", async function (next) {
  // Chỉ tạo ticketNumber nếu chưa có
  if (!this.ticketNumber) {
    // Đếm số lượng support ticket hiện có trong database
    const count = await mongoose.model("Support").countDocuments();
    
    // Lấy ngày hiện tại
    const date = new Date();
    const year = date.getFullYear(); // Năm (ví dụ: 2025)
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Tháng (01-12)
    const day = String(date.getDate()).padStart(2, "0"); // Ngày (01-31)
    
    // Tạo ticketNumber: TK + YYYY + MM + DD + XXXX (số thứ tự, 4 chữ số)
    // Ví dụ: TK202511280001 (ticket đầu tiên ngày 28/11/2025)
    this.ticketNumber = `TK${year}${month}${day}${String(count + 1).padStart(4, "0")}`;
  }
  
  // Cập nhật updatedAt mỗi khi save
  this.updatedAt = Date.now();
  
  // Chuyển sang bước tiếp theo (lưu vào database)
  next();
});

// Export Support model để sử dụng trong các file khác
// mongoose.model("Support", supportSchema) - Tạo model từ schema
module.exports = mongoose.model("Support", supportSchema);

