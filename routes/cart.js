// Import các thư viện và modules cần thiết
const express = require("express"); // Framework web server
const router = express.Router(); // Router để định nghĩa các routes
const Cart = require("../models/Cart"); // Model Cart từ database
const Product = require("../models/Product"); // Model Product từ database
const { verifyToken, requireCustomer } = require("../middleware/authMiddleware"); // Middleware xác thực và phân quyền

/**
 * 🛒 Lấy giỏ hàng (chỉ customer)
 * GET /api/cart
 * Lấy thông tin giỏ hàng của user đang đăng nhập
 * @middleware verifyToken - Phải đăng nhập
 * @middleware requireCustomer - Chỉ customer mới được truy cập
 * @returns {Object} { cart, total }
 */
router.get("/", verifyToken, requireCustomer, async (req, res) => {
  try {
    // Tìm giỏ hàng của user đang đăng nhập
    // populate("items.product"): Lấy thông tin chi tiết của từng sản phẩm trong giỏ hàng
    let cart = await Cart.findOne({ user: req.user.userId }).populate("items.product");
    
    // Nếu chưa có giỏ hàng, tạo mới với items rỗng
    if (!cart) {
      cart = new Cart({ user: req.user.userId, items: [] });
      await cart.save();
    }

    // Tính tổng tiền của giỏ hàng
    // Duyệt qua từng item và cộng dồn subtotal (hoặc price * quantity nếu không có subtotal)
    let total = 0;
    cart.items.forEach(item => {
      total += item.subtotal || (item.price * item.quantity);
    });

    // Trả về giỏ hàng và tổng tiền
    res.json({
      cart, // Giỏ hàng với thông tin sản phẩm đầy đủ
      total, // Tổng tiền của giỏ hàng
    });
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

/**
 * ➕ Thêm sản phẩm vào giỏ hàng (chỉ customer)
 * POST /api/cart
 * Thêm sản phẩm vào giỏ hàng của user đang đăng nhập
 * @middleware verifyToken - Phải đăng nhập
 * @middleware requireCustomer - Chỉ customer mới được truy cập
 * @body {String} productId - ID sản phẩm
 * @body {Number} quantity - Số lượng
 * @body {String} color - Màu sắc (optional)
 * @body {String} size - Kích thước (optional)
 * @returns {Object} { message, cart }
 */
router.post("/", verifyToken, requireCustomer, async (req, res) => {
  try {
    // Lấy thông tin từ request body
    const { productId, quantity, color, size } = req.body;

    // Validate input: phải có productId và quantity
    if (!productId || !quantity) {
      return res.status(400).json({ message: "Vui lòng chọn sản phẩm và số lượng!" });
    }

    // Tìm sản phẩm trong database
    const product = await Product.findById(productId);
    
    // Kiểm tra sản phẩm có tồn tại và đang hoạt động không
    if (!product || product.status === 0) {
      return res.status(404).json({ message: "Sản phẩm không tồn tại hoặc đã bị ẩn!" });
    }

    // Kiểm tra tồn kho: số lượng yêu cầu không được vượt quá số lượng trong kho
    if (product.stock < quantity) {
      return res.status(400).json({ message: `Sản phẩm chỉ còn ${product.stock} sản phẩm trong kho!` });
    }

    // Tìm giỏ hàng của user
    let cart = await Cart.findOne({ user: req.user.userId });
    
    // Nếu chưa có giỏ hàng, tạo mới
    if (!cart) {
      cart = new Cart({ user: req.user.userId, items: [] });
    }

    // Kiểm tra sản phẩm đã có trong giỏ chưa (cùng productId, màu và size)
    // Nếu đã có, chỉ cập nhật số lượng; nếu chưa có, thêm mới
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId && 
      item.color === color && 
      item.size === size
    );

    // Lấy giá bán (ưu tiên salePrice nếu có, không thì dùng price)
    const price = product.salePrice || product.price;

    if (existingItemIndex >= 0) {
      // Sản phẩm đã có trong giỏ → Cập nhật số lượng và giá
      cart.items[existingItemIndex].quantity += quantity;
      cart.items[existingItemIndex].price = price; // Cập nhật giá mới nhất
    } else {
      // Sản phẩm chưa có trong giỏ → Thêm mới
      cart.items.push({
        product: productId,
        quantity,
        color: color || "", // Màu sắc (optional)
        size: size || "", // Kích thước (optional)
        price, // Giá tại thời điểm thêm vào giỏ
      });
    }

    // Lưu giỏ hàng vào database
    await cart.save();
    
    // Populate thông tin sản phẩm để trả về đầy đủ
    await cart.populate("items.product");

    // Trả về thông báo thành công và giỏ hàng đã cập nhật
    res.json({
      message: "Thêm vào giỏ hàng thành công!",
      cart, // Giỏ hàng với thông tin sản phẩm đầy đủ
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

/**
 * ✏️ Cập nhật số lượng sản phẩm trong giỏ (chỉ customer)
 * PUT /api/cart/:itemId
 * Cập nhật số lượng của một sản phẩm trong giỏ hàng
 * @middleware verifyToken - Phải đăng nhập
 * @middleware requireCustomer - Chỉ customer mới được truy cập
 * @param {String} itemId - ID của item trong giỏ hàng
 * @body {Number} quantity - Số lượng mới
 * @returns {Object} { message, cart }
 */
router.put("/:itemId", verifyToken, requireCustomer, async (req, res) => {
  try {
    // Lấy số lượng mới từ request body
    const { quantity } = req.body;
    
    // Tìm giỏ hàng của user
    const cart = await Cart.findOne({ user: req.user.userId });

    // Kiểm tra giỏ hàng có tồn tại không
    if (!cart) {
      return res.status(404).json({ message: "Giỏ hàng trống!" });
    }

    // Tìm item trong giỏ hàng theo itemId
    const item = cart.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm trong giỏ!" });
    }

    // Validate: số lượng phải lớn hơn 0
    if (quantity <= 0) {
      return res.status(400).json({ message: "Số lượng phải lớn hơn 0!" });
    }

    // Kiểm tra tồn kho: số lượng mới không được vượt quá số lượng trong kho
    const product = await Product.findById(item.product);
    if (product.stock < quantity) {
      return res.status(400).json({ message: `Sản phẩm chỉ còn ${product.stock} sản phẩm trong kho!` });
    }

    // Cập nhật số lượng
    item.quantity = quantity;
    
    // Lưu giỏ hàng vào database
    await cart.save();
    
    // Populate thông tin sản phẩm để trả về đầy đủ
    await cart.populate("items.product");

    // Trả về thông báo thành công và giỏ hàng đã cập nhật
    res.json({
      message: "Cập nhật giỏ hàng thành công!",
      cart, // Giỏ hàng với thông tin sản phẩm đầy đủ
    });
  } catch (error) {
    console.error("Update cart error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

/**
 * 🗑️ Xóa sản phẩm khỏi giỏ (chỉ customer)
 * DELETE /api/cart/:itemId
 * Xóa một sản phẩm khỏi giỏ hàng
 * @middleware verifyToken - Phải đăng nhập
 * @middleware requireCustomer - Chỉ customer mới được truy cập
 * @param {String} itemId - ID của item trong giỏ hàng
 * @returns {Object} { message, cart }
 */
router.delete("/:itemId", verifyToken, requireCustomer, async (req, res) => {
  try {
    // Tìm giỏ hàng của user
    const cart = await Cart.findOne({ user: req.user.userId });

    // Kiểm tra giỏ hàng có tồn tại không
    if (!cart) {
      return res.status(404).json({ message: "Giỏ hàng trống!" });
    }

    // Xóa item khỏi giỏ hàng bằng pull() method của Mongoose
    // pull() sẽ tìm và xóa item có _id = itemId
    cart.items.pull(req.params.itemId);
    
    // Lưu giỏ hàng vào database
    await cart.save();
    
    // Populate thông tin sản phẩm để trả về đầy đủ
    await cart.populate("items.product");

    // Trả về thông báo thành công và giỏ hàng đã cập nhật
    res.json({
      message: "Xóa sản phẩm khỏi giỏ hàng thành công!",
      cart, // Giỏ hàng với thông tin sản phẩm đầy đủ
    });
  } catch (error) {
    console.error("Remove from cart error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

/**
 * 🗑️ Xóa toàn bộ giỏ hàng (chỉ customer)
 * DELETE /api/cart
 * Xóa tất cả sản phẩm khỏi giỏ hàng
 * @middleware verifyToken - Phải đăng nhập
 * @middleware requireCustomer - Chỉ customer mới được truy cập
 * @returns {Object} { message }
 */
router.delete("/", verifyToken, requireCustomer, async (req, res) => {
  try {
    // Tìm giỏ hàng của user
    const cart = await Cart.findOne({ user: req.user.userId });
    
    // Nếu có giỏ hàng, xóa tất cả items (đặt items = [])
    if (cart) {
      cart.items = []; // Xóa tất cả items
      await cart.save(); // Lưu vào database
    }

    // Trả về thông báo thành công
    res.json({ message: "Đã xóa toàn bộ giỏ hàng!" });
  } catch (error) {
    console.error("Clear cart error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

module.exports = router;

