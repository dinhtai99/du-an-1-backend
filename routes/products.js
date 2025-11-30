// Import các thư viện và modules cần thiết
const express = require("express"); // Framework web server
const router = express.Router(); // Router để định nghĩa các routes
const Product = require("../models/Product"); // Model Product từ database
const { verifyToken } = require("../middleware/authMiddleware"); // Middleware xác thực JWT token

/**
 * 📦 Lấy danh sách sản phẩm
 * GET /api/products
 * Lấy danh sách sản phẩm với các filter, sort, và pagination
 * @query {String} search - Tìm kiếm theo tên sản phẩm (optional)
 * @query {String} category - Lọc theo danh mục (optional)
 * @query {Number} minPrice - Giá tối thiểu (optional)
 * @query {Number} maxPrice - Giá tối đa (optional)
 * @query {Number} status - Trạng thái (0=ẩn, 1=hiển thị) (optional, mặc định 1)
 * @query {Boolean} lowStock - Lọc sản phẩm tồn kho thấp (optional)
 * @query {Number} minRating - Đánh giá tối thiểu (optional)
 * @query {Boolean} isFeatured - Lọc sản phẩm nổi bật (optional)
 * @query {Boolean} isPromotion - Lọc sản phẩm khuyến mãi (optional)
 * @query {String} sortBy - Sắp xếp theo (price|rating|name|createdAt) (optional, mặc định createdAt)
 * @query {String} sortOrder - Thứ tự sắp xếp (asc|desc) (optional, mặc định desc)
 * @query {Number} page - Trang hiện tại (optional, mặc định 1)
 * @query {Number} limit - Số lượng mỗi trang (optional, mặc định 10)
 * @returns {Object} { products, total, page, limit, totalPages }
 */
router.get("/", async (req, res) => {
  try {
    // Lấy các query parameters từ request
    const { 
      search, // Tìm kiếm theo tên
      category, // Lọc theo danh mục
      minPrice, // Giá tối thiểu
      maxPrice, // Giá tối đa
      status, // Trạng thái (0=ẩn, 1=hiển thị)
      lowStock, // Lọc sản phẩm tồn kho thấp
      minRating, // Đánh giá tối thiểu
      isFeatured, // Sản phẩm nổi bật
      isPromotion, // Sản phẩm khuyến mãi
      sortBy = "createdAt", // Sắp xếp theo (mặc định createdAt)
      sortOrder = "desc", // Thứ tự sắp xếp (mặc định desc)
      page = 1, // Trang hiện tại (mặc định 1)
      limit = 10 // Số lượng mỗi trang (mặc định 10)
    } = req.query;
    
    // Khởi tạo query object để filter
    const query = {};

    // Tìm kiếm theo tên sản phẩm
    // $regex: Tìm kiếm không phân biệt hoa thường
    // $options: "i" = case insensitive
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // Lọc theo loại sản phẩm (category ID)
    if (category) {
      query.category = category;
    }

    // Lọc theo giá (minPrice <= price <= maxPrice)
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice); // $gte = greater than or equal
      if (maxPrice) query.price.$lte = parseFloat(maxPrice); // $lte = less than or equal
    }

    // Lọc theo status (0=ẩn, 1=hiển thị)
    if (status !== undefined) {
      query.status = parseInt(status);
    } else {
      // Mặc định chỉ hiển thị sản phẩm đang hoạt động cho customer
      // Admin có thể truyền status để xem tất cả
      query.status = 1;
    }

    // Lọc theo rating tối thiểu
    // $gte: rating >= minRating
    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }

    // Lọc sản phẩm nổi bật
    if (isFeatured === "true") {
      query.isFeatured = true;
    }

    // Lọc sản phẩm khuyến mãi
    if (isPromotion === "true") {
      query.isPromotion = true;
    }

    // Cảnh báo tồn kho thấp (chỉ cho admin)
    // $expr: Sử dụng aggregation expression
    // $lte: stock <= minStock
    if (lowStock === "true") {
      query.$expr = { $lte: ["$stock", "$minStock"] };
    }

    // Sắp xếp sản phẩm
    // 1 = tăng dần (asc), -1 = giảm dần (desc)
    const sortOptions = {};
    if (sortBy === "price") {
      sortOptions.price = sortOrder === "asc" ? 1 : -1;
    } else if (sortBy === "rating") {
      sortOptions.rating = sortOrder === "asc" ? 1 : -1;
    } else if (sortBy === "name") {
      sortOptions.name = sortOrder === "asc" ? 1 : -1;
    } else {
      // Mặc định sắp xếp theo createdAt
      sortOptions.createdAt = sortOrder === "asc" ? 1 : -1;
    }

    // Tính toán skip cho pagination
    // skip = (page - 1) * limit
    // Ví dụ: page=2, limit=10 → skip=10 (bỏ qua 10 items đầu)
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Tìm sản phẩm với các filter, sort, skip, limit
    // populate("category"): Lấy thông tin danh mục (chỉ lấy name và description)
    const products = await Product.find(query)
      .populate("category", "name description")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // Đếm tổng số sản phẩm thỏa mãn query (không phân trang)
    const total = await Product.countDocuments(query);

    // Đánh dấu sản phẩm tồn kho thấp
    // Thêm trường lowStockWarning vào mỗi sản phẩm
    const productsWithWarning = products.map((product) => {
      const productObj = product.toObject();
      // lowStockWarning = true nếu stock <= minStock
      productObj.lowStockWarning = product.stock <= product.minStock;
      return productObj;
    });

    // Trả về danh sách sản phẩm với pagination info
    res.json({
      products: productsWithWarning, // Danh sách sản phẩm (đã có lowStockWarning)
      total, // Tổng số sản phẩm thỏa mãn query
      page: parseInt(page), // Trang hiện tại
      limit: parseInt(limit), // Số lượng mỗi trang
      totalPages: Math.ceil(total / parseInt(limit)), // Tổng số trang
    });
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách sản phẩm!" });
  }
});

