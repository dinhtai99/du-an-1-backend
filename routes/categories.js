// Import các thư viện và modules cần thiết
const express = require("express"); // Framework web server
const router = express.Router(); // Router để định nghĩa các routes
const Category = require("../models/Category"); // Model Category từ database
const Product = require("../models/Product"); // Model Product từ database
const { verifyToken } = require("../middleware/authMiddleware"); // Middleware xác thực JWT token

/**
 * 🗂️ Lấy danh sách loại sản phẩm
 * GET /api/categories
 * Lấy danh sách loại sản phẩm với filter, sort, và pagination
 * @query {String} search - Tìm kiếm theo tên (optional)
 * @query {Number} status - Lọc theo trạng thái (0=ẩn, 1=hiển thị) (optional)
 * @query {Number} page - Trang hiện tại (optional, mặc định 1)
 * @query {Number} limit - Số lượng mỗi trang (optional, mặc định 10)
 * @returns {Object} { categories, total, page, limit, totalPages }
 */
router.get("/", async (req, res) => {
  try {
    // Lấy các query parameters từ request
    const { search, status, page = 1, limit = 10 } = req.query;
    
    // Khởi tạo query object để filter
    const query = {};

    // Tìm kiếm theo tên loại sản phẩm
    // $regex: Tìm kiếm không phân biệt hoa thường
    // $options: "i" = case insensitive
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // Lọc theo trạng thái (0=ẩn, 1=hiển thị)
    if (status !== undefined) {
      query.status = parseInt(status);
    }

    // Tính toán skip cho pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Tìm loại sản phẩm với các filter, sort, skip, limit
    const categories = await Category.find(query)
      .sort({ createdAt: -1 }) // Sắp xếp theo ngày tạo giảm dần (mới nhất trước)
      .skip(skip)
      .limit(parseInt(limit));

    // Đếm tổng số loại sản phẩm thỏa mãn query (không phân trang)
    const total = await Category.countDocuments(query);

    // Trả về danh sách loại sản phẩm với pagination info
    res.json({
      categories, // Danh sách loại sản phẩm
      total, // Tổng số loại sản phẩm thỏa mãn query
      page: parseInt(page), // Trang hiện tại
      limit: parseInt(limit), // Số lượng mỗi trang
      totalPages: Math.ceil(total / parseInt(limit)), // Tổng số trang
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách loại sản phẩm!" });
  }
});

/**
 * 🗂️ Lấy tất cả loại sản phẩm (không phân trang - dùng cho dropdown)
 * GET /api/categories/all
 * Lấy tất cả loại sản phẩm đang hoạt động (status = 1) để hiển thị trong dropdown
 * @returns {Array} Danh sách loại sản phẩm
 */
router.get("/all", async (req, res) => {
  try {
    // Lấy tất cả loại sản phẩm đang hoạt động (status = 1)
    // Sắp xếp theo tên tăng dần để hiển thị trong dropdown
    const categories = await Category.find({ status: 1 }).sort({ name: 1 });
    
    // Trả về danh sách loại sản phẩm
    res.json(categories);
  } catch (error) {
    console.error("Get all categories error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

/**
 * 🗂️ Lấy chi tiết loại sản phẩm
 * GET /api/categories/:id
 * Lấy thông tin chi tiết của một loại sản phẩm
 * @param {String} id - ID của loại sản phẩm
 * @returns {Object} Category object
 */
router.get("/:id", async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Không tìm thấy loại sản phẩm!" });
    }
    res.json(category);
  } catch (error) {
    console.error("Get category error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

/**
 * ➕ Thêm loại sản phẩm mới
 * POST /api/categories
 * Tạo loại sản phẩm mới (chỉ admin/staff)
 * @middleware verifyToken - Phải đăng nhập
 * @body {String} name - Tên loại sản phẩm (required)
 * @body {String} description - Mô tả (optional)
 * @returns {Object} { message, category }
 */
router.post("/", verifyToken, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Vui lòng nhập tên loại sản phẩm!" });
    }

    const newCategory = new Category({
      name,
      description: description || "",
    });

    await newCategory.save();
    res.status(201).json({
      message: "Thêm loại sản phẩm thành công!",
      category: newCategory,
    });
  } catch (error) {
    console.error("Create category error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Tên loại sản phẩm đã tồn tại!" });
    }
    res.status(500).json({ message: "Lỗi server khi thêm loại sản phẩm!" });
  }
});

/**
 * ✏️ Cập nhật loại sản phẩm
 * PUT /api/categories/:id
 * Cập nhật thông tin loại sản phẩm (chỉ admin/staff)
 * @middleware verifyToken - Phải đăng nhập
 * @param {String} id - ID của loại sản phẩm
 * @body {String} name - Tên loại sản phẩm (optional)
 * @body {String} description - Mô tả (optional)
 * @body {Number} status - Trạng thái (0=ẩn, 1=hiển thị) (optional)
 * @returns {Object} { message, category }
 */
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { name, description, status } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Không tìm thấy loại sản phẩm!" });
    }

    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (status !== undefined) category.status = parseInt(status);

    await category.save();
    res.json({
      message: "Cập nhật loại sản phẩm thành công!",
      category,
    });
  } catch (error) {
    console.error("Update category error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Tên loại sản phẩm đã tồn tại!" });
    }
    res.status(500).json({ message: "Lỗi server khi cập nhật loại sản phẩm!" });
  }
});

