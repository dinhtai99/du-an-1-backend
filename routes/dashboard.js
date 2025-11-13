const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");

// 📊 Dashboard - Tổng quan (Admin only)
router.get("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { period = "today" } = req.query; // today, week, month
    const now = new Date();
    let startDate;

    switch (period) {
      case "today":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }

    // Tổng doanh thu
    const revenueOrders = await Order.find({
      status: "completed",
      createdAt: { $gte: startDate },
    });
    const totalRevenue = revenueOrders.reduce((sum, order) => sum + order.total, 0);

    // Số đơn hàng mới
    const newOrders = await Order.countDocuments({
      status: "new",
      createdAt: { $gte: startDate },
    });

    // Sản phẩm sắp hết hàng
    const lowStockProducts = await Product.find({
      $expr: { $lte: ["$stock", "$minStock"] },
      status: 1,
    })
      .populate("category", "name")
      .sort({ stock: 1 })
      .limit(10);

    // Tổng số khách hàng
    const totalCustomers = await User.countDocuments({ role: "customer" });

    // Tổng số đơn hàng
    const totalOrders = await Order.countDocuments({ createdAt: { $gte: startDate } });

    // Sản phẩm bán chạy (top 5)
    const topProducts = await Order.aggregate([
      { $match: { status: "completed", createdAt: { $gte: startDate } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.subtotal" },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: 5 },
    ]);

    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await Product.findById(item._id).populate("category", "name");
        return {
          product,
          totalSold: item.totalSold,
          totalRevenue: item.totalRevenue,
        };
      })
    );

    res.json({
      period,
      totalRevenue,
      newOrders,
      lowStockProducts,
      totalCustomers,
      totalOrders,
      topProducts: topProductsWithDetails,
    });
  } catch (error) {
    console.error("Get dashboard error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 📈 Báo cáo doanh thu
router.get("/revenue", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = "day" } = req.query; // day, week, month

    const query = { status: "completed" };
    if (startDate) query.createdAt = { $gte: new Date(startDate) };
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { ...query.createdAt, $lte: end };
    }

    const orders = await Order.find(query).sort({ createdAt: 1 });

    // Nhóm theo ngày/tuần/tháng
    const revenueByPeriod = {};
    orders.forEach(order => {
      const date = new Date(order.createdAt);
      let key;

      if (groupBy === "day") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      } else if (groupBy === "week") {
        const week = Math.ceil(date.getDate() / 7);
        key = `${date.getFullYear()}-W${week}`;
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      }

      if (!revenueByPeriod[key]) {
        revenueByPeriod[key] = { revenue: 0, orders: 0 };
      }
      revenueByPeriod[key].revenue += order.total;
      revenueByPeriod[key].orders += 1;
    });

    res.json({
      revenueByPeriod: Object.entries(revenueByPeriod).map(([period, data]) => ({
        period,
        ...data,
      })),
    });
  } catch (error) {
    console.error("Get revenue report error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 📦 Báo cáo sản phẩm bán chạy
router.get("/top-products", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;

    const query = { status: "completed" };
    if (startDate) query.createdAt = { $gte: new Date(startDate) };
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt = { ...query.createdAt, $lte: end };
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

    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await Product.findById(item._id).populate("category", "name");
        return {
          product,
          totalSold: item.totalSold,
          totalRevenue: item.totalRevenue,
        };
      })
    );

    res.json(topProductsWithDetails);
  } catch (error) {
    console.error("Get top products error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

module.exports = router;