/**
 * 📦 Lấy chi tiết sản phẩm
 * GET /api/products/:id
 * Lấy thông tin chi tiết của một sản phẩm
 * @param {String} id - ID của sản phẩm
 * @returns {Object} Product object với lowStockWarning
 */
router.get("/:id", async (req, res) => {
  try {
    // Tìm sản phẩm theo ID
    // populate("category"): Lấy thông tin danh mục (chỉ lấy name và description)
    const product = await Product.findById(req.params.id).populate("category", "name description");
    
    // Kiểm tra sản phẩm có tồn tại không
    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm!" });
    }

    // Chuyển product sang object và thêm trường lowStockWarning
    const productObj = product.toObject();
    // lowStockWarning = true nếu stock <= minStock
    productObj.lowStockWarning = product.stock <= product.minStock;

    // Trả về thông tin sản phẩm
    res.json(productObj);
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

/**
 * ➕ Thêm sản phẩm mới
 * POST /api/products
 * Tạo sản phẩm mới (chỉ admin/staff)
 * @middleware verifyToken - Phải đăng nhập
 * @body {String} name - Tên sản phẩm (required)
 * @body {String} category - ID danh mục (required)
 * @body {Number} importPrice - Giá nhập (required)
 * @body {Number} price - Giá bán (required)
 * @body {Number} salePrice - Giá khuyến mãi (optional)
 * @body {Number} stock - Số lượng tồn kho (optional, mặc định 0)
 * @body {Number} minStock - Mức tồn kho tối thiểu (optional, mặc định 10)
 * @body {String} description - Mô tả (optional)
 * @body {Array} images - Mảng URL ảnh (optional)
 * @body {String} image - Ảnh chính (optional)
 * @body {Array} colors - Mảng màu sắc (optional)
 * @body {Array} sizes - Mảng kích thước (optional)
 * @body {Boolean} isFeatured - Sản phẩm nổi bật (optional)
 * @body {Boolean} isPromotion - Sản phẩm khuyến mãi (optional)
 * @returns {Object} { message, product }
 */
router.post("/", verifyToken, async (req, res) => {
  try {
    // Lấy thông tin từ request body
    const { name, category, importPrice, price, salePrice, stock, minStock, description, images, image, colors, sizes, isFeatured, isPromotion } = req.body;

    // Validate input: phải có đầy đủ thông tin bắt buộc
    if (!name || !category || !importPrice || !price) {
      return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin bắt buộc!" });
    }

    // Validate và parse các giá trị số
    // Giá nhập
    const parsedImportPrice = parseFloat(importPrice);
    if (isNaN(parsedImportPrice) || parsedImportPrice < 0) {
      return res.status(400).json({ message: "Giá nhập không hợp lệ!" });
    }
    
    // Giá bán
    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ message: "Giá bán không hợp lệ!" });
    }

    // Giá khuyến mãi (optional)
    const parsedSalePrice = salePrice ? parseFloat(salePrice) : undefined;
    if (parsedSalePrice !== undefined && (isNaN(parsedSalePrice) || parsedSalePrice < 0)) {
      return res.status(400).json({ message: "Giá khuyến mãi không hợp lệ!" });
    }

    // Số lượng tồn kho và mức tối thiểu
    const parsedStock = stock ? parseInt(stock) : 0;
    const parsedMinStock = minStock ? parseInt(minStock) : 10;

    // Tạo sản phẩm mới
    const newProduct = new Product({
      name, // Tên sản phẩm
      category, // ID danh mục
      importPrice: parsedImportPrice, // Giá nhập
      price: parsedPrice, // Giá bán
      salePrice: parsedSalePrice, // Giá khuyến mãi (optional)
      stock: isNaN(parsedStock) ? 0 : parsedStock, // Số lượng tồn kho (mặc định 0)
      minStock: isNaN(parsedMinStock) ? 10 : parsedMinStock, // Mức tối thiểu (mặc định 10)
      description: description || "", // Mô tả (mặc định chuỗi rỗng)
      images: images || [], // Mảng URL ảnh (mặc định mảng rỗng)
      // Ảnh chính: nếu có image thì dùng, không thì dùng ảnh đầu tiên trong images
      image: image || (images && images.length > 0 ? images[0] : ""),
      colors: colors || [], // Mảng màu sắc (mặc định mảng rỗng)
      sizes: sizes || [], // Mảng kích thước (mặc định mảng rỗng)
      isFeatured: isFeatured || false, // Sản phẩm nổi bật (mặc định false)
      isPromotion: isPromotion || false, // Sản phẩm khuyến mãi (mặc định false)
    });

    // Lưu sản phẩm vào database
    await newProduct.save();
    
    // Lấy lại sản phẩm với thông tin category đầy đủ
    const product = await Product.findById(newProduct._id).populate("category", "name description");

    // Trả về thông báo thành công và thông tin sản phẩm (status 201 = Created)
    res.status(201).json({
      message: "Thêm sản phẩm thành công!",
      product, // Sản phẩm đã tạo với thông tin category đầy đủ
    });
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({ message: "Lỗi server khi thêm sản phẩm!" });
  }
});

