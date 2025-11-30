// Import thư viện mongoose để tạo schema và model
const mongoose = require("mongoose");

/**
 * CartItem Schema - Định nghĩa cấu trúc dữ liệu cho từng item trong giỏ hàng
 * Mỗi giỏ hàng có thể có nhiều items (sản phẩm)
 */
const cartItemSchema = new mongoose.Schema({
  // Sản phẩm - Reference đến Product model, bắt buộc
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  
  // Số lượng - Bắt buộc, tối thiểu 1
  quantity: { type: Number, required: true, min: 1 },
  
  // Màu sắc đã chọn - Optional
  color: { type: String },
  
  // Kích thước đã chọn - Optional
  size: { type: String },
  
  // Giá tại thời điểm thêm vào giỏ - Bắt buộc
  // Lưu giá để tránh thay đổi giá sau này khi user checkout
  price: { type: Number, required: true },
});

/**
 * Cart Schema - Định nghĩa cấu trúc dữ liệu cho Cart trong MongoDB
 * Mỗi user chỉ có 1 giỏ hàng (unique: true)
 */
const cartSchema = new mongoose.Schema({
  // User - Reference đến User model, bắt buộc, unique (mỗi user chỉ có 1 cart)
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  
  // Danh sách sản phẩm trong giỏ hàng - Mảng các cartItemSchema
  items: [cartItemSchema],
  
  // Thời gian tạo - Tự động set khi tạo cart mới
  createdAt: { type: Date, default: Date.now },
  
  // Thời gian cập nhật - Tự động cập nhật mỗi khi save
  updatedAt: { type: Date, default: Date.now },
});

// Export Cart model để sử dụng trong các file khác
// mongoose.model("Cart", cartSchema) - Tạo model từ schema
module.exports = mongoose.model("Cart", cartSchema);

