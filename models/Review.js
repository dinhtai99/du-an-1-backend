// Import thư viện mongoose để tạo schema và model
const mongoose = require("mongoose");

/**
 * Review Schema - Định nghĩa cấu trúc dữ liệu cho Review trong MongoDB
 * Schema này định nghĩa các trường dữ liệu và validation rules cho Review (Đánh giá sản phẩm)
 */
const reviewSchema = new mongoose.Schema({
  // User - Reference đến User model, bắt buộc
  // User đã đánh giá sản phẩm này
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  
  // Product - Reference đến Product model, bắt buộc
  // Sản phẩm được đánh giá
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  
  // Order - Reference đến Order model, optional
  // Đơn hàng mà user đã mua sản phẩm này (để xác minh đã mua)
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
  
  // Đánh giá (sao) - Bắt buộc, từ 1 đến 5 sao
  rating: { type: Number, required: true, min: 1, max: 5 },
  
  // Bình luận - Optional
  // Nội dung đánh giá chi tiết của user
  comment: { type: String },
  
  // Ảnh đánh giá - Mảng các URL ảnh, optional
  // User có thể upload ảnh kèm theo đánh giá
  images: [{ type: String }],
  
  // Hiển thị đánh giá - Mặc định true
  // Admin có thể ẩn/hiện đánh giá (isVisible = false → ẩn)
  isVisible: { type: Boolean, default: true },
  
  // Thời gian tạo - Tự động set khi tạo review mới
  createdAt: { type: Date, default: Date.now },
  
  // Thời gian cập nhật - Tự động cập nhật mỗi khi save
  updatedAt: { type: Date, default: Date.now },
});

/**
 * Index - Đảm bảo một user chỉ đánh giá một sản phẩm một lần
 * Tạo unique index trên (user, product) để tránh duplicate reviews
 */
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

// Export Review model để sử dụng trong các file khác
// mongoose.model("Review", reviewSchema) - Tạo model từ schema
module.exports = mongoose.model("Review", reviewSchema);

