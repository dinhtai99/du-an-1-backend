// Import các thư viện và modules cần thiết
const express = require("express"); // Framework web server
const router = express.Router(); // Router để định nghĩa các routes
const Order = require("../models/Order"); // Model Order từ database
const Cart = require("../models/Cart"); // Model Cart từ database
const Product = require("../models/Product"); // Model Product từ database
const Voucher = require("../models/Voucher"); // Model Voucher từ database
const Notification = require("../models/Notification"); // Model Notification từ database
const { verifyToken, requireAdmin, requireAdminOrStaff, requireCustomer } = require("../middleware/authMiddleware"); // Middleware xác thực và phân quyền

/**
 * 📦 Lấy danh sách đơn hàng (Admin/Staff: tất cả, Customer: chỉ của mình)
 * GET /api/orders
 * Lấy danh sách đơn hàng với filter, sort, và pagination
 * @middleware verifyToken - Phải đăng nhập
 * @query {String} status - Lọc theo trạng thái (new|processing|shipping|completed|cancelled) (optional)
 * @query {String} startDate - Ngày bắt đầu (YYYY-MM-DD) (optional)
 * @query {String} endDate - Ngày kết thúc (YYYY-MM-DD) (optional)
 * @query {Number} page - Trang hiện tại (optional, mặc định 1)
 * @query {Number} limit - Số lượng mỗi trang (optional, mặc định 10)
 * @returns {Object} { orders, total, page, limit, totalPages }
 */
