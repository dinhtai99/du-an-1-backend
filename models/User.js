// Import thư viện mongoose để tạo schema và model
const mongoose = require("mongoose");

/**
 * User Schema - Định nghĩa cấu trúc dữ liệu cho User trong MongoDB
 * Schema này định nghĩa các trường dữ liệu và validation rules cho User
 */
const userSchema = new mongoose.Schema({
  // Tên đăng nhập - Bắt buộc, phải unique (duy nhất)
  username: { type: String, required: true, unique: true },
  
  // Mật khẩu - Bắt buộc, sẽ được hash bằng bcrypt trước khi lưu
  password: { type: String, required: true },
  
  // Email - Unique (duy nhất), sparse: true cho phép null/undefined
  email: { type: String, unique: true, sparse: true },
  
  // Họ tên - Bắt buộc
  fullName: { type: String, required: true },
  
  // Giới tính - Chỉ cho phép: "male", "female", "other", mặc định "male"
  gender: { type: String, enum: ["male", "female", "other"], default: "male" },
  
  // Ngày sinh - Optional
  dateOfBirth: { type: Date },
  
  // Số điện thoại - Optional
  phone: { type: String },
  
  // Địa chỉ - Optional, mặc định là chuỗi rỗng
  address: { type: String, default: "" },
  
  // Vai trò - Chỉ cho phép: "admin", "staff", "customer", mặc định "customer"
  role: { type: String, enum: ["admin", "staff", "customer"], default: "customer" },
  
  // Avatar - URL ảnh đại diện, mặc định là chuỗi rỗng
  avatar: { type: String, default: "" },
  
  // Tài khoản bị khóa tạm thời - Mặc định false
  // isLocked = true khi đăng nhập sai quá 5 lần
  isLocked: { type: Boolean, default: false },
  
  // Tài khoản bị khóa vĩnh viễn bởi admin - Mặc định false
  // isBanned = true khi admin khóa tài khoản
  isBanned: { type: Boolean, default: false },
  
  // Số lần đăng nhập sai - Mặc định 0
  // Tăng lên mỗi lần đăng nhập sai, reset về 0 khi đăng nhập thành công
  loginAttempts: { type: Number, default: 0 },
  
  // Thời gian khóa tài khoản đến khi nào - Optional
  // Được set khi loginAttempts >= 5, thường là 30 phút sau
  lockUntil: { type: Date },
  
  // Token để reset mật khẩu - Optional
  // Được tạo khi user yêu cầu quên mật khẩu
  resetPasswordToken: { type: String },
  
  // Thời hạn token reset mật khẩu - Optional
  // Token hết hạn sau 1 giờ (từ khi tạo)
  resetPasswordExpires: { type: Date },
  
  // Thời gian tạo - Tự động set khi tạo user mới
  createdAt: { type: Date, default: Date.now },
  
  // Thời gian cập nhật - Tự động cập nhật mỗi khi save
  updatedAt: { type: Date, default: Date.now },
});

// Export User model để sử dụng trong các file khác
// mongoose.model("User", userSchema) - Tạo model từ schema
module.exports = mongoose.model("User", userSchema);
