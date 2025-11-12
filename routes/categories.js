const express = require("express");
const router = express.Router();
const Category = require("../models/Category");
const Product = require("../models/Product");
const { verifyToken } = require("../middleware/authMiddleware");

// 🗂️ Lấy danh sách loại sản phẩm
router.get("/", async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10 } = req.query;
    const query = {};

    // Tìm kiếm theo tên
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // Lọc theo status
    if (status !== undefined) {
      query.status = parseInt(status);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const categories = await Category.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Category.countDocuments(query);

    res.json({
      categories,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách loại sản phẩm!" });
  }
});

// 🗂️ Lấy tất cả loại sản phẩm (không phân trang - dùng cho dropdown)
router.get("/all", async (req, res) => {
  try {
    const categories = await Category.find({ status: 1 }).sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    console.error("Get all categories error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 🗂️ Lấy chi tiết loại sản phẩm
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

// ➕ Thêm loại sản phẩm mới
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

// ✏️ Cập nhật loại sản phẩm
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

// 🗑️ Xóa loại sản phẩm (chỉ xóa nếu không có sản phẩm đang hoạt động)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const categoryId = req.params.id;

    // Kiểm tra xem có sản phẩm đang hoạt động thuộc loại này không
    const activeProducts = await Product.countDocuments({
      category: categoryId,
      status: 1,
    });

    if (activeProducts > 0) {
      return res.status(400).json({
        message: `Không thể xóa loại sản phẩm này vì còn ${activeProducts} sản phẩm đang hoạt động!`,
      });
    }

    const category = await Category.findByIdAndDelete(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Không tìm thấy loại sản phẩm!" });
    }

    res.json({ message: "Xóa loại sản phẩm thành công!" });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ message: "Lỗi server khi xóa loại sản phẩm!" });
  }
});

// 🔗 Lấy danh sách sản phẩm theo loại
router.get("/:id/products", async (req, res) => {
  try {
    const products = await Product.find({ category: req.params.id, status: 1 })
      .populate("category", "name")
      .sort({ name: 1 });
    res.json(products);
  } catch (error) {
    console.error("Get category products error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

module.exports = router;