/**
 * ✏️ Cập nhật sản phẩm
 * PUT /api/products/:id
 * Cập nhật thông tin sản phẩm (chỉ admin/staff)
 * @middleware verifyToken - Phải đăng nhập
 * @param {String} id - ID của sản phẩm
 * @body {String} name - Tên sản phẩm (optional)
 * @body {String} category - ID danh mục (optional)
 * @body {Number} importPrice - Giá nhập (optional)
 * @body {Number} price - Giá bán (optional)
 * @body {Number} stock - Số lượng tồn kho (optional)
 * @body {Number} minStock - Mức tồn kho tối thiểu (optional)
 * @body {String} description - Mô tả (optional)
 * @body {Array} images - Mảng URL ảnh (optional)
 * @body {String} image - Ảnh chính (optional)
 * @body {Number} status - Trạng thái (0=ẩn, 1=hiển thị) (optional)
 * @returns {Object} { message, product }
 */
router.put("/:id", verifyToken, async (req, res) => {
  try {
    // Lấy thông tin từ request body (tất cả đều optional)
    const { name, category, importPrice, price, stock, minStock, description, images, image, status } = req.body;
    
    // Tìm sản phẩm theo ID
    const product = await Product.findById(req.params.id);

    // Kiểm tra sản phẩm có tồn tại không
    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm!" });
    }

    // Cập nhật các trường có trong request body
    // Chỉ cập nhật các trường được gửi lên (không cập nhật nếu undefined/null/empty string)
    if (name) product.name = name;
    if (category) product.category = category;
    
    // Cập nhật giá nhập (chỉ nếu có giá trị hợp lệ)
    if (importPrice !== undefined && importPrice !== null && importPrice !== '') {
      const parsedImportPrice = parseFloat(importPrice);
      if (!isNaN(parsedImportPrice)) {
        product.importPrice = parsedImportPrice;
      }
    }
    
    // Cập nhật giá bán (chỉ nếu có giá trị hợp lệ)
    if (price !== undefined && price !== null && price !== '') {
      const parsedPrice = parseFloat(price);
      if (!isNaN(parsedPrice)) {
        product.price = parsedPrice;
      }
    }
    
    // Cập nhật số lượng tồn kho (chỉ nếu có giá trị hợp lệ)
    if (stock !== undefined && stock !== null && stock !== '') {
      const parsedStock = parseInt(stock);
      if (!isNaN(parsedStock)) {
        product.stock = parsedStock;
      }
    }
    
    // Cập nhật mức tồn kho tối thiểu (chỉ nếu có giá trị hợp lệ)
    if (minStock !== undefined && minStock !== null && minStock !== '') {
      const parsedMinStock = parseInt(minStock);
      if (!isNaN(parsedMinStock)) {
        product.minStock = parsedMinStock;
      }
    }
    
    // Cập nhật các trường khác (cho phép set về rỗng/empty)
    if (description !== undefined) product.description = description;
    if (images !== undefined) product.images = images;
    if (image !== undefined) product.image = image;
    
    // Cập nhật status (chỉ nếu có giá trị hợp lệ)
    if (status !== undefined) {
      const parsedStatus = parseInt(status);
      if (!isNaN(parsedStatus)) {
        product.status = parsedStatus;
      }
    }

    // Lưu sản phẩm đã cập nhật vào database
    await product.save();
    
    // Lấy lại sản phẩm với thông tin category đầy đủ
    const updatedProduct = await Product.findById(product._id).populate("category", "name description");

    // Trả về thông báo thành công và thông tin sản phẩm đã cập nhật
    res.json({
      message: "Cập nhật sản phẩm thành công!",
      product: updatedProduct, // Sản phẩm đã cập nhật với thông tin category đầy đủ
    });
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({ message: "Lỗi server khi cập nhật sản phẩm!" });
  }
});

