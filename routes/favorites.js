// Import các thư viện và modules cần thiết
const express = require("express"); // Framework web server
const router = express.Router(); // Router để định nghĩa các routes
const Favorite = require("../models/Favorite"); // Model Favorite từ database
const Product = require("../models/Product"); // Model Product từ database
const { verifyToken, requireCustomer } = require("../middleware/authMiddleware"); // Middleware xác thực và phân quyền

/**
 * ❤️ Lấy danh sách sản phẩm yêu thích (chỉ customer)
 * GET /api/favorites
 * Lấy danh sách sản phẩm yêu thích của user đang đăng nhập
 * @middleware verifyToken - Phải đăng nhập
 * @middleware requireCustomer - Chỉ customer mới được truy cập
 * @returns {Array} Danh sách sản phẩm yêu thích
 */
router.get("/", verifyToken, requireCustomer, async (req, res) => {
  try {
    // Tìm tất cả sản phẩm yêu thích của user đang đăng nhập
    // populate("product"): Lấy thông tin chi tiết của từng sản phẩm
    // sort({ createdAt: -1 }): Sắp xếp theo ngày thêm vào giảm dần (mới nhất trước)
    const favorites = await Favorite.find({ user: req.user.userId })
      .populate("product")
      .sort({ createdAt: -1 });

    // Chỉ trả về danh sách sản phẩm (không cần thông tin Favorite)
    res.json(favorites.map(fav => fav.product));
  } catch (error) {
    console.error("Get favorites error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

/**
 * ❤️ Kiểm tra sản phẩm đã yêu thích chưa (chỉ customer)
 * GET /api/favorites/check/:productId
 * Kiểm tra xem sản phẩm đã có trong danh sách yêu thích chưa
 * @middleware verifyToken - Phải đăng nhập
 * @middleware requireCustomer - Chỉ customer mới được truy cập
 * @param {String} productId - ID của sản phẩm
 * @returns {Object} { isFavorite: Boolean }
 */
router.get("/check/:productId", verifyToken, requireCustomer, async (req, res) => {
  try {
    const favorite = await Favorite.findOne({
      user: req.user.userId,
      product: req.params.productId,
    });

    res.json({ isFavorite: !!favorite });
  } catch (error) {
    console.error("Check favorite error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

/**
 * ➕ Thêm vào yêu thích (chỉ customer)
 * POST /api/favorites/:productId
 * Thêm sản phẩm vào danh sách yêu thích
 * @middleware verifyToken - Phải đăng nhập
 * @middleware requireCustomer - Chỉ customer mới được truy cập
 * @param {String} productId - ID của sản phẩm
 * @returns {Object} { message, favorite }
 */
router.post("/:productId", verifyToken, requireCustomer, async (req, res) => {
  try {
    // Tìm sản phẩm theo ID
    const product = await Product.findById(req.params.productId);
    
    // Kiểm tra sản phẩm có tồn tại không
    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm!" });
    }

    // Kiểm tra sản phẩm đã có trong danh sách yêu thích chưa
    const existingFavorite = await Favorite.findOne({
      user: req.user.userId, // User đang đăng nhập
      product: req.params.productId, // Sản phẩm cần thêm
    });

    // Nếu đã có, không cho thêm lại
    if (existingFavorite) {
      return res.status(400).json({ message: "Sản phẩm đã có trong danh sách yêu thích!" });
    }

    // Tạo favorite mới
    const favorite = new Favorite({
      user: req.user.userId, // ID user
      product: req.params.productId, // ID sản phẩm
    });

    // Lưu favorite vào database
    await favorite.save();
    
    // Populate thông tin sản phẩm để trả về đầy đủ
    await favorite.populate("product");

    // Trả về thông báo thành công và thông tin favorite (status 201 = Created)
    res.status(201).json({
      message: "Đã thêm vào yêu thích!",
      favorite, // Favorite với thông tin sản phẩm đầy đủ
    });
  } catch (error) {
    console.error("Add favorite error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Sản phẩm đã có trong danh sách yêu thích!" });
    }
    res.status(500).json({ message: "Lỗi server!" });
  }
});

/**
 * 🗑️ Xóa khỏi yêu thích (chỉ customer)
 * DELETE /api/favorites/:productId
 * Xóa sản phẩm khỏi danh sách yêu thích
 * @middleware verifyToken - Phải đăng nhập
 * @middleware requireCustomer - Chỉ customer mới được truy cập
 * @param {String} productId - ID của sản phẩm
 * @returns {Object} { message }
 */
router.delete("/:productId", verifyToken, requireCustomer, async (req, res) => {
  try {
    // Tìm và xóa favorite
    // findOneAndDelete: Tìm và xóa trong một lần, trả về document đã xóa
    const favorite = await Favorite.findOneAndDelete({
      user: req.user.userId, // User đang đăng nhập
      product: req.params.productId, // Sản phẩm cần xóa
    });

    // Kiểm tra favorite có tồn tại không
    if (!favorite) {
      return res.status(404).json({ message: "Sản phẩm không có trong danh sách yêu thích!" });
    }

    // Trả về thông báo thành công
    res.json({ message: "Đã xóa khỏi yêu thích!" });
  } catch (error) {
    console.error("Remove favorite error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

module.exports = router;

