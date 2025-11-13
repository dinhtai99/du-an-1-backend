const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const Category = require("../models/Category");

// 🏠 Trang chủ - Lấy danh mục và sản phẩm nổi bật
router.get("/", async (req, res) => {
  try {
    // Lấy tất cả danh mục đang hoạt động
    const categories = await Category.find({ status: 1 }).sort({ name: 1 });

    // Sản phẩm nổi bật
    const featuredProducts = await Product.find({
      isFeatured: true,
      status: 1,
    })
      .populate("category", "name")
      .sort({ createdAt: -1 })
      .limit(10);

    // Sản phẩm khuyến mãi
    const promotionProducts = await Product.find({
      isPromotion: true,
      status: 1,
    })
      .populate("category", "name")
      .sort({ createdAt: -1 })
      .limit(10);

    // Sản phẩm mới nhất
    const newProducts = await Product.find({ status: 1 })
      .populate("category", "name")
      .sort({ createdAt: -1 })
      .limit(10);

    // Sản phẩm bán chạy (theo rating và số lượng đánh giá)
    const bestSellerProducts = await Product.find({ status: 1 })
      .populate("category", "name")
      .sort({ rating: -1, totalReviews: -1 })
      .limit(10);

    res.json({
      categories,
      featuredProducts,
      promotionProducts,
      newProducts,
      bestSellerProducts,
    });
  } catch (error) {
    console.error("Get home data error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

module.exports = router;