/**
 * 🗑️ Xóa loại sản phẩm (chỉ xóa nếu không có sản phẩm đang hoạt động)
 * DELETE /api/categories/:id
 * Xóa loại sản phẩm (chỉ admin/staff)
 * Chỉ xóa được nếu không có sản phẩm đang hoạt động thuộc loại này
 * @middleware verifyToken - Phải đăng nhập
 * @param {String} id - ID của loại sản phẩm
 * @returns {Object} { message }
 */
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Kiểm tra xem có sản phẩm đang hoạt động thuộc loại này không
    // Chỉ cho phép xóa nếu không có sản phẩm nào đang hoạt động (status = 1)
    const activeProducts = await Product.countDocuments({
      category: categoryId, // Sản phẩm thuộc loại này
      status: 1, // Đang hoạt động
    });

    // Nếu còn sản phẩm đang hoạt động, không cho phép xóa
    if (activeProducts > 0) {
      return res.status(400).json({
        message: `Không thể xóa loại sản phẩm này vì còn ${activeProducts} sản phẩm đang hoạt động!`,
      });
    }

    // Xóa loại sản phẩm khỏi database
    const category = await Category.findByIdAndDelete(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Không tìm thấy loại sản phẩm!" });
    }

    // Trả về thông báo thành công
    res.json({ message: "Xóa loại sản phẩm thành công!" });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ message: "Lỗi server khi xóa loại sản phẩm!" });
  }
});

/**
 * 🔗 Lấy danh sách sản phẩm theo loại
 * GET /api/categories/:id/products
 * Lấy danh sách sản phẩm thuộc một loại sản phẩm cụ thể
 * @param {String} id - ID của loại sản phẩm
 * @returns {Array} Danh sách sản phẩm
 */
router.get("/:id/products", async (req, res) => {
  try {
    // Tìm tất cả sản phẩm thuộc loại này và đang hoạt động (status = 1)
    // populate("category"): Lấy thông tin loại sản phẩm (chỉ name)
    // sort({ name: 1 }): Sắp xếp theo tên tăng dần
    const products = await Product.find({ category: req.params.id, status: 1 })
      .populate("category", "name")
      .sort({ name: 1 });
    
    // Trả về danh sách sản phẩm
    res.json(products);
  } catch (error) {
    console.error("Get category products error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

module.exports = router;

