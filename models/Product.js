const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  importPrice: { type: Number, required: true }, // Giá nhập
  price: { type: Number, required: true }, // Giá bán
  salePrice: { type: Number }, // Giá khuyến mãi
  stock: { type: Number, default: 0 },
  minStock: { type: Number, default: 10 }, // Mức tồn kho tối thiểu để cảnh báo
  description: String,
  images: [{ type: String }], // Gallery ảnh (nhiều ảnh)
  image: { type: String, default: "" }, // Ảnh chính
  colors: [{ type: String }], // Màu sắc: ["Đỏ", "Xanh", "Đen"]
  sizes: [{ type: String }], // Kích thước: ["S", "M", "L", "XL"]
  isFeatured: { type: Boolean, default: false }, // Sản phẩm nổi bật
  isPromotion: { type: Boolean, default: false }, // Sản phẩm khuyến mãi
  rating: { type: Number, default: 0 }, // Đánh giá trung bình (0-5)
  totalReviews: { type: Number, default: 0 }, // Tổng số đánh giá
  status: { type: Number, default: 1 } // 1 = còn hàng, 0 = ẩn
});

module.exports = mongoose.model("Product", ProductSchema);
