// Import thư viện mongoose để tạo schema và model
const mongoose = require("mongoose");

/**
 * Product Schema - Định nghĩa cấu trúc dữ liệu cho Product trong MongoDB
 * Schema này định nghĩa các trường dữ liệu và validation rules cho Product
 */
const ProductSchema = new mongoose.Schema({
  // Tên sản phẩm - Bắt buộc
  name: { type: String, required: true },
  
  // Danh mục sản phẩm - Reference đến Category model, bắt buộc
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  
  // Giá nhập - Giá mà shop mua vào, bắt buộc
  importPrice: { type: Number, required: true },
  
  // Giá bán - Giá bán thông thường, bắt buộc
  price: { type: Number, required: true },
  
  // Giá khuyến mãi - Giá bán khi có khuyến mãi, optional
  // Nếu có salePrice, sẽ hiển thị salePrice thay vì price
  salePrice: { type: Number },
  
  // Số lượng tồn kho - Mặc định 0
  stock: { type: Number, default: 0 },
  
  // Mức tồn kho tối thiểu để cảnh báo - Mặc định 10
  // Khi stock < minStock, hệ thống sẽ cảnh báo
  minStock: { type: Number, default: 10 },
  
  // Mô tả sản phẩm - Optional
  description: String,
  
  // Gallery ảnh - Mảng các URL ảnh (nhiều ảnh)
  images: [{ type: String }],
  
  // Ảnh chính - URL ảnh đại diện, mặc định là chuỗi rỗng
  image: { type: String, default: "" },
  
  // Màu sắc - Mảng các màu có sẵn, ví dụ: ["Đỏ", "Xanh", "Đen"]
  colors: [{ type: String }],
  
  // Kích thước - Mảng các size có sẵn, ví dụ: ["S", "M", "L", "XL"]
  sizes: [{ type: String }],
  
  // Sản phẩm nổi bật - Mặc định false
  // isFeatured = true: Sản phẩm sẽ được hiển thị ở trang chủ
  isFeatured: { type: Boolean, default: false },
  
  // Sản phẩm khuyến mãi - Mặc định false
  // isPromotion = true: Sản phẩm đang có khuyến mãi
  isPromotion: { type: Boolean, default: false },
  
  // Đánh giá trung bình - Mặc định 0 (0-5 sao)
  // Được tính từ các review của khách hàng
  rating: { type: Number, default: 0 },
  
  // Tổng số đánh giá - Mặc định 0
  // Số lượng review mà khách hàng đã đánh giá
  totalReviews: { type: Number, default: 0 },
  
  // Trạng thái sản phẩm - Mặc định 1
  // 1 = còn hàng (hiển thị), 0 = ẩn (không hiển thị)
  status: { type: Number, default: 1 }
});

// Export Product model để sử dụng trong các file khác
// mongoose.model("Product", ProductSchema) - Tạo model từ schema
module.exports = mongoose.model("Product", ProductSchema);
