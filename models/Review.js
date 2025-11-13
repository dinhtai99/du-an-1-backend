const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" }, // Đơn hàng đã mua
  rating: { type: Number, required: true, min: 1, max: 5 }, // 1-5 sao
  comment: { type: String },
  images: [{ type: String }], // Ảnh đánh giá
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Một user chỉ đánh giá một sản phẩm một lần
reviewSchema.index({ user: 1, product: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);

