const jwt = require("jsonwebtoken");

// Xác thực token
exports.verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Chưa đăng nhập!" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ message: "Token không hợp lệ!" });
  }
};

// Kiểm tra quyền Admin
exports.requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Chỉ Admin mới có quyền truy cập!" });
  }
  next();
};

// Kiểm tra quyền Admin hoặc Staff
exports.requireAdminOrStaff = (req, res, next) => {
  if (req.user.role !== "admin" && req.user.role !== "staff") {
    return res.status(403).json({ message: "Không có quyền truy cập!" });
  }
  next();
};