/**
 * 🗑️ Xóa sản phẩm (hoặc ẩn)
 * DELETE /api/products/:id
 * Xóa hoặc ẩn sản phẩm (chỉ admin/staff)
 * @middleware verifyToken - Phải đăng nhập
 * @param {String} id - ID của sản phẩm
 * @query {Boolean} hardDelete - Nếu true thì xóa vĩnh viễn, không thì chỉ ẩn (optional)
 * @returns {Object} { message }
 */
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    // Lấy query parameter hardDelete
    // hardDelete=true: Xóa vĩnh viễn khỏi database
    // hardDelete=false hoặc không có: Chỉ ẩn sản phẩm (set status = 0)
    const { hardDelete } = req.query;
    
    // Tìm sản phẩm theo ID
    const product = await Product.findById(req.params.id);

    // Kiểm tra sản phẩm có tồn tại không
    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm!" });
    }

    if (hardDelete === "true") {
      // Xóa vĩnh viễn khỏi database
      await Product.findByIdAndDelete(req.params.id);
      res.json({ message: "Xóa sản phẩm thành công!" });
    } else {
      // Chỉ ẩn sản phẩm (soft delete)
      // Set status = 0 để ẩn sản phẩm, không xóa khỏi database
      product.status = 0;
      await product.save();
      res.json({ message: "Ẩn sản phẩm thành công!" });
    }
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({ message: "Lỗi server khi xóa sản phẩm!" });
  }
});

