const express = require("express");
const router = express.Router();
const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const { verifyToken } = require("../middleware/authMiddleware");

// 📊 Tổng hợp thống kê tổng quan
router.get("/overview", verifyToken, async (req, res) => {
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

    const invoices = await Invoice.find(query);
    const totalInvoices = invoices.length;
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);

    // Tính lợi nhuận (tổng doanh thu - tổng giá nhập)
    let totalProfit = 0;
    for (const invoice of invoices) {
      for (const item of invoice.items) {
        const product = await Product.findById(item.product);
        if (product) {
          const cost = product.importPrice * item.quantity;
          const revenue = item.subtotal;
          totalProfit += revenue - cost;
        }
      }
    }

    // Tổng số sản phẩm
    const totalProducts = await Product.countDocuments({ status: 1 });

    // Tổng số khách hàng
    const totalCustomers = await Customer.countDocuments({ active: true });

    // Sản phẩm tồn kho thấp
    const lowStockProducts = await Product.countDocuments({
      $expr: { $lte: ["$stock", "$minStock"] },
      status: 1,
    });

    res.json({
      totalInvoices,
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

// 📊 Top 5 sản phẩm bán chạy (theo số lượng)
router.get("/top-products/quantity", verifyToken, async (req, res) => {
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

    const invoices = await Invoice.find(query);
    const productStats = {};

    // Đếm số lượng bán của từng sản phẩm
    for (const invoice of invoices) {
      for (const item of invoice.items) {
        const productId = item.product.toString();
        if (!productStats[productId]) {
          productStats[productId] = {
            productId: item.product,
            quantity: 0,
            revenue: 0,
          };
        }
        productStats[productId].quantity += item.quantity;
        productStats[productId].revenue += item.subtotal;
      }
    }

    // Sắp xếp theo số lượng và lấy top
    const topProducts = Object.values(productStats)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, parseInt(limit));

    // Populate thông tin sản phẩm
    const result = await Promise.all(
      topProducts.map(async (stat) => {
        const product = await Product.findById(stat.productId).populate("category", "name");
        return {
          product: product,
          quantity: stat.quantity,
          revenue: stat.revenue,
        };
      })
    );

    res.json(result);
  } catch (error) {
    console.error("Get top products by quantity error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 📊 Top 5 sản phẩm bán chạy (theo doanh thu)
router.get("/top-products/revenue", verifyToken, async (req, res) => {
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

    const invoices = await Invoice.find(query);
    const productStats = {};

    // Tính doanh thu của từng sản phẩm
    for (const invoice of invoices) {
      for (const item of invoice.items) {
        const productId = item.product.toString();
        if (!productStats[productId]) {
          productStats[productId] = {
            productId: item.product,
            quantity: 0,
            revenue: 0,
          };
        }
        productStats[productId].quantity += item.quantity;
        productStats[productId].revenue += item.subtotal;
      }
    }

    // Sắp xếp theo doanh thu và lấy top
    const topProducts = Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, parseInt(limit));

    // Populate thông tin sản phẩm
    const result = await Promise.all(
      topProducts.map(async (stat) => {
        const product = await Product.findById(stat.productId).populate("category", "name");
        return {
          product: product,
          quantity: stat.quantity,
          revenue: stat.revenue,
        };
      })
    );

    res.json(result);
  } catch (error) {
    console.error("Get top products by revenue error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 📊 Doanh thu theo ngày
router.get("/revenue/daily", verifyToken, async (req, res) => {
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

    const invoices = await Invoice.find(query);
    const dailyRevenue = {};

    invoices.forEach((invoice) => {
      const date = invoice.createdAt.toISOString().split("T")[0];
      if (!dailyRevenue[date]) {
        dailyRevenue[date] = { date, revenue: 0, count: 0 };
      }
      dailyRevenue[date].revenue += invoice.total;
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

// 📊 Doanh thu theo tháng
router.get("/revenue/monthly", verifyToken, async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    const invoices = await Invoice.find({
      status: "completed",
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const monthlyRevenue = {};
    for (let i = 0; i < 12; i++) {
      monthlyRevenue[i] = { month: i + 1, revenue: 0, count: 0 };
    }

    invoices.forEach((invoice) => {
      const month = invoice.createdAt.getMonth();
      monthlyRevenue[month].revenue += invoice.total;
      monthlyRevenue[month].count += 1;
    });

    const result = Object.values(monthlyRevenue);
    res.json(result);
  } catch (error) {
    console.error("Get monthly revenue error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 📊 Doanh thu theo năm
router.get("/revenue/yearly", verifyToken, async (req, res) => {
  try {
    const invoices = await Invoice.find({ status: "completed" });
    const yearlyRevenue = {};

    invoices.forEach((invoice) => {
      const year = invoice.createdAt.getFullYear();
      if (!yearlyRevenue[year]) {
        yearlyRevenue[year] = { year, revenue: 0, count: 0 };
      }
      yearlyRevenue[year].revenue += invoice.total;
      yearlyRevenue[year].count += 1;
    });

    const result = Object.values(yearlyRevenue).sort((a, b) => a.year - b.year);
    res.json(result);
  } catch (error) {
    console.error("Get yearly revenue error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 📊 Thống kê sản phẩm tồn kho ít nhất
router.get("/low-stock", verifyToken, async (req, res) => {
  try {
    const products = await Product.find({
      $expr: { $lte: ["$stock", "$minStock"] },
      status: 1,
    })
      .populate("category", "name")
      .sort({ stock: 1 })
      .limit(10);

    const result = products.map((product) => ({
      product,
      stock: product.stock,
      minStock: product.minStock,
      warning: product.stock <= product.minStock,
    }));

    res.json(result);
  } catch (error) {
    console.error("Get low stock products error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 📊 Thống kê theo phương thức thanh toán
router.get("/payment-methods", verifyToken, async (req, res) => {
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

    const invoices = await Invoice.find(query);
    const paymentStats = {
      cash: { count: 0, revenue: 0 },
      transfer: { count: 0, revenue: 0 },
      card: { count: 0, revenue: 0 },
    };

    invoices.forEach((invoice) => {
      const method = invoice.paymentMethod;
      if (paymentStats[method]) {
        paymentStats[method].count += 1;
        paymentStats[method].revenue += invoice.total;
      }
    });

    res.json(paymentStats);
  } catch (error) {
    console.error("Get payment methods statistics error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

module.exports = router;

