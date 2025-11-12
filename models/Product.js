const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true }, // liên kết loại sản phẩm
  importPrice: { type: Number, required: true }, // Giá nhập
  price: { type: Number, required: true }, // Giá bán
  stock: { type: Number, default: 0 },
  minStock: { type: Number, default: 10 }, // Mức tồn kho tối thiểu để cảnh báo
  description: String,
  images: [{ type: String }], // Gallery ảnh (nhiều ảnh)
  image: { type: String, default: "" }, // Ảnh chính (giữ lại để tương thích)
  status: { type: Number, default: 1 } // 1 = còn hàng, 0 = ẩn
});

module.exports = mongoose.model("Product", ProductSchema);
