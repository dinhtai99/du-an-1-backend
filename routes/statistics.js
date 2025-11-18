const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");

// 📊 Tổng hợp thống kê tổng quan (Admin only)
router.get("/overview", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Query cho tất cả đơn hàng (trừ cancelled) - dùng cho tổng đơn hàng, doanh thu và lợi nhuận
    const allOrdersQuery = { status: { $ne: "cancelled" } };
    if (startDate || endDate) {
      allOrdersQuery.createdAt = {};
      if (startDate) allOrdersQuery.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        allOrdersQuery.createdAt.$lte = end;
      }
    }

    // Tổng số đơn hàng (tất cả trừ cancelled)
    const totalOrders = await Order.countDocuments(allOrdersQuery);

    // Tổng doanh thu (tính từ tất cả đơn hàng trừ cancelled)
    const allOrders = await Order.find(allOrdersQuery);
    const totalRevenue = allOrders.reduce((sum, order) => sum + order.total, 0);

    // Tính lợi nhuận (tổng doanh thu - tổng giá nhập) - tính từ tất cả đơn hàng trừ cancelled
    let totalProfit = 0;
    for (const order of allOrders) {
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product && product.importPrice) {
          const cost = product.importPrice * item.quantity;
          const revenue = item.subtotal;
          totalProfit += revenue - cost;
        }
      }
    }

    // Tổng số sản phẩm
    const totalProducts = await Product.countDocuments({ status: 1 });

    // Tổng số khách hàng
    const totalCustomers = await User.countDocuments({ role: "customer" });

    // Sản phẩm tồn kho thấp (dưới 5)
    const lowStockProducts = await Product.countDocuments({
      stock: { $lt: 5 },
      status: 1,
    });

    res.json({
      totalOrders,
      totalRevenue,
      totalProfit,
      totalProducts,
      totalCustomers,
      lowStockProducts,
    });
  } catch (error) {
    console.error("Get overview statistics error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 📊 Top 5 sản phẩm bán chạy (theo số lượng) - Admin only
router.get("/top-products/quantity", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 5, startDate, endDate } = req.query;

    const query = { status: "completed" };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const topProducts = await Order.aggregate([
      { $match: query },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.subtotal" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: parseInt(limit) },
    ]);

    const result = await Promise.all(
      topProducts.map(async (stat) => {
        const product = await Product.findById(stat._id).populate("category", "name");
        return {
          product: product,
          quantity: stat.totalSold,
          revenue: stat.totalRevenue,
        };
      })
    );

    res.json(result);
  } catch (error) {
    console.error("Get top products by quantity error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 📊 Top 5 sản phẩm bán chạy (theo doanh thu) - Admin only
router.get("/top-products/revenue", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 5, startDate, endDate } = req.query;

    const query = { status: "completed" };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const topProducts = await Order.aggregate([
      { $match: query },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.subtotal" },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: parseInt(limit) },
    ]);

    const result = await Promise.all(
      topProducts.map(async (stat) => {
        const product = await Product.findById(stat._id).populate("category", "name");
        return {
          product: product,
          quantity: stat.totalSold,
          revenue: stat.totalRevenue,
        };
      })
    );

    res.json(result);
  } catch (error) {
    console.error("Get top products by revenue error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 📊 Doanh thu theo ngày - Admin only
router.get("/revenue/daily", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = { status: "completed" };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const orders = await Order.find(query);
    const dailyRevenue = {};

    orders.forEach((order) => {
      const date = order.createdAt.toISOString().split("T")[0];
      if (!dailyRevenue[date]) {
        dailyRevenue[date] = { date, revenue: 0, count: 0 };
      }
      dailyRevenue[date].revenue += order.total;
      dailyRevenue[date].count += 1;
    });

    const result = Object.values(dailyRevenue).sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    res.json(result);
  } catch (error) {
    console.error("Get daily revenue error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 📊 Doanh thu theo tháng - Admin only
router.get("/revenue/monthly", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    const orders = await Order.find({
      status: "completed",
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const monthlyRevenue = {};
    for (let i = 0; i < 12; i++) {
      monthlyRevenue[i] = { month: i + 1, revenue: 0, count: 0 };
    }

    orders.forEach((order) => {
      const month = order.createdAt.getMonth();
      monthlyRevenue[month].revenue += order.total;
      monthlyRevenue[month].count += 1;
    });

    const result = Object.values(monthlyRevenue);
    res.json(result);
  } catch (error) {
    console.error("Get monthly revenue error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 📊 Doanh thu theo năm - Admin only
router.get("/revenue/yearly", verifyToken, requireAdmin, async (req, res) => {
  try {
    const orders = await Order.find({ status: "completed" });
    const yearlyRevenue = {};

    orders.forEach((order) => {
      const year = order.createdAt.getFullYear();
      if (!yearlyRevenue[year]) {
        yearlyRevenue[year] = { year, revenue: 0, count: 0 };
      }
      yearlyRevenue[year].revenue += order.total;
      yearlyRevenue[year].count += 1;
    });

    const result = Object.values(yearlyRevenue).sort((a, b) => a.year - b.year);
    res.json(result);
  } catch (error) {
    console.error("Get yearly revenue error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 📊 Thống kê sản phẩm tồn kho ít nhất - Admin only
router.get("/low-stock", verifyToken, requireAdmin, async (req, res) => {
  try {
    const products = await Product.find({
      stock: { $lt: 5 },
      status: 1,
    })
      .populate("category", "name")
      .sort({ stock: 1 })
      .limit(10);

    const result = products.map((product) => ({
      product,
      stock: product.stock,
      minStock: product.minStock,
      warning: product.stock < 5,
    }));

    res.json(result);
  } catch (error) {
    console.error("Get low stock products error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 📊 Thống kê theo phương thức thanh toán - Admin only
router.get("/payment-methods", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = { status: "completed" };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const orders = await Order.find(query);
    const paymentStats = {
      COD: { count: 0, revenue: 0 },
      cash: { count: 0, revenue: 0 },
      card: { count: 0, revenue: 0 },
      "e-wallet": { count: 0, revenue: 0 },
      zalopay: { count: 0, revenue: 0 },
      momo: { count: 0, revenue: 0 },
    };

    orders.forEach((order) => {
      const method = order.paymentMethod;
      // Gộp cash vào COD nếu có
      const statKey = method === "cash" ? "COD" : method;
      if (paymentStats[statKey]) {
        paymentStats[statKey].count += 1;
        paymentStats[statKey].revenue += order.total;
      } else if (paymentStats[method]) {
        paymentStats[method].count += 1;
        paymentStats[method].revenue += order.total;
      }
    });

    res.json(paymentStats);
  } catch (error) {
    console.error("Get payment methods statistics error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

module.exports = router;

