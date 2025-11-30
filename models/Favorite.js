// Import thư viện mongoose để tạo schema và model
const mongoose = require("mongoose");

/**
 * Favorite Schema - Định nghĩa cấu trúc dữ liệu cho Favorite trong MongoDB
 * Schema này định nghĩa các trường dữ liệu và validation rules cho Favorite (Sản phẩm yêu thích)
 */
const favoriteSchema = new mongoose.Schema({
  // User - Reference đến User model, bắt buộc
  // User đã thích sản phẩm này
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  
  // Product - Reference đến Product model, bắt buộc
  // Sản phẩm được thích
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  
  // Thời gian tạo - Tự động set khi thêm vào yêu thích
  createdAt: { type: Date, default: Date.now },
});

/**
 * Index - Đảm bảo một user chỉ thích một sản phẩm một lần
 * Tạo unique index trên (user, product) để tránh duplicate favorites
 */
favoriteSchema.index({ user: 1, product: 1 }, { unique: true });

// Export Favorite model để sử dụng trong các file khác
// mongoose.model("Favorite", favoriteSchema) - Tạo model từ schema
module.exports = mongoose.model("Favorite", favoriteSchema);

