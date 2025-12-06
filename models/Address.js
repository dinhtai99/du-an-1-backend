// Import thư viện mongoose để tạo schema và model
const mongoose = require("mongoose");

/**
 * Address Schema - Định nghĩa cấu trúc dữ liệu cho Address trong MongoDB
 * Schema này định nghĩa các trường dữ liệu và validation rules cho Address (Địa chỉ giao hàng)
 * Mỗi user có thể có nhiều địa chỉ
 */
const addressSchema = new mongoose.Schema({
  // User - Reference đến User model, bắt buộc
  // Mỗi địa chỉ thuộc về một user
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  
  // Họ tên người nhận - Bắt buộc
  fullName: { type: String, required: true },
  
  // Số điện thoại - Bắt buộc
  phone: { type: String, required: true },
  
  // Địa chỉ chi tiết - Bắt buộc
  // Ví dụ: "123 Đường ABC"
  address: { type: String, required: true },
  
  // Phường/Xã - Optional
  ward: { type: String },
  
  // Quận/Huyện - Optional
  district: { type: String },
  
  // Tỉnh/Thành phố - Optional (có thể để trống nếu chưa có thông tin)
  city: { type: String, default: "" },
  
  // Địa chỉ mặc định - Mặc định false
  // isDefault = true: Địa chỉ này sẽ được chọn mặc định khi checkout
  isDefault: { type: Boolean, default: false },
  
  // Thời gian tạo - Tự động set khi tạo address mới
  createdAt: { type: Date, default: Date.now },
  
  // Thời gian cập nhật - Tự động cập nhật mỗi khi save
  updatedAt: { type: Date, default: Date.now },
});

// Export Address model để sử dụng trong các file khác
// mongoose.model("Address", addressSchema) - Tạo model từ schema
module.exports = mongoose.model("Address", addressSchema);

