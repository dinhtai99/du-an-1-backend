const express = require("express");
const router = express.Router();
const Review = require("../models/Review");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { verifyToken, requireCustomer, requireAdminOrStaff } = require("../middleware/authMiddleware");

// ⭐ Lấy đánh giá của sản phẩm (chỉ hiển thị những đánh giá visible)
router.get("/product/:productId", async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reviews = await Review.find({ 
      product: req.params.productId,
      isVisible: true // Chỉ lấy đánh giá đang hiển thị
    })
      .populate("user", "fullName avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments({ 
      product: req.params.productId,
      isVisible: true 
    });

    res.json({
      reviews,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Get reviews error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// ⭐ Lấy đánh giá của user (chỉ customer)
router.get("/my", verifyToken, requireCustomer, async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.user.userId })
      .populate("product", "name image price")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error("Get my reviews error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// ➕ Thêm đánh giá (chỉ customer đã mua sản phẩm)
router.post("/", verifyToken, requireCustomer, async (req, res) => {
  try {
    const { productId, orderId, rating, comment, images } = req.body;

    if (!productId || !rating) {
      return res.status(400).json({ message: "Vui lòng chọn sản phẩm và đánh giá!" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Đánh giá phải từ 1 đến 5 sao!" });
    }

    // Kiểm tra user đã mua sản phẩm chưa
    if (orderId) {
      const order = await Order.findOne({
        _id: orderId,
        customer: req.user.userId,
        status: "completed",
      });
      
      if (!order) {
        return res.status(400).json({ message: "Bạn chưa mua sản phẩm này!" });
      }

      const hasProduct = order.items.some(item => item.product.toString() === productId);
      if (!hasProduct) {
        return res.status(400).json({ message: "Sản phẩm không có trong đơn hàng này!" });
      }
    }

    // Kiểm tra đã đánh giá chưa
    const existingReview = await Review.findOne({ user: req.user.userId, product: productId });
    if (existingReview) {
      return res.status(400).json({ message: "Bạn đã đánh giá sản phẩm này rồi!" });
    }

    const review = new Review({
      user: req.user.userId,
      product: productId,
      order: orderId,
      rating,
      comment: comment || "",
      images: images || [],
    });

    await review.save();

    // Cập nhật rating trung bình của sản phẩm (chỉ tính những đánh giá visible)
    const reviews = await Review.find({ product: productId, isVisible: true });
    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0;
    
    await Product.findByIdAndUpdate(productId, {
      rating: avgRating,
      totalReviews: reviews.length,
    });

    await review.populate("user", "fullName avatar");
    await review.populate("product", "name image");

    res.status(201).json({
      message: "Đánh giá thành công!",
      review,
    });
  } catch (error) {
    console.error("Create review error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Bạn đã đánh giá sản phẩm này rồi!" });
    }
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// ✏️ Cập nhật đánh giá (chỉ customer)
router.put("/:id", verifyToken, requireCustomer, async (req, res) => {
  try {
    const { rating, comment, images } = req.body;
    const review = await Review.findOne({ _id: req.params.id, user: req.user.userId });

    if (!review) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá!" });
    }

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Đánh giá phải từ 1 đến 5 sao!" });
      }
      review.rating = rating;
    }
    if (comment !== undefined) review.comment = comment;
    if (images !== undefined) review.images = images;

    await review.save();

    // Cập nhật rating trung bình của sản phẩm (chỉ tính những đánh giá visible)
    const reviews = await Review.find({ product: review.product, isVisible: true });
    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0;
    
    await Product.findByIdAndUpdate(review.product, {
      rating: avgRating,
      totalReviews: reviews.length,
    });

    await review.populate("user", "fullName avatar");
    await review.populate("product", "name image");

    res.json({
      message: "Cập nhật đánh giá thành công!",
      review,
    });
  } catch (error) {
    console.error("Update review error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 🗑️ Xóa đánh giá (chỉ customer)
router.delete("/:id", verifyToken, requireCustomer, async (req, res) => {
  try {
    const review = await Review.findOneAndDelete({ _id: req.params.id, user: req.user.userId });

    if (!review) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá!" });
    }

    // Cập nhật rating trung bình của sản phẩm (chỉ tính những đánh giá visible)
    const reviews = await Review.find({ product: review.product, isVisible: true });
    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0;
    
    await Product.findByIdAndUpdate(review.product, {
      rating: avgRating,
      totalReviews: reviews.length,
    });

    res.json({ message: "Xóa đánh giá thành công!" });
  } catch (error) {
    console.error("Delete review error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 👨‍💼 ADMIN: Lấy tất cả đánh giá
// Lưu ý: Route này phải đặt SAU các route cụ thể như /product/:productId và /my
router.get("/", verifyToken, requireAdminOrStaff, async (req, res) => {
  try {
    console.log("📥 GET /api/reviews - Admin request");
    const { page = 1, limit = 20, productId, rating } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};
    if (productId) query.product = productId;
    if (rating) query.rating = parseInt(rating);

    console.log("📥 Query:", query);

    const reviews = await Review.find(query)
      .populate("user", "fullName avatar email")
      .populate("product", "name image")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments(query);

    console.log(`📥 Found ${reviews.length} reviews, total: ${total}`);

    // Đảm bảo tất cả reviews có trường isVisible (mặc định true cho đánh giá cũ)
    const reviewsWithVisibility = reviews.map(review => {
      const reviewObj = review.toObject();
      if (reviewObj.isVisible === undefined) {
        reviewObj.isVisible = true;
      }
      return reviewObj;
    });

    res.json({
      reviews: reviewsWithVisibility,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("❌ Get all reviews error:", error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
});

// 👨‍💼 ADMIN: Xóa đánh giá (admin có thể xóa bất kỳ đánh giá nào)
router.delete("/admin/:id", verifyToken, requireAdminOrStaff, async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);

    if (!review) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá!" });
    }

    // Cập nhật rating trung bình của sản phẩm (chỉ tính những đánh giá visible)
    const reviews = await Review.find({ product: review.product, isVisible: true });
    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0;
    
    await Product.findByIdAndUpdate(review.product, {
      rating: avgRating,
      totalReviews: reviews.length,
    });

    res.json({ message: "Xóa đánh giá thành công!" });
  } catch (error) {
    console.error("Admin delete review error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 👨‍💼 ADMIN: Ẩn/Hiện đánh giá
router.put("/admin/:id/toggle-visibility", verifyToken, requireAdminOrStaff, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá!" });
    }

    // Toggle visibility
    review.isVisible = !review.isVisible;
    await review.save();

    // Cập nhật rating trung bình của sản phẩm (chỉ tính những đánh giá visible)
    const reviews = await Review.find({ product: review.product, isVisible: true });
    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0;
    
    await Product.findByIdAndUpdate(review.product, {
      rating: avgRating,
      totalReviews: reviews.length,
    });

    await review.populate("user", "fullName avatar");
    await review.populate("product", "name image");

    res.json({
      message: review.isVisible ? "Hiển thị đánh giá thành công!" : "Ẩn đánh giá thành công!",
      review,
    });
  } catch (error) {
    console.error("Toggle review visibility error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

module.exports = router;

