const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static('public'));

// Kết nối MongoDB Atlas
mongoose.connect(process.env.MONGO_URI,{ 
  useNewUrlParser: true,
  useUnifiedTopology: true,
  family: 4 // ép dùng IPv4, tránh lỗi DNS
})
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ Connection failed:", err));

// API info endpoint
app.get("/api", (req, res) => {
  res.json({
    message: "Shop THB API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      products: "/api/products",
      categories: "/api/categories",
      cart: "/api/cart",
      orders: "/api/orders",
      dashboard: "/api/dashboard",
      home: "/api/home",
      statistics: "/api/statistics",
      support: "/api/support",
      vouchers: "/api/vouchers",
      payment: "/api/payment"
    }
  });
});

// Serve homepage
app.get("/", (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Serve admin page
app.get("/admin", (req, res) => {
  res.sendFile(__dirname + '/public/admin.html');
});


// Import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const productRoutes = require("./routes/products");
const categoryRoutes = require("./routes/categories");
const cartRoutes = require("./routes/cart");
const addressRoutes = require("./routes/addresses");
const reviewRoutes = require("./routes/reviews");
const favoriteRoutes = require("./routes/favorites");
const orderRoutes = require("./routes/orders");
const dashboardRoutes = require("./routes/dashboard");
const notificationRoutes = require("./routes/notifications");
const statisticsRoutes = require("./routes/statistics");
const homeRoutes = require("./routes/home");
const supportRoutes = require("./routes/support");
const voucherRoutes = require("./routes/vouchers");
const paymentRoutes = require("./routes/payment");
const invoiceRoutes = require("./routes/invoices");
const chatRoutes = require("./routes/chat");

// Use routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/statistics", statisticsRoutes);
app.use("/api/home", homeRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/vouchers", voucherRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/chat", chatRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