router.get("/", verifyToken, async (req, res) => {
  try {
    // Lấy các query parameters từ request
    const { status, startDate, endDate, page = 1, limit = 10 } = req.query;
    
    // Khởi tạo query object để filter
    const query = {};

    // Customer chỉ xem đơn hàng của mình
    // Admin/Staff có thể xem tất cả đơn hàng
    if (req.user.role === "customer") {
      query.customer = req.user.userId;
    }

    // Lọc theo trạng thái đơn hàng
    // new|processing|shipping|completed|cancelled
    if (status) {
      query.status = status;
    }

    // Lọc theo ngày tạo đơn hàng
    if (startDate || endDate) {
      query.createdAt = {};
      // $gte: greater than or equal (từ ngày bắt đầu)
      if (startDate) query.createdAt.$gte = new Date(startDate);
      // $lte: less than or equal (đến ngày kết thúc)
      if (endDate) {
        const end = new Date(endDate);
        // Set thời gian cuối ngày (23:59:59.999) để bao gồm cả ngày đó
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    // Tính toán skip cho pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Tìm đơn hàng với các filter, sort, skip, limit
    // populate(): Lấy thông tin chi tiết của customer, shipper, items.product
    const orders = await Order.find(query)
      .populate("customer", "fullName email phone") // Thông tin khách hàng
      .populate("shipper", "fullName") // Thông tin shipper
      .populate("items.product", "name image price") // Thông tin sản phẩm trong đơn
      .sort({ createdAt: -1 }) // Sắp xếp theo ngày tạo giảm dần (mới nhất trước)
      .skip(skip)
      .limit(parseInt(limit));

    // Đếm tổng số đơn hàng thỏa mãn query (không phân trang)
    const total = await Order.countDocuments(query);

    // Trả về danh sách đơn hàng với pagination info
    res.json({
      orders, // Danh sách đơn hàng
      total, // Tổng số đơn hàng thỏa mãn query
      page: parseInt(page), // Trang hiện tại
      limit: parseInt(limit), // Số lượng mỗi trang
      totalPages: Math.ceil(total / parseInt(limit)), // Tổng số trang
    });
  } catch (error) {
    console.error("Get orders error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

/**
 * 📦 Lấy chi tiết đơn hàng
 * GET /api/orders/:id
 * Lấy thông tin chi tiết của một đơn hàng
 * @middleware verifyToken - Phải đăng nhập
 * @param {String} id - ID của đơn hàng
 * @returns {Object} Order object với đầy đủ thông tin
 */
router.get("/:id", verifyToken, async (req, res) => {
  try {
    // Tìm đơn hàng theo ID với đầy đủ thông tin
    // populate(): Lấy thông tin chi tiết của các reference fields
    const order = await Order.findById(req.params.id)
      .populate("customer", "fullName email phone") // Thông tin khách hàng
      .populate("shipper", "fullName") // Thông tin shipper
      .populate("items.product", "name image price category") // Thông tin sản phẩm
      .populate("voucher", "code name type value") // Thông tin voucher
      .populate("timeline.updatedBy", "fullName role"); // Thông tin người cập nhật timeline

    // Kiểm tra đơn hàng có tồn tại không
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng!" });
    }

    // Customer chỉ xem đơn hàng của mình
    // Admin/Staff có thể xem tất cả đơn hàng
    if (req.user.role === "customer" && order.customer._id.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Không có quyền xem đơn hàng này!" });
    }

    // Trả về thông tin đơn hàng đầy đủ
    res.json(order);
  } catch (error) {
    console.error("Get order error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

/**
 * 📋 Lấy timeline đơn hàng
 * GET /api/orders/:id/timeline
 * Lấy lịch sử cập nhật trạng thái đơn hàng
 * @middleware verifyToken - Phải đăng nhập
 * @param {String} id - ID của đơn hàng
 * @returns {Object} { orderNumber, currentStatus, timeline }
 */
router.get("/:id/timeline", verifyToken, async (req, res) => {
  try {
    // Tìm đơn hàng theo ID, chỉ lấy timeline, orderNumber, status
    // populate("timeline.updatedBy"): Lấy thông tin người cập nhật trong timeline
    const order = await Order.findById(req.params.id)
      .populate("timeline.updatedBy", "fullName role")
      .select("timeline orderNumber status"); // Chỉ lấy các trường cần thiết

    // Kiểm tra đơn hàng có tồn tại không
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng!" });
    }

    // Customer chỉ xem đơn hàng của mình
    // Admin/Staff có thể xem tất cả đơn hàng
    if (req.user.role === "customer") {
      // Lấy thông tin customer để kiểm tra quyền
      const orderFull = await Order.findById(req.params.id).select("customer");
      if (orderFull.customer.toString() !== req.user.userId) {
        return res.status(403).json({ message: "Không có quyền xem đơn hàng này!" });
      }
    }

    // Trả về timeline đơn hàng
    res.json({
      orderNumber: order.orderNumber, // Mã đơn hàng
      currentStatus: order.status, // Trạng thái hiện tại
      timeline: order.timeline || [], // Lịch sử cập nhật
    });
  } catch (error) {
    console.error("Get order timeline error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

/**
 * ➕ Tạo đơn hàng từ giỏ hàng (chỉ customer)
 * POST /api/orders
 * Tạo đơn hàng mới từ giỏ hàng của customer
 * @middleware verifyToken - Phải đăng nhập
 * @middleware requireCustomer - Chỉ customer mới được truy cập
 * @body {Object} shippingAddress - Địa chỉ giao hàng (required)
 * @body {String} shippingAddress.fullName - Họ tên người nhận (required)
 * @body {String} shippingAddress.phone - Số điện thoại (required)
 * @body {String} shippingAddress.address - Địa chỉ chi tiết (required)
 * @body {String} shippingAddress.city - Tỉnh/Thành phố (required)
 * @body {String} paymentMethod - Phương thức thanh toán (COD|zalopay|momo|vnpay) (optional, mặc định COD)
 * @body {String} notes - Ghi chú (optional)
 * @body {String} voucherCode - Mã voucher (optional)
 * @returns {Object} { message, order }
 */
router.post("/", verifyToken, requireCustomer, async (req, res) => {
  try {
    // Lấy thông tin từ request body
    const { shippingAddress, paymentMethod, notes, voucherCode } = req.body;

    // Validate địa chỉ giao hàng: phải có đầy đủ thông tin bắt buộc
    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.address || !shippingAddress.city) {
      return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin địa chỉ giao hàng!" });
    }

    // Lấy giỏ hàng của user đang đăng nhập
    // populate("items.product"): Lấy thông tin chi tiết của từng sản phẩm trong giỏ
    const cart = await Cart.findOne({ user: req.user.userId }).populate("items.product");
    
    // Kiểm tra giỏ hàng có tồn tại và có sản phẩm không
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Giỏ hàng trống!" });
    }

    // Kiểm tra tồn kho và tính toán tổng tiền
    let subtotal = 0; // Tổng tiền trước giảm giá
    const orderItems = []; // Danh sách sản phẩm trong đơn hàng
    const productIds = []; // Danh sách ID sản phẩm (để kiểm tra voucher)

    // Duyệt qua từng sản phẩm trong giỏ hàng
    for (const item of cart.items) {
      const product = item.product;
      
      // Kiểm tra sản phẩm có đang hoạt động không
      if (product.status === 0) {
        return res.status(400).json({ message: `Sản phẩm ${product.name} đã bị ẩn!` });
      }

      // Kiểm tra tồn kho: số lượng yêu cầu không được vượt quá số lượng trong kho
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Sản phẩm ${product.name} chỉ còn ${product.stock} sản phẩm trong kho!` 
        });
      }

      // Lấy giá bán (ưu tiên salePrice nếu có, không thì dùng price)
      const price = product.salePrice || product.price;
      const itemSubtotal = price * item.quantity; // Tổng tiền của item này

      // Thêm vào danh sách items của đơn hàng
      orderItems.push({
        product: product._id, // ID sản phẩm
        quantity: item.quantity, // Số lượng
        color: item.color || "", // Màu sắc
        size: item.size || "", // Kích thước
        price, // Giá tại thời điểm đặt hàng
        discount: 0, // Giảm giá cho item này (0 nếu không có)
        subtotal: itemSubtotal, // Tổng tiền của item này
      });

      // Cộng dồn vào subtotal
      subtotal += itemSubtotal;
      // Lưu ID sản phẩm để kiểm tra voucher sau
      productIds.push(product._id);
    }

    // Tính phí vận chuyển (có thể tính theo khoảng cách)
    // TODO: Có thể tính phí vận chuyển dựa trên khoảng cách từ shop đến địa chỉ giao hàng
    const shippingFee = 30000; // Mặc định 30,000 VNĐ

    // Xử lý voucher nếu có
    let voucher = null; // Voucher object
    let voucherDiscount = 0; // Số tiền giảm từ voucher
    let voucherCodeUsed = null; // Mã voucher đã sử dụng

    if (voucherCode) {
      // Tìm voucher theo code (chuyển thành chữ hoa)
      voucher = await Voucher.findOne({ code: voucherCode.toUpperCase() })
        .populate("applicableProducts", "name category") // Sản phẩm áp dụng
        .populate("applicableCategories", "name"); // Danh mục áp dụng

      // Kiểm tra voucher có tồn tại không
      if (!voucher) {
        return res.status(400).json({ message: "Mã voucher không tồn tại!" });
      }

      // Kiểm tra voucher hợp lệ
      const now = new Date();
      
      // Kiểm tra status: voucher phải đang hoạt động (status = 1)
      if (voucher.status === 0) {
        return res.status(400).json({ message: "Voucher đã bị vô hiệu hóa!" });
      }
      
      // Kiểm tra số lần sử dụng: usedCount < quantity
      if (voucher.usedCount >= voucher.quantity) {
        return res.status(400).json({ message: "Voucher đã hết lượt sử dụng!" });
      }
      
      // Kiểm tra thời gian hiệu lực: now phải nằm trong khoảng [startDate, endDate]
      if (now < voucher.startDate || now > voucher.endDate) {
        return res.status(400).json({ message: "Voucher không còn hiệu lực!" });
      }
      
      // Kiểm tra đơn hàng tối thiểu: subtotal >= minOrderValue
      if (subtotal < voucher.minOrderValue) {
        return res.status(400).json({ 
          message: `Đơn hàng tối thiểu ${voucher.minOrderValue.toLocaleString()} VNĐ để sử dụng voucher này!` 
        });
      }

      // Kiểm tra user được áp dụng
      // Nếu applicableUsers có giá trị, user phải nằm trong danh sách
      if (voucher.applicableUsers.length > 0) {
        const isApplicable = voucher.applicableUsers.some(
          id => id.toString() === req.user.userId.toString()
        );
        if (!isApplicable) {
          return res.status(400).json({ message: "Bạn không được sử dụng voucher này!" });
        }
      }

      // Kiểm tra sản phẩm áp dụng
      // Nếu applicableProducts có giá trị, ít nhất 1 sản phẩm trong giỏ phải nằm trong danh sách
      if (voucher.applicableProducts.length > 0) {
        const applicable = productIds.some(productId => 
          voucher.applicableProducts.some(p => p._id.toString() === productId.toString())
        );
        if (!applicable) {
          return res.status(400).json({ message: "Voucher không áp dụng cho sản phẩm trong giỏ hàng!" });
        }
      }

      // Tính toán giảm giá từ voucher
      if (voucher.type === "percentage") {
        // Giảm theo phần trăm: voucherDiscount = subtotal * value / 100
        voucherDiscount = (subtotal * voucher.value) / 100;
        // Nếu có maxDiscount, không được vượt quá
        if (voucher.maxDiscount && voucherDiscount > voucher.maxDiscount) {
          voucherDiscount = voucher.maxDiscount;
        }
      } else {
        // Giảm số tiền cố định: voucherDiscount = value
        voucherDiscount = voucher.value;
      }

      // Lưu mã voucher đã sử dụng
      voucherCodeUsed = voucher.code;
    }

    // Tính tổng tiền cuối cùng
    // total = subtotal + shippingFee - voucherDiscount
    const total = subtotal + shippingFee - voucherDiscount;

    // Xử lý paymentMethod: cash và COD đều là thanh toán tiền mặt
    // Chuyển cash thành COD để thống nhất
    let finalPaymentMethod = paymentMethod || "COD";
    if (finalPaymentMethod === "cash") {
      finalPaymentMethod = "COD"; // Chuyển cash thành COD để thống nhất
    }

    // Nếu là ZaloPay, không tạo đơn hàng ở đây
    // Phải sử dụng endpoint /api/payment/zalopay/create để tạo đơn và thanh toán
    if (finalPaymentMethod === "zalopay") {
      return res.status(400).json({ 
        message: "Vui lòng sử dụng endpoint /api/payment/zalopay/create để thanh toán ZaloPay!",
        redirectTo: "/api/payment/zalopay/create"
      });
    }

    // Nếu là MoMo, không tạo đơn hàng ở đây
    // Phải sử dụng endpoint /api/payment/momo/create để tạo đơn và thanh toán
    if (finalPaymentMethod === "momo") {
      return res.status(400).json({ 
        message: "Vui lòng sử dụng endpoint /api/payment/momo/create để thanh toán MoMo!",
        redirectTo: "/api/payment/momo/create"
      });
    }

    // Tạo đơn hàng mới
    // Với COD/cash: paymentStatus = "pending" (chờ thanh toán khi nhận hàng)
    // Với online payment (vnpay): paymentStatus sẽ được cập nhật sau khi thanh toán thành công
    const order = new Order({
      customer: req.user.userId, // ID khách hàng
      shippingAddress, // Địa chỉ giao hàng
      items: orderItems, // Danh sách sản phẩm
      subtotal, // Tổng tiền trước giảm giá
      shippingFee, // Phí vận chuyển
      discount: 0, // Giảm giá tổng (0 nếu không có)
      voucher: voucher ? voucher._id : null, // ID voucher (nếu có)
      voucherCode: voucherCodeUsed, // Mã voucher đã sử dụng
      voucherDiscount, // Số tiền giảm từ voucher
      total: total > 0 ? total : 0, // Tổng tiền cuối cùng (đảm bảo >= 0)
      paymentMethod: finalPaymentMethod, // Phương thức thanh toán
      paymentStatus: "pending", // Trạng thái thanh toán (pending = chờ thanh toán)
      status: "new", // Trạng thái đơn hàng (new = mới tạo)
      notes: notes || "", // Ghi chú
      timeline: [{
        status: "new", // Trạng thái
        message: "Đơn hàng đã được tạo", // Thông báo
        updatedBy: req.user.userId, // Người tạo
      }],
    });

    // Lưu đơn hàng vào database
    await order.save();

    // Tăng số lần sử dụng voucher (nếu có)
    if (voucher) {
      voucher.usedCount += 1;
      await voucher.save();
    }

    // Xóa giỏ hàng sau khi tạo đơn hàng thành công
    cart.items = [];
    await cart.save();

    // Tạo thông báo cho customer
    await Notification.create({
      user: req.user.userId, // User nhận thông báo
      type: "order", // Loại thông báo
      title: "Đặt hàng thành công", // Tiêu đề
      message: `Đơn hàng ${order.orderNumber} đã được tạo thành công!`, // Nội dung
      link: `/orders/${order._id}`, // Link đến đơn hàng
    });

    // Populate thông tin chi tiết để trả về
    await order.populate("items.product", "name image price");
    await order.populate("timeline.updatedBy", "fullName");

    // Trả về thông báo thành công và thông tin đơn hàng (status 201 = Created)
    res.status(201).json({
      message: "Đặt hàng thành công!",
      order, // Đơn hàng đã tạo với thông tin đầy đủ
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

/**
 * ✏️ Cập nhật trạng thái đơn hàng (Admin/Staff)
 * PUT /api/orders/:id/status
 * Cập nhật trạng thái đơn hàng (new|processing|shipping|completed|cancelled)
 * @middleware verifyToken - Phải đăng nhập
 * @middleware requireAdminOrStaff - Chỉ admin/staff mới được truy cập
 * @param {String} id - ID của đơn hàng
 * @body {String} status - Trạng thái mới (new|processing|shipping|completed|cancelled) (required)
 * @body {String} shipper - ID shipper (optional, chỉ khi status = shipping)
 * @body {String} note - Ghi chú (optional)
 * @returns {Object} { message, order }
 */
router.put("/:id/status", verifyToken, requireAdminOrStaff, async (req, res) => {
  try {
    // Lấy thông tin từ request body
    const { status, shipper, note } = req.body;
    
    // Tìm đơn hàng theo ID
    const order = await Order.findById(req.params.id);

    // Kiểm tra đơn hàng có tồn tại không
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng!" });
    }

    // Lưu trạng thái cũ để xử lý logic
    const oldStatus = order.status;
    
    // Mapping các thông báo tương ứng với từng trạng thái
    const statusMessages = {
      new: "Đơn hàng đã được tạo",
      processing: "Đơn hàng đang được xử lý",
      shipping: "Đơn hàng đang được giao",
      completed: "Đơn hàng đã hoàn thành",
      cancelled: "Đơn hàng đã bị hủy",
    };

    // Cập nhật trạng thái mới
    order.status = status;

    // Gán shipper khi chuyển sang shipping
    // Shipper là nhân viên giao hàng
    if (status === "shipping" && shipper) {
      order.shipper = shipper;
    }

    // Trừ tồn kho khi chuyển sang processing
    // Khi đơn hàng chuyển từ "new" sang "processing", trừ tồn kho
    if (status === "processing" && oldStatus === "new") {
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        
        // Kiểm tra tồn kho còn đủ không
        if (product.stock < item.quantity) {
          return res.status(400).json({ 
            message: `Sản phẩm ${product.name} không đủ tồn kho!` 
          });
        }
        
        // Trừ tồn kho bằng $inc (increment)
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity }, // Giảm stock đi item.quantity
        });
      }
    }

    // Hoàn lại tồn kho nếu hủy đơn đã processing
    // Nếu đơn hàng đã processing/shipping bị hủy, hoàn lại tồn kho
    if (status === "cancelled" && (oldStatus === "processing" || oldStatus === "shipping")) {
      for (const item of order.items) {
        // Hoàn lại tồn kho bằng $inc
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity }, // Tăng stock lên item.quantity
        });
      }
      // Ghi lại thời gian hủy
      order.cancelledAt = new Date();
    }

    // Đánh dấu hoàn thành
    if (status === "completed") {
      // Ghi lại thời gian hoàn thành
      order.completedAt = new Date();
      
      // Với đơn COD/cash: Khi hoàn thành nghĩa là đã thanh toán
      // Tự động cập nhật paymentStatus thành "success"
      if ((order.paymentMethod === "COD" || order.paymentMethod === "cash") && 
          order.paymentStatus === "pending") {
        order.paymentStatus = "success";
      }
    }

    // Thêm vào timeline để theo dõi lịch sử cập nhật
    if (!order.timeline) {
      order.timeline = [];
    }
    order.timeline.push({
      status, // Trạng thái mới
      message: note || statusMessages[status] || `Đơn hàng chuyển sang trạng thái: ${status}`, // Thông báo (dùng note nếu có, không thì dùng message mặc định)
      updatedBy: req.user.userId, // Người cập nhật
    });

    // Lưu đơn hàng đã cập nhật vào database
    await order.save();

    // Tạo thông báo cho customer
    await Notification.create({
      user: order.customer, // Customer nhận thông báo
      type: "order", // Loại thông báo
      title: "Cập nhật đơn hàng", // Tiêu đề
      message: `Đơn hàng ${order.orderNumber} đã chuyển sang trạng thái: ${statusMessages[status] || status}`, // Nội dung
      link: `/orders/${order._id}`, // Link đến đơn hàng
    });

    // Populate thông tin chi tiết để trả về
    await order.populate("customer", "fullName email");
    await order.populate("shipper", "fullName");
    await order.populate("items.product", "name image price");
    await order.populate("timeline.updatedBy", "fullName");

    // Trả về thông báo thành công và thông tin đơn hàng đã cập nhật
    res.json({
      message: "Cập nhật trạng thái đơn hàng thành công!",
      order, // Đơn hàng đã cập nhật với thông tin đầy đủ
    });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

/**
 * ❌ Hủy đơn hàng (chỉ customer)
 * PUT /api/orders/:id/cancel
 * Customer hủy đơn hàng của mình
 * @middleware verifyToken - Phải đăng nhập
 * @middleware requireCustomer - Chỉ customer mới được truy cập
 * @param {String} id - ID của đơn hàng
 * @body {String} reason - Lý do hủy đơn (required, tối thiểu 3 ký tự, tối đa 500 ký tự)
 * @returns {Object} { success, message, data: { order, refundInfo? } }
 */
router.put("/:id/cancel", verifyToken, requireCustomer, async (req, res) => {
  try {
    // Lấy lý do hủy đơn từ request body
    const { reason } = req.body;
    
    // Tìm đơn hàng theo ID và populate voucher
    const order = await Order.findById(req.params.id).populate("voucher");

    // Kiểm tra đơn hàng có tồn tại không
    if (!order) {
      return res.status(404).json({ 
        success: false,
        message: "Không tìm thấy đơn hàng!" 
      });
    }

    // Customer chỉ hủy đơn hàng của mình
    // Kiểm tra order.customer có khớp với user đang đăng nhập không
    if (order.customer.toString() !== req.user.userId) {
      return res.status(403).json({ 
        success: false,
        message: "Không có quyền hủy đơn hàng này!" 
      });
    }

    // Chỉ hủy được đơn hàng mới hoặc đang xử lý
    // Không thể hủy đơn hàng đang giao hoặc đã hoàn thành
    if (order.status === "shipping" || order.status === "completed") {
      return res.status(400).json({ 
        success: false,
        message: "Không thể hủy đơn hàng đang giao hoặc đã hoàn thành!" 
      });
    }

    // Kiểm tra đơn hàng đã bị hủy chưa
    if (order.status === "cancelled") {
      return res.status(400).json({ 
        success: false,
        message: "Đơn hàng đã bị hủy!" 
      });
    }

    // Validate lý do hủy
    // Lý do hủy phải có ít nhất 3 ký tự và tối đa 500 ký tự
    const cancelReason = (reason || "").trim();
    if (!cancelReason || cancelReason.length < 3) {
      return res.status(400).json({ 
        success: false,
        message: "Vui lòng nhập lý do hủy đơn (ít nhất 3 ký tự)!" 
      });
    }

    if (cancelReason.length > 500) {
      return res.status(400).json({ 
        success: false,
        message: "Lý do hủy đơn không được vượt quá 500 ký tự!" 
      });
    }

    // Lưu trạng thái và paymentStatus cũ để xử lý logic
    const oldStatus = order.status;
    const oldPaymentStatus = order.paymentStatus;
    
    // Cập nhật trạng thái đơn hàng thành "cancelled"
    order.status = "cancelled";
    order.cancelledAt = new Date(); // Ghi lại thời gian hủy
    order.cancelledReason = cancelReason; // Lưu lý do hủy

    // Cập nhật paymentStatus nếu đã thanh toán online
    // Nếu đơn hàng đã thanh toán online (ZaloPay/MoMo) và bị hủy, cần xử lý hoàn tiền
    if (oldPaymentStatus === "success" && (order.paymentMethod === "zalopay" || order.paymentMethod === "momo")) {
      order.paymentStatus = "cancelled";
      // TODO: Gọi API hoàn tiền từ ZaloPay/MoMo nếu cần
      // Hiện tại chỉ đánh dấu là đã hủy, admin sẽ xử lý hoàn tiền thủ công
    }

    // Hoàn lại tồn kho nếu đã trừ
    // Nếu đơn hàng đã processing (đã trừ tồn kho), hoàn lại tồn kho khi hủy
    if (oldStatus === "processing") {
      const Product = require("../models/Product");
      for (const item of order.items) {
        // Hoàn lại tồn kho bằng $inc
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity }, // Tăng stock lên item.quantity
        });
      }
    }

    // Hoàn lại voucher (giảm usedCount)
    // Nếu đơn hàng có sử dụng voucher, hoàn lại voucher (giảm usedCount)
    if (order.voucher) {
      const Voucher = require("../models/Voucher");
      const voucher = await Voucher.findById(order.voucher);
      if (voucher && voucher.usedCount > 0) {
        voucher.usedCount -= 1; // Giảm số lần sử dụng
        await voucher.save();
        console.log(`✅ Đã hoàn lại voucher ${voucher.code}, usedCount: ${voucher.usedCount}`);
      }
    }

    // Thêm vào timeline để theo dõi lịch sử
    if (!order.timeline) {
      order.timeline = [];
    }
    
    // Tạo thông báo timeline
    let timelineMessage = `Đơn hàng đã bị hủy. Lý do: ${cancelReason}`;
    // Nếu đã thanh toán online, thêm thông báo về hoàn tiền
    if (oldPaymentStatus === "success" && (order.paymentMethod === "zalopay" || order.paymentMethod === "momo")) {
      timelineMessage += " (Đã thanh toán online, cần xử lý hoàn tiền)";
    }
    
    order.timeline.push({
      status: "cancelled", // Trạng thái
      message: timelineMessage, // Thông báo
      updatedBy: req.user.userId, // Người hủy
    });

    // Lưu đơn hàng đã cập nhật vào database
    await order.save();

    // Populate thông tin timeline để trả về
    await order.populate("timeline.updatedBy", "fullName");

    // Thông báo cho khách hàng
    let successMessage = "Hủy đơn hàng thành công!";
    // Nếu đã thanh toán online, thêm thông báo về hoàn tiền
    if (oldPaymentStatus === "success" && (order.paymentMethod === "zalopay" || order.paymentMethod === "momo")) {
      successMessage += " Tiền sẽ được hoàn lại trong vòng 3-5 ngày làm việc.";
    }

    // Trả về kết quả
    res.json({
      success: true,
      message: successMessage,
      data: {
        order: order, // Đơn hàng đã hủy
        refundInfo: oldPaymentStatus === "success" && (order.paymentMethod === "zalopay" || order.paymentMethod === "momo") 
          ? {
              needsRefund: true, // Cần hoàn tiền
              amount: order.total, // Số tiền cần hoàn
              paymentMethod: order.paymentMethod, // Phương thức thanh toán
              message: "Tiền sẽ được hoàn lại trong vòng 3-5 ngày làm việc" // Thông báo
            }
          : null // Không cần hoàn tiền
      }
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({ 
      success: false,
      message: "Lỗi server!" 
    });
  }
});

module.exports = router;

