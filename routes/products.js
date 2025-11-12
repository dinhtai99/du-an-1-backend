const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const { verifyToken } = require("../middleware/authMiddleware");

// 📦 Lấy danh sách sản phẩm
router.get("/", async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, status, lowStock, page = 1, limit = 10 } = req.query;
    const query = {};

    // Tìm kiếm theo tên
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // Lọc theo loại sản phẩm
    if (category) {
      query.category = category;
    }

    // Lọc theo giá
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    // Lọc theo status
    if (status !== undefined) {
      query.status = parseInt(status);
    }

    // Cảnh báo tồn kho thấp
    if (lowStock === "true") {
      query.$expr = { $lte: ["$stock", "$minStock"] };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const products = await Product.find(query)
      .populate("category", "name description")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    // Đánh dấu sản phẩm tồn kho thấp
    const productsWithWarning = products.map((product) => {
      const productObj = product.toObject();
      productObj.lowStockWarning = product.stock <= product.minStock;
      return productObj;
    });

    res.json({
      products: productsWithWarning,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách sản phẩm!" });
  }
});

// 📦 Lấy chi tiết sản phẩm
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("category", "name description");
    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm!" });
    }

    const productObj = product.toObject();
    productObj.lowStockWarning = product.stock <= product.minStock;

    res.json(productObj);
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// ➕ Thêm sản phẩm mới
router.post("/", verifyToken, async (req, res) => {
  try {
    const { name, category, importPrice, price, stock, minStock, description, images, image } = req.body;

    if (!name || !category || !importPrice || !price) {
      return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin bắt buộc!" });
    }

    const newProduct = new Product({
      name,
      category,
      importPrice: parseFloat(importPrice),
      price: parseFloat(price),
      stock: parseInt(stock) || 0,
      minStock: parseInt(minStock) || 10,
      description: description || "",
      images: images || [],
      image: image || (images && images.length > 0 ? images[0] : ""),
    });

    await newProduct.save();
    const product = await Product.findById(newProduct._id).populate("category", "name description");

    res.status(201).json({
      message: "Thêm sản phẩm thành công!",
      product,
    });
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({ message: "Lỗi server khi thêm sản phẩm!" });
  }
});

// ✏️ Cập nhật sản phẩm
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { name, category, importPrice, price, stock, minStock, description, images, image, status } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm!" });
    }

    if (name) product.name = name;
    if (category) product.category = category;
    if (importPrice !== undefined) product.importPrice = parseFloat(importPrice);
    if (price !== undefined) product.price = parseFloat(price);
    if (stock !== undefined) product.stock = parseInt(stock);
    if (minStock !== undefined) product.minStock = parseInt(minStock);
    if (description !== undefined) product.description = description;
    if (images !== undefined) product.images = images;
    if (image !== undefined) product.image = image;
    if (status !== undefined) product.status = parseInt(status);

    await product.save();
    const updatedProduct = await Product.findById(product._id).populate("category", "name description");

    res.json({
      message: "Cập nhật sản phẩm thành công!",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({ message: "Lỗi server khi cập nhật sản phẩm!" });
  }
});

// 🗑️ Xóa sản phẩm (hoặc ẩn)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { hardDelete } = req.query; // hardDelete=true để xóa vĩnh viễn
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm!" });
    }

    if (hardDelete === "true") {
      await Product.findByIdAndDelete(req.params.id);
      res.json({ message: "Xóa sản phẩm thành công!" });
    } else {
      // Chỉ ẩn sản phẩm
      product.status = 0;
      await product.save();
      res.json({ message: "Ẩn sản phẩm thành công!" });
    }
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({ message: "Lỗi server khi xóa sản phẩm!" });
  }
});

// 📊 Lấy sản phẩm tồn kho thấp
router.get("/low-stock/all", verifyToken, async (req, res) => {
  try {
    const products = await Product.find({
      $expr: { $lte: ["$stock", "$minStock"] },
      status: 1,
    })
      .populate("category", "name")
      .sort({ stock: 1 });

    res.json(products);
  } catch (error) {
    console.error("Get low stock products error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 📤 Export Excel (trả về JSON, frontend sẽ xử lý export)
router.get("/export/excel", verifyToken, async (req, res) => {
  try {
    const products = await Product.find({ status: 1 })
      .populate("category", "name")
      .sort({ name: 1 });

    const excelData = products.map((product) => ({
      "Mã SP": product._id,
      "Tên sản phẩm": product.name,
      "Loại": product.category?.name || "",
      "Giá nhập": product.importPrice,
      "Giá bán": product.price,
      "Tồn kho": product.stock,
      "Mức tối thiểu": product.minStock,
      "Cảnh báo": product.stock <= product.minStock ? "Có" : "Không",
      "Mô tả": product.description || "",
    }));

    res.json({
      message: "Dữ liệu sẵn sàng để export Excel",
      data: excelData,
      total: excelData.length,
    });
  } catch (error) {
    console.error("Export products error:", error);
    res.status(500).json({ message: "Lỗi server khi export!" });
  }
});

module.exports = router;
