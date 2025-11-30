// Import thư viện JWT (JSON Web Token) để xác thực và mã hóa token
const jwt = require("jsonwebtoken");

/**
 * Xác thực JWT token từ request header
 * Middleware này kiểm tra xem user đã đăng nhập chưa bằng cách verify JWT token
 * Token được gửi trong header: Authorization: "Bearer <token>"
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.verifyToken = (req, res, next) => {
  // Lấy token từ header Authorization
  // Format: "Bearer <token>" → split(" ")[1] để lấy phần token
  // Optional chaining (?.) để tránh lỗi nếu không có authorization header
  const token = req.headers.authorization?.split(" ")[1];
  
  // Nếu không có token, trả về lỗi 401 (Unauthorized)
  if (!token) return res.status(401).json({ message: "Chưa đăng nhập!" });
  
  try {
    // Verify token với JWT_SECRET từ .env
    // Nếu token hợp lệ, decoded sẽ chứa thông tin user (id, role, ...)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Lưu thông tin user vào req.user để các middleware/route sau có thể sử dụng
    req.user = decoded;
    
    // Chuyển sang middleware/route tiếp theo
    next();
  } catch {
    // Nếu token không hợp lệ (expired, invalid signature, ...), trả về lỗi 403 (Forbidden)
    res.status(403).json({ message: "Token không hợp lệ!" });
  }
};

/**
 * Kiểm tra quyền Admin
 * Middleware này chỉ cho phép Admin truy cập
 * Phải gọi sau verifyToken để có req.user
 * @param {Object} req - Express request object (phải có req.user từ verifyToken)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.requireAdmin = (req, res, next) => {
  // Kiểm tra role của user có phải "admin" không
  if (req.user.role !== "admin") {
    // Nếu không phải admin, trả về lỗi 403 (Forbidden)
    return res.status(403).json({ message: "Chỉ Admin mới có quyền truy cập!" });
  }
  // Nếu là admin, cho phép tiếp tục
  next();
};

/**
 * Kiểm tra quyền Admin hoặc Staff
 * Middleware này cho phép cả Admin và Staff truy cập
 * Phải gọi sau verifyToken để có req.user
 * @param {Object} req - Express request object (phải có req.user từ verifyToken)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.requireAdminOrStaff = (req, res, next) => {
  // Kiểm tra role của user có phải "admin" hoặc "staff" không
  if (req.user.role !== "admin" && req.user.role !== "staff") {
    // Nếu không phải admin hoặc staff, trả về lỗi 403 (Forbidden)
    return res.status(403).json({ message: "Không có quyền truy cập!" });
  }
  // Nếu là admin hoặc staff, cho phép tiếp tục
  next();
};

/**
 * Kiểm tra quyền Customer
 * Middleware này chỉ cho phép Customer truy cập
 * Phải gọi sau verifyToken để có req.user
 * @param {Object} req - Express request object (phải có req.user từ verifyToken)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
exports.requireCustomer = (req, res, next) => {
  // Kiểm tra role của user có phải "customer" không
  if (req.user.role !== "customer") {
    // Nếu không phải customer, trả về lỗi 403 (Forbidden)
    return res.status(403).json({ message: "Chỉ khách hàng mới có quyền sử dụng tính năng này!" });
  }
  // Nếu là customer, cho phép tiếp tục
  next();
};
