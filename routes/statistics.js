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

    // Tổng số đơn hàng (tất cả trừ cancelled) - dùng aggregation để tối ưu
    const totalOrders = await Order.countDocuments(allOrdersQuery);

    // Tính tổng doanh thu và lợi nhuận bằng aggregation pipeline (nhanh hơn nhiều)
    const revenueStats = await Order.aggregate([
      { $match: allOrdersQuery },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$total" },
          items: { $push: "$items" }
        }
      }
    ]);

    const totalRevenue = revenueStats[0]?.totalRevenue || 0;
    const allItems = revenueStats[0]?.items?.flat() || [];

    // Thu thập tất cả product IDs (loại bỏ duplicate)
    const productIds = [...new Set(allItems.map(item => item.product?.toString()).filter(Boolean))];

    // Load tất cả products một lần (thay vì N queries)
    const products = await Product.find({ _id: { $in: productIds } }).select("_id importPrice");
    const productMap = new Map(products.map(p => [p._id.toString(), p.importPrice || 0]));

    // Tính lợi nhuận và tổng vốn từ map (rất nhanh)
    let totalProfit = 0;
    let totalCapital = 0; // Tổng vốn bỏ ra
    for (const item of allItems) {
      const productId = item.product?.toString();
      if (productId && productMap.has(productId)) {
        const importPrice = productMap.get(productId);
        const cost = importPrice * item.quantity;
        const revenue = item.subtotal || 0;
        totalCapital += cost; // Tổng vốn
        totalProfit += revenue - cost; // Lợi nhuận
      }
    }

    // Chạy song song các queries không liên quan (nhanh hơn)
    const [totalProducts, totalCustomers, lowStockProducts] = await Promise.all([
      Product.countDocuments({ status: 1 }),
      User.countDocuments({ role: "customer" }),
      Product.countDocuments({
        stock: { $lt: 5 },
        status: 1,
      })
    ]);

    res.json({
      totalOrders,
      totalRevenue,
      totalCapital, // Tổng vốn bỏ ra
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

// 📊 Doanh thu theo ngày - Admin only (tối ưu bằng aggregation)
router.get("/revenue/daily", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchQuery = { status: "completed" };
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchQuery.createdAt.$lte = end;
      }
    }

    // Sử dụng aggregation pipeline thay vì load tất cả orders (nhanh hơn nhiều)
    const dailyRevenue = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$total" },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          revenue: 1,
          count: 1
        }
      },
      { $sort: { date: 1 } }
    ]);

    res.json(dailyRevenue);
  } catch (error) {
    console.error("Get daily revenue error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 📊 Doanh thu theo tháng - Admin only (tối ưu bằng aggregation)
router.get("/revenue/monthly", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    // Sử dụng aggregation pipeline (nhanh hơn nhiều)
    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          status: "completed",
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          revenue: { $sum: "$total" },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          month: "$_id",
          revenue: 1,
          count: 1
        }
      },
      { $sort: { month: 1 } }
    ]);

    // Đảm bảo có đủ 12 tháng (fill các tháng không có đơn hàng = 0)
    const result = [];
    for (let i = 1; i <= 12; i++) {
      const monthData = monthlyRevenue.find(m => m.month === i);
      result.push({
        month: i,
        revenue: monthData?.revenue || 0,
        count: monthData?.count || 0
      });
    }

    res.json(result);
  } catch (error) {
    console.error("Get monthly revenue error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 📊 Doanh thu theo năm - Admin only (tối ưu bằng aggregation)
router.get("/revenue/yearly", verifyToken, requireAdmin, async (req, res) => {
  try {
    // Sử dụng aggregation pipeline (nhanh hơn nhiều)
    const yearlyRevenue = await Order.aggregate([
      { $match: { status: "completed" } },
      {
        $group: {
          _id: { $year: "$createdAt" },
          revenue: { $sum: "$total" },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          year: "$_id",
          revenue: 1,
          count: 1
        }
      },
      { $sort: { year: 1 } }
    ]);

    res.json(yearlyRevenue);
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

// 📊 Thống kê theo phương thức thanh toán - Admin only (tối ưu bằng aggregation)
router.get("/payment-methods", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchQuery = { status: "completed" };
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchQuery.createdAt.$lte = end;
      }
    }

    // Sử dụng aggregation pipeline (nhanh hơn nhiều)
    const paymentStats = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$paymentMethod", "cash"] },
              "COD",
              "$paymentMethod"
            ]
          },
          count: { $sum: 1 },
          revenue: { $sum: "$total" }
        }
      },
      {
        $project: {
          _id: 0,
          method: "$_id",
          count: 1,
          revenue: 1
        }
      }
    ]);

    // Format về object như cũ để tương thích với frontend
    const result = {
      COD: { count: 0, revenue: 0 },
      cash: { count: 0, revenue: 0 },
      card: { count: 0, revenue: 0 },
      "e-wallet": { count: 0, revenue: 0 },
      zalopay: { count: 0, revenue: 0 },
      momo: { count: 0, revenue: 0 },
    };

    paymentStats.forEach(stat => {
      const method = stat.method;
      if (result[method]) {
        result[method].count = stat.count;
        result[method].revenue = stat.revenue;
      }
    });

    res.json(result);
  } catch (error) {
    console.error("Get payment methods statistics error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 📊 Thống kê vốn đầu tư theo sản phẩm - Admin only
router.get("/capital-by-product", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, limit = 20 } = req.query;

    // Query cho tất cả đơn hàng (trừ cancelled)
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

    // Sử dụng aggregation để tính vốn đầu tư theo sản phẩm
    const capitalByProduct = await Order.aggregate([
      { $match: allOrdersQuery },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.subtotal" },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: parseInt(limit) }
    ]);

    // Load thông tin sản phẩm và tính vốn
    const productIds = capitalByProduct.map(item => item._id).filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds } })
      .select("_id name importPrice category")
      .populate("category", "name");

    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    // Tính vốn đầu tư cho từng sản phẩm
    const result = capitalByProduct
      .map(item => {
        const productId = item._id?.toString();
        const product = productMap.get(productId);
        
        if (!product) return null;

        const importPrice = product.importPrice || 0;
        const totalCapital = importPrice * item.totalQuantity;
        const totalProfit = item.totalRevenue - totalCapital;
        const profitMargin = item.totalRevenue > 0 
          ? ((totalProfit / item.totalRevenue) * 100).toFixed(2) 
          : 0;

        return {
          product: {
            _id: product._id,
            name: product.name,
            category: product.category,
            importPrice: importPrice
          },
          totalQuantity: item.totalQuantity,
          totalRevenue: item.totalRevenue,
          totalCapital: totalCapital,
          totalProfit: totalProfit,
          profitMargin: parseFloat(profitMargin),
          orderCount: item.orderCount
        };
      })
      .filter(item => item !== null)
      .sort((a, b) => b.totalCapital - a.totalCapital); // Sắp xếp theo vốn giảm dần

    res.json(result);
  } catch (error) {
    console.error("Get capital by product error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

module.exports = router;