/**
 * 📊 Lấy sản phẩm tồn kho thấp
 * GET /api/products/low-stock/all
 * Lấy danh sách sản phẩm có tồn kho <= minStock (chỉ admin/staff)
 * @middleware verifyToken - Phải đăng nhập
 * @returns {Array} Danh sách sản phẩm tồn kho thấp
 */
router.get("/low-stock/all", verifyToken, async (req, res) => {
  try {
    // Tìm sản phẩm có tồn kho thấp
    // $expr: Sử dụng aggregation expression
    // $lte: stock <= minStock
    // status: 1 (chỉ lấy sản phẩm đang hoạt động)
    const products = await Product.find({
      $expr: { $lte: ["$stock", "$minStock"] }, // stock <= minStock
      status: 1, // Chỉ sản phẩm đang hoạt động
    })
      .populate("category", "name") // Lấy thông tin danh mục (chỉ name)
      .sort({ stock: 1 }); // Sắp xếp theo stock tăng dần (sản phẩm ít nhất trước)

    // Trả về danh sách sản phẩm tồn kho thấp
    res.json(products);
  } catch (error) {
    console.error("Get low stock products error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

/**
 * 📤 Export Excel (trả về JSON, frontend sẽ xử lý export)
 * GET /api/products/export/excel
 * Lấy dữ liệu sản phẩm dạng JSON để export Excel (chỉ admin/staff)
 * @middleware verifyToken - Phải đăng nhập
 * @returns {Object} { message, data, total }
 */
router.get("/export/excel", verifyToken, async (req, res) => {
  try {
    // Lấy tất cả sản phẩm đang hoạt động (status = 1)
    // populate("category"): Lấy thông tin danh mục (chỉ name)
    // sort({ name: 1 }): Sắp xếp theo tên tăng dần
    const products = await Product.find({ status: 1 })
      .populate("category", "name")
      .sort({ name: 1 });

    // Chuyển đổi dữ liệu sang format Excel
    // Mỗi sản phẩm được chuyển thành object với các cột Excel
    const excelData = products.map((product) => ({
      "Mã SP": product._id, // ID sản phẩm
      "Tên sản phẩm": product.name, // Tên sản phẩm
      "Loại": product.category?.name || "", // Tên danh mục (nếu có)
      "Giá nhập": product.importPrice, // Giá nhập
      "Giá bán": product.price, // Giá bán
      "Tồn kho": product.stock, // Số lượng tồn kho
      "Mức tối thiểu": product.minStock, // Mức tồn kho tối thiểu
      "Cảnh báo": product.stock <= product.minStock ? "Có" : "Không", // Cảnh báo tồn kho thấp
      "Mô tả": product.description || "", // Mô tả sản phẩm
    }));

    // Trả về dữ liệu JSON để frontend export Excel
    res.json({
      message: "Dữ liệu sẵn sàng để export Excel",
      data: excelData, // Dữ liệu đã format cho Excel
      total: excelData.length, // Tổng số sản phẩm
    });
  } catch (error) {
    console.error("Export products error:", error);
    res.status(500).json({ message: "Lỗi server khi export!" });
  }
});

module.exports = router;
