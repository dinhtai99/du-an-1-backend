const express = require("express");
const router = express.Router();
const Favorite = require("../models/Favorite");
const Product = require("../models/Product");
const { verifyToken } = require("../middleware/authMiddleware");

// ❤️ Lấy danh sách sản phẩm yêu thích
router.get("/", verifyToken, async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.user.userId })
      .populate("product")
      .sort({ createdAt: -1 });

    res.json(favorites.map(fav => fav.product));
  } catch (error) {
    console.error("Get favorites error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// ❤️ Kiểm tra sản phẩm đã yêu thích chưa
router.get("/check/:productId", verifyToken, async (req, res) => {
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

// ➕ Thêm vào yêu thích
router.post("/:productId", verifyToken, async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm!" });
    }

    const existingFavorite = await Favorite.findOne({
      user: req.user.userId,
      product: req.params.productId,
    });

    if (existingFavorite) {
      return res.status(400).json({ message: "Sản phẩm đã có trong danh sách yêu thích!" });
    }

    const favorite = new Favorite({
      user: req.user.userId,
      product: req.params.productId,
    });

    await favorite.save();
    await favorite.populate("product");

    res.status(201).json({
      message: "Đã thêm vào yêu thích!",
      favorite,
    });
  } catch (error) {
    console.error("Add favorite error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Sản phẩm đã có trong danh sách yêu thích!" });
    }
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 🗑️ Xóa khỏi yêu thích
router.delete("/:productId", verifyToken, async (req, res) => {
  try {
    const favorite = await Favorite.findOneAndDelete({
      user: req.user.userId,
      product: req.params.productId,
    });

    if (!favorite) {
      return res.status(404).json({ message: "Sản phẩm không có trong danh sách yêu thích!" });
    }

    res.json({ message: "Đã xóa khỏi yêu thích!" });
  } catch (error) {
    console.error("Remove favorite error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

module.exports = router;

