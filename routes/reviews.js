// Import các thư viện và modules cần thiết
const express = require("express"); // Framework web server
const router = express.Router(); // Router để định nghĩa các routes
const Review = require("../models/Review"); // Model Review từ database
const Product = require("../models/Product"); // Model Product từ database
const Order = require("../models/Order"); // Model Order từ database
const { verifyToken, requireCustomer, requireAdminOrStaff } = require("../middleware/authMiddleware"); // Middleware xác thực và phân quyền

/**
 * ⭐ Lấy đánh giá của sản phẩm (chỉ hiển thị những đánh giá visible)
 * GET /api/reviews/product/:productId
 * Lấy danh sách đánh giá của một sản phẩm (chỉ hiển thị đánh giá visible)
 * @param {String} productId - ID của sản phẩm
 * @query {Number} page - Trang hiện tại (optional, mặc định 1)
 * @query {Number} limit - Số lượng mỗi trang (optional, mặc định 10)
 * @returns {Object} { reviews, total, page, limit, totalPages }
 */
router.get("/product/:productId", async (req, res) => {
  try {
    // Lấy các query parameters từ request
    const { page = 1, limit = 10 } = req.query;
    
    // Tính toán skip cho pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Tìm đánh giá của sản phẩm
    // Chỉ lấy đánh giá đang hiển thị (isVisible = true)
    const reviews = await Review.find({ 
      product: req.params.productId, // ID sản phẩm
      isVisible: true // Chỉ lấy đánh giá đang hiển thị
    })
      .populate("user", "fullName avatar") // Lấy thông tin user (chỉ fullName và avatar)
      .sort({ createdAt: -1 }) // Sắp xếp theo ngày tạo giảm dần (mới nhất trước)
      .skip(skip)
      .limit(parseInt(limit));

    // Đếm tổng số đánh giá thỏa mãn query (không phân trang)
    const total = await Review.countDocuments({ 
      product: req.params.productId,
      isVisible: true 
    });

    // Trả về danh sách đánh giá với pagination info
    res.json({
      reviews, // Danh sách đánh giá
      total, // Tổng số đánh giá
      page: parseInt(page), // Trang hiện tại
      limit: parseInt(limit), // Số lượng mỗi trang
      totalPages: Math.ceil(total / parseInt(limit)), // Tổng số trang
    });
  } catch (error) {
    console.error("Get reviews error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

/**
 * ⭐ Lấy đánh giá của user (chỉ customer)
 * GET /api/reviews/my
 * Lấy danh sách đánh giá của user đang đăng nhập
 * @middleware verifyToken - Phải đăng nhập
 * @middleware requireCustomer - Chỉ customer mới được truy cập
 * @returns {Array} Danh sách đánh giá của user
 */
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

/**
 * ➕ Thêm đánh giá (chỉ customer đã mua sản phẩm)
 * POST /api/reviews
 * Tạo đánh giá mới cho sản phẩm (chỉ customer đã mua sản phẩm)
 * @middleware verifyToken - Phải đăng nhập
 * @middleware requireCustomer - Chỉ customer mới được truy cập
 * @body {String} productId - ID sản phẩm (required)
 * @body {String} orderId - ID đơn hàng (optional, để xác minh đã mua)
 * @body {Number} rating - Đánh giá (1-5 sao) (required)
 * @body {String} comment - Bình luận (optional)
 * @body {Array} images - Mảng URL ảnh (optional)
 * @returns {Object} { message, review }
 */
router.post("/", verifyToken, requireCustomer, async (req, res) => {
  try {
    const { productId, orderId, rating, comment, images } = req.body;

    if (!productId || !rating) {
      return res.status(400).json({ message: "Vui lòng chọn sản phẩm và đánh giá!" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Đánh giá phải từ 1 đến 5 sao!" });
    }

    // Kiểm tra user đã mua sản phẩm chưa (nếu có orderId)
    // Xác minh đơn hàng thuộc về user và đã hoàn thành
    if (orderId) {
      const order = await Order.findOne({
        _id: orderId, // ID đơn hàng
        customer: req.user.userId, // Thuộc về user đang đăng nhập
        status: "completed", // Đã hoàn thành
      });
      
      // Kiểm tra đơn hàng có tồn tại không
      if (!order) {
        return res.status(400).json({ message: "Bạn chưa mua sản phẩm này!" });
      }

      // Kiểm tra sản phẩm có trong đơn hàng không
      const hasProduct = order.items.some(item => item.product.toString() === productId);
      if (!hasProduct) {
        return res.status(400).json({ message: "Sản phẩm không có trong đơn hàng này!" });
      }
    }

    // Kiểm tra user đã đánh giá sản phẩm này chưa
    // Mỗi user chỉ được đánh giá một lần cho mỗi sản phẩm
    const existingReview = await Review.findOne({ user: req.user.userId, product: productId });
    if (existingReview) {
      return res.status(400).json({ message: "Bạn đã đánh giá sản phẩm này rồi!" });
    }

    // Tạo đánh giá mới
    const review = new Review({
      user: req.user.userId, // ID user
      product: productId, // ID sản phẩm
      order: orderId, // ID đơn hàng (nếu có)
      rating, // Đánh giá (1-5 sao)
      comment: comment || "", // Bình luận (mặc định chuỗi rỗng)
      images: images || [], // Mảng URL ảnh (mặc định mảng rỗng)
    });

    // Lưu đánh giá vào database
    await review.save();

    // Cập nhật rating trung bình của sản phẩm
    // Chỉ tính những đánh giá visible (isVisible = true)
    const reviews = await Review.find({ product: productId, isVisible: true });
    // Tính rating trung bình: tổng rating / số lượng đánh giá
    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0;
    
    // Cập nhật rating và totalReviews của sản phẩm
    await Product.findByIdAndUpdate(productId, {
      rating: avgRating, // Rating trung bình
      totalReviews: reviews.length, // Tổng số đánh giá
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

/**
 * ✏️ Cập nhật đánh giá (chỉ customer)
 * PUT /api/reviews/:id
 * Cập nhật đánh giá của user (chỉ customer, chỉ đánh giá của chính mình)
 * @middleware verifyToken - Phải đăng nhập
 * @middleware requireCustomer - Chỉ customer mới được truy cập
 * @param {String} id - ID của đánh giá
 * @body {Number} rating - Đánh giá (1-5 sao) (optional)
 * @body {String} comment - Bình luận (optional)
 * @body {Array} images - Mảng URL ảnh (optional)
 * @returns {Object} { message, review }
 */
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

/**
 * 🗑️ Xóa đánh giá (chỉ customer)
 * DELETE /api/reviews/:id
 * Xóa đánh giá của user (chỉ customer, chỉ đánh giá của chính mình)
 * @middleware verifyToken - Phải đăng nhập
 * @middleware requireCustomer - Chỉ customer mới được truy cập
 * @param {String} id - ID của đánh giá
 * @returns {Object} { message }
 */
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

/**
 * 👨‍💼 ADMIN: Lấy tất cả đánh giá
 * GET /api/reviews
 * Lấy tất cả đánh giá (chỉ admin/staff)
 * Lưu ý: Route này phải đặt SAU các route cụ thể như /product/:productId và /my
 * @middleware verifyToken - Phải đăng nhập
 * @middleware requireAdminOrStaff - Chỉ admin/staff mới được truy cập
 * @query {Number} page - Trang hiện tại (optional, mặc định 1)
 * @query {Number} limit - Số lượng mỗi trang (optional, mặc định 20)
 * @query {String} productId - Lọc theo ID sản phẩm (optional)
 * @query {Number} rating - Lọc theo rating (optional)
 * @returns {Object} { reviews, total, page, limit, totalPages }
 */
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

/**
 * 👨‍💼 ADMIN: Xóa đánh giá (admin có thể xóa bất kỳ đánh giá nào)
 * DELETE /api/reviews/admin/:id
 * Xóa đánh giá (chỉ admin/staff, có thể xóa bất kỳ đánh giá nào)
 * @middleware verifyToken - Phải đăng nhập
 * @middleware requireAdminOrStaff - Chỉ admin/staff mới được truy cập
 * @param {String} id - ID của đánh giá
 * @returns {Object} { message }
 */
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

/**
 * 👨‍💼 ADMIN: Ẩn/Hiện đánh giá
 * PUT /api/reviews/admin/:id/toggle-visibility
 * Ẩn hoặc hiện đánh giá (chỉ admin/staff)
 * @middleware verifyToken - Phải đăng nhập
 * @middleware requireAdminOrStaff - Chỉ admin/staff mới được truy cập
 * @param {String} id - ID của đánh giá
 * @returns {Object} { message, review }
 */
router.put("/admin/:id/toggle-visibility", verifyToken, requireAdminOrStaff, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá!" });
    }

    // Toggle visibility: đảo ngược trạng thái isVisible
    review.isVisible = !review.isVisible;
    await review.save();

    // Cập nhật rating trung bình của sản phẩm sau khi thay đổi visibility
    // Chỉ tính những đánh giá visible (isVisible = true)
    const reviews = await Review.find({ product: review.product, isVisible: true });
    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0;
    
    // Cập nhật rating và totalReviews của sản phẩm
    await Product.findByIdAndUpdate(review.product, {
      rating: avgRating, // Rating trung bình
      totalReviews: reviews.length, // Tổng số đánh giá
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

