const mongoose = require("mongoose");

const supportMessageSchema = new mongoose.Schema({
  sender: { 
    type: String, 
    enum: ["customer", "admin"], 
    required: true 
  }, // Người gửi
  senderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  }, // ID người gửi
  message: { 
    type: String, 
    required: true 
  }, // Nội dung tin nhắn
  attachments: [{ 
    type: String 
  }], // File đính kèm (URL)
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
});

const supportSchema = new mongoose.Schema({
  ticketNumber: { 
    type: String, 
    unique: true, 
    required: true 
  }, // Mã ticket tự động
  customer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  }, // Khách hàng
  order: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Order" 
  }, // Đơn hàng liên quan (nếu có)
  subject: { 
    type: String, 
    required: true 
  }, // Tiêu đề
  category: { 
    type: String, 
    enum: ["order", "product", "payment", "shipping", "refund", "other"], 
    default: "other" 
  }, // Loại yêu cầu
  priority: { 
    type: String, 
    enum: ["low", "medium", "high", "urgent"], 
    default: "medium" 
  }, // Mức độ ưu tiên
  status: { 
    type: String, 
    enum: ["open", "in_progress", "resolved", "closed"], 
    default: "open" 
  }, // Trạng thái
  assignedTo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }, // Admin được gán xử lý
  messages: [supportMessageSchema], // Danh sách tin nhắn
  resolvedAt: { 
    type: Date 
  }, // Thời gian giải quyết
  closedAt: { 
    type: Date 
  }, // Thời gian đóng
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
});

// Tự động tạo mã ticket trước khi lưu
supportSchema.pre("save", async function (next) {
  if (!this.ticketNumber) {
    const count = await mongoose.model("Support").countDocuments();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    this.ticketNumber = `TK${year}${month}${day}${String(count + 1).padStart(4, "0")}`;
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Support", supportSchema);

