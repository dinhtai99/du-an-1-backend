// Import các thư viện và modules cần thiết
const express = require("express"); // Framework web server
const router = express.Router(); // Router để định nghĩa các routes
const Product = require("../models/Product"); // Model Product từ database
const Category = require("../models/Category"); // Model Category từ database

/**
 * 🏠 Trang chủ - Lấy danh mục và sản phẩm nổi bật
 * GET /api/home
 * Lấy dữ liệu cho trang chủ: danh mục, sản phẩm nổi bật, khuyến mãi, mới nhất, bán chạy
 * @returns {Object} { categories, featuredProducts, promotionProducts, newProducts, bestSellerProducts }
 */
router.get("/", async (req, res) => {
  try {
    // Lấy tất cả danh mục đang hoạt động (status = 1)
    // Sắp xếp theo tên tăng dần
    const categories = await Category.find({ status: 1 }).sort({ name: 1 });

    // Sản phẩm nổi bật (isFeatured = true, status = 1)
    // populate("category"): Lấy thông tin danh mục (chỉ name)
    // Sắp xếp theo ngày tạo giảm dần, giới hạn 10 sản phẩm
    const featuredProducts = await Product.find({
      isFeatured: true, // Sản phẩm nổi bật
      status: 1, // Đang hoạt động
    })
      .populate("category", "name")
      .sort({ createdAt: -1 }) // Mới nhất trước
      .limit(10); // Giới hạn 10 sản phẩm

    // Sản phẩm khuyến mãi (isPromotion = true, status = 1)
    // populate("category"): Lấy thông tin danh mục (chỉ name)
    // Sắp xếp theo ngày tạo giảm dần, giới hạn 10 sản phẩm
    const promotionProducts = await Product.find({
      isPromotion: true, // Sản phẩm khuyến mãi
      status: 1, // Đang hoạt động
    })
      .populate("category", "name")
      .sort({ createdAt: -1 }) // Mới nhất trước
      .limit(10); // Giới hạn 10 sản phẩm

    // Sản phẩm mới nhất (status = 1)
    // populate("category"): Lấy thông tin danh mục (chỉ name)
    // Sắp xếp theo ngày tạo giảm dần, giới hạn 10 sản phẩm
    const newProducts = await Product.find({ status: 1 })
      .populate("category", "name")
      .sort({ createdAt: -1 }) // Mới nhất trước
      .limit(10); // Giới hạn 10 sản phẩm

    // Sản phẩm bán chạy (theo rating và số lượng đánh giá)
    // populate("category"): Lấy thông tin danh mục (chỉ name)
    // Sắp xếp theo rating giảm dần, sau đó theo totalReviews giảm dần, giới hạn 10 sản phẩm
    const bestSellerProducts = await Product.find({ status: 1 })
      .populate("category", "name")
      .sort({ rating: -1, totalReviews: -1 }) // Rating cao nhất trước, sau đó số đánh giá nhiều nhất
      .limit(10); // Giới hạn 10 sản phẩm

    // Trả về dữ liệu cho trang chủ
    res.json({
      categories, // Danh sách danh mục
      featuredProducts, // Sản phẩm nổi bật
      promotionProducts, // Sản phẩm khuyến mãi
      newProducts, // Sản phẩm mới nhất
      bestSellerProducts, // Sản phẩm bán chạy
    });
  } catch (error) {
    console.error("Get home data error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

module.exports = router;

