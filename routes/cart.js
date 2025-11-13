const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { verifyToken } = require("../middleware/authMiddleware");

// 🛒 Lấy giỏ hàng
router.get("/", verifyToken, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.userId }).populate("items.product");
    
    if (!cart) {
      cart = new Cart({ user: req.user.userId, items: [] });
      await cart.save();
    }

    // Tính tổng tiền
    let total = 0;
    cart.items.forEach(item => {
      total += item.subtotal || (item.price * item.quantity);
    });

    res.json({
      cart,
      total,
    });
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// ➕ Thêm sản phẩm vào giỏ hàng
router.post("/", verifyToken, async (req, res) => {
  try {
    const { productId, quantity, color, size } = req.body;

    if (!productId || !quantity) {
      return res.status(400).json({ message: "Vui lòng chọn sản phẩm và số lượng!" });
    }

    const product = await Product.findById(productId);
    if (!product || product.status === 0) {
      return res.status(404).json({ message: "Sản phẩm không tồn tại hoặc đã bị ẩn!" });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ message: `Sản phẩm chỉ còn ${product.stock} sản phẩm trong kho!` });
    }

    let cart = await Cart.findOne({ user: req.user.userId });
    
    if (!cart) {
      cart = new Cart({ user: req.user.userId, items: [] });
    }

    // Kiểm tra sản phẩm đã có trong giỏ chưa (cùng màu và size)
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId && 
      item.color === color && 
      item.size === size
    );

    const price = product.salePrice || product.price;

    if (existingItemIndex >= 0) {
      // Cập nhật số lượng
      cart.items[existingItemIndex].quantity += quantity;
      cart.items[existingItemIndex].price = price;
    } else {
      // Thêm mới
      cart.items.push({
        product: productId,
        quantity,
        color: color || "",
        size: size || "",
        price,
      });
    }

    await cart.save();
    await cart.populate("items.product");

    res.json({
      message: "Thêm vào giỏ hàng thành công!",
      cart,
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// ✏️ Cập nhật số lượng sản phẩm trong giỏ
router.put("/:itemId", verifyToken, async (req, res) => {
  try {
    const { quantity } = req.body;
    const cart = await Cart.findOne({ user: req.user.userId });

    if (!cart) {
      return res.status(404).json({ message: "Giỏ hàng trống!" });
    }

    const item = cart.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm trong giỏ!" });
    }

    if (quantity <= 0) {
      return res.status(400).json({ message: "Số lượng phải lớn hơn 0!" });
    }

    const product = await Product.findById(item.product);
    if (product.stock < quantity) {
      return res.status(400).json({ message: `Sản phẩm chỉ còn ${product.stock} sản phẩm trong kho!` });
    }

    item.quantity = quantity;
    await cart.save();
    await cart.populate("items.product");

    res.json({
      message: "Cập nhật giỏ hàng thành công!",
      cart,
    });
  } catch (error) {
    console.error("Update cart error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 🗑️ Xóa sản phẩm khỏi giỏ
router.delete("/:itemId", verifyToken, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.userId });

    if (!cart) {
      return res.status(404).json({ message: "Giỏ hàng trống!" });
    }

    cart.items.pull(req.params.itemId);
    await cart.save();
    await cart.populate("items.product");

    res.json({
      message: "Xóa sản phẩm khỏi giỏ hàng thành công!",
      cart,
    });
  } catch (error) {
    console.error("Remove from cart error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 🗑️ Xóa toàn bộ giỏ hàng
router.delete("/", verifyToken, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.userId });
    
    if (cart) {
      cart.items = [];
      await cart.save();
    }

    res.json({ message: "Đã xóa toàn bộ giỏ hàng!" });
  } catch (error) {
    console.error("Clear cart error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

module.exports = router;

