// Import các thư viện cần thiết
const express = require("express"); // Framework web server cho Node.js
const mongoose = require("mongoose"); // ODM (Object Document Mapper) cho MongoDB
const cors = require("cors"); // Middleware để xử lý CORS (Cross-Origin Resource Sharing)
require("dotenv").config(); // Load biến môi trường từ file .env

// Khởi tạo Express application
const app = express();

// Cấu hình CORS cho Android app và web client
// CORS cho phép frontend (Android app, web) gọi API từ domain khác
app.use(cors({
  origin: '*', // Cho phép tất cả origin (có thể giới hạn sau khi deploy production)
  // Cho phép các HTTP methods: GET, POST, PUT, DELETE, OPTIONS
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  // Cho phép các headers: Content-Type (JSON), Authorization (JWT token)
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true // Cho phép gửi cookies/credentials trong request
}));

// Middleware để log requests (debug)
// Chỉ log các request đến API chat để theo dõi real-time chat
app.use((req, res, next) => {
  if (req.path.startsWith('/api/chat')) {
    // Log: method (GET/POST), path (/api/chat/...), timestamp
    console.log(`📡 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  }
  next(); // Chuyển request sang middleware tiếp theo
});

// Middleware để parse JSON body trong request
// limit: '10mb' - Cho phép upload file/ảnh lớn (tối đa 10MB)
app.use(express.json({ limit: '10mb' }));

// Middleware để parse URL-encoded body (form data)
// extended: true - Cho phép parse nested objects trong form
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
// Các file trong thư mục public/ sẽ được serve trực tiếp (HTML, CSS, JS, images)
// Ví dụ: /index.html → public/index.html
app.use(express.static('public'));

// Kết nối MongoDB Atlas (Cloud Database)
// MongoDB Atlas là dịch vụ database cloud của MongoDB
mongoose.connect(process.env.MONGO_URI, { 
  useNewUrlParser: true, // Sử dụng URL parser mới (deprecated nhưng vẫn cần cho compatibility)
  useUnifiedTopology: true, // Sử dụng engine kết nối mới (deprecated nhưng vẫn cần)
  family: 4 // Ép dùng IPv4, tránh lỗi DNS khi kết nối đến MongoDB Atlas
})
  .then(() => console.log("✅ Connected to MongoDB Atlas")) // Kết nối thành công
  .catch((err) => console.error("❌ Connection failed:", err)); // Kết nối thất bại

// API info endpoint - Trả về thông tin về API
// GET /api - Endpoint để kiểm tra API có hoạt động không và xem danh sách endpoints
app.get("/api", (req, res) => {
  res.json({
    message: "Shop THB API", // Tên API
    version: "1.0.0", // Phiên bản API
    endpoints: { // Danh sách các endpoints chính
      auth: "/api/auth", // Xác thực (đăng nhập, đăng ký)
      users: "/api/users", // Quản lý người dùng
      products: "/api/products", // Quản lý sản phẩm
      categories: "/api/categories", // Quản lý danh mục
      cart: "/api/cart", // Giỏ hàng
      orders: "/api/orders", // Đơn hàng
      dashboard: "/api/dashboard", // Dashboard admin
      home: "/api/home", // Trang chủ
      statistics: "/api/statistics", // Thống kê
      support: "/api/support", // Hỗ trợ
      vouchers: "/api/vouchers", // Mã giảm giá
      payment: "/api/payment", // Thanh toán (VNPay, MoMo, ZaloPay)
      chat: "/api/chat" // Chat real-time
    }
  });
});

// Serve homepage - Trang chủ cho khách hàng
// GET / - Trả về file HTML trang chủ (public/index.html)
app.get("/", (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Serve admin page - Trang quản trị cho admin
// GET /admin - Trả về file HTML trang admin (public/admin.html)
app.get("/admin", (req, res) => {
  res.sendFile(__dirname + '/public/admin.html');
});


// Import routes - Import các route handlers từ thư mục routes/
// Mỗi file route chứa các endpoints API cho một module cụ thể
const authRoutes = require("./routes/auth"); // Routes cho xác thực (login, register)
const userRoutes = require("./routes/users"); // Routes cho quản lý người dùng
const productRoutes = require("./routes/products"); // Routes cho quản lý sản phẩm
const categoryRoutes = require("./routes/categories"); // Routes cho quản lý danh mục
const cartRoutes = require("./routes/cart"); // Routes cho giỏ hàng
const addressRoutes = require("./routes/addresses"); // Routes cho địa chỉ giao hàng
const reviewRoutes = require("./routes/reviews"); // Routes cho đánh giá sản phẩm
const favoriteRoutes = require("./routes/favorites"); // Routes cho sản phẩm yêu thích
const orderRoutes = require("./routes/orders"); // Routes cho đơn hàng
const dashboardRoutes = require("./routes/dashboard"); // Routes cho dashboard admin
const notificationRoutes = require("./routes/notifications"); // Routes cho thông báo
const statisticsRoutes = require("./routes/statistics"); // Routes cho thống kê
const homeRoutes = require("./routes/home"); // Routes cho trang chủ
const supportRoutes = require("./routes/support"); // Routes cho hỗ trợ khách hàng
const voucherRoutes = require("./routes/vouchers"); // Routes cho mã giảm giá
const paymentRoutes = require("./routes/payment"); // Routes cho thanh toán (VNPay, MoMo, ZaloPay)
const invoiceRoutes = require("./routes/invoices"); // Routes cho hóa đơn
const chatRoutes = require("./routes/chat"); // Routes cho chat real-time

// Use routes - Đăng ký các routes với Express app
// Mỗi route sẽ được mount tại path tương ứng
// Ví dụ: app.use("/api/auth", authRoutes) → /api/auth/login, /api/auth/register, ...
app.use("/api/auth", authRoutes); // Tất cả routes trong auth.js sẽ có prefix /api/auth
app.use("/api/users", userRoutes); // Tất cả routes trong users.js sẽ có prefix /api/users
app.use("/api/products", productRoutes); // Tất cả routes trong products.js sẽ có prefix /api/products
app.use("/api/categories", categoryRoutes); // Tất cả routes trong categories.js sẽ có prefix /api/categories
app.use("/api/cart", cartRoutes); // Tất cả routes trong cart.js sẽ có prefix /api/cart
app.use("/api/addresses", addressRoutes); // Tất cả routes trong addresses.js sẽ có prefix /api/addresses
app.use("/api/reviews", reviewRoutes); // Tất cả routes trong reviews.js sẽ có prefix /api/reviews
app.use("/api/favorites", favoriteRoutes); // Tất cả routes trong favorites.js sẽ có prefix /api/favorites
app.use("/api/orders", orderRoutes); // Tất cả routes trong orders.js sẽ có prefix /api/orders
app.use("/api/dashboard", dashboardRoutes); // Tất cả routes trong dashboard.js sẽ có prefix /api/dashboard
app.use("/api/notifications", notificationRoutes); // Tất cả routes trong notifications.js sẽ có prefix /api/notifications
app.use("/api/statistics", statisticsRoutes); // Tất cả routes trong statistics.js sẽ có prefix /api/statistics
app.use("/api/home", homeRoutes); // Tất cả routes trong home.js sẽ có prefix /api/home
app.use("/api/support", supportRoutes); // Tất cả routes trong support.js sẽ có prefix /api/support
app.use("/api/vouchers", voucherRoutes); // Tất cả routes trong vouchers.js sẽ có prefix /api/vouchers
app.use("/api/payment", paymentRoutes); // Tất cả routes trong payment.js sẽ có prefix /api/payment
app.use("/api/invoices", invoiceRoutes); // Tất cả routes trong invoices.js sẽ có prefix /api/invoices
app.use("/api/chat", chatRoutes); // Tất cả routes trong chat.js sẽ có prefix /api/chat

// Lấy port từ biến môi trường hoặc dùng port 3000 mặc định
// process.env.PORT được set bởi hosting service (Heroku, Railway, ...)
const PORT = process.env.PORT || 3000;

// Khởi động server và lắng nghe trên port đã cấu hình
// Server sẽ chạy và sẵn sàng nhận requests từ clients
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
