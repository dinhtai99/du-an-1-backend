const express = require("express");
const router = express.Router();
const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const { verifyToken } = require("../middleware/authMiddleware");

// 🧑‍💼 Lấy danh sách khách hàng
router.get("/", async (req, res) => {
  try {
    const { search, type, active, page = 1, limit = 10 } = req.query;
    const query = {};

    // Tìm kiếm nhanh theo tên, số điện thoại, địa chỉ
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
      ];
    }

    // Lọc theo loại khách hàng
    if (type) {
      query.type = type;
    }

    // Lọc theo trạng thái active
    if (active !== undefined) {
      query.active = active === "true";
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Customer.countDocuments(query);

    res.json({
      customers,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Get customers error:", error);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách khách hàng!" });
  }
});

// 🧑‍💼 Lấy chi tiết khách hàng (kèm thống kê)
router.get("/:id", async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Không tìm thấy khách hàng!" });
    }

    // Thống kê số đơn hàng và tổng chi tiêu
    const invoices = await Invoice.find({ customer: req.params.id, status: "completed" });
    const totalOrders = invoices.length;
    const totalSpent = invoices.reduce((sum, invoice) => sum + invoice.total, 0);

    const customerObj = customer.toObject();
    customerObj.statistics = {
      totalOrders,
      totalSpent,
    };

    res.json(customerObj);
  } catch (error) {
    console.error("Get customer error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// ➕ Thêm khách hàng mới
router.post("/", verifyToken, async (req, res) => {
  try {
    const { name, phone, address, type } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Vui lòng nhập tên khách hàng!" });
    }

    const newCustomer = new Customer({
      name,
      phone: phone || "",
      address: address || "",
      type: type || "Normal",
      active: true,
    });

    await newCustomer.save();
    res.status(201).json({
      message: "Thêm khách hàng thành công!",
      customer: newCustomer,
    });
  } catch (error) {
    console.error("Create customer error:", error);
    res.status(500).json({ message: "Lỗi server khi thêm khách hàng!" });
  }
});

// ✏️ Cập nhật khách hàng
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { name, phone, address, type, active } = req.body;
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ message: "Không tìm thấy khách hàng!" });
    }

    if (name) customer.name = name;
    if (phone !== undefined) customer.phone = phone;
    if (address !== undefined) customer.address = address;
    if (type) customer.type = type;
    if (active !== undefined) customer.active = active === true || active === "true";

    await customer.save();
    res.json({
      message: "Cập nhật khách hàng thành công!",
      customer,
    });
  } catch (error) {
    console.error("Update customer error:", error);
    res.status(500).json({ message: "Lỗi server khi cập nhật khách hàng!" });
  }
});

// ✅ Active/Deactive khách hàng
router.patch("/:id/active", verifyToken, async (req, res) => {
  try {
    const { active } = req.body;
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ message: "Không tìm thấy khách hàng!" });
    }

    customer.active = active === true || active === "true";
    await customer.save();

    res.json({
      message: customer.active ? "Kích hoạt khách hàng thành công!" : "Vô hiệu hóa khách hàng thành công!",
      customer,
    });
  } catch (error) {
    console.error("Toggle customer active error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 🗑️ Xóa khách hàng
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: "Không tìm thấy khách hàng!" });
    }

    res.json({ message: "Xóa khách hàng thành công!" });
  } catch (error) {
    console.error("Delete customer error:", error);
    res.status(500).json({ message: "Lỗi server khi xóa khách hàng!" });
  }
});

// 📊 Thống kê khách hàng
router.get("/:id/statistics", verifyToken, async (req, res) => {
  try {
    const customerId = req.params.id;
    const { startDate, endDate } = req.query;

    const query = { customer: customerId, status: "completed" };
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const invoices = await Invoice.find(query).sort({ createdAt: -1 });

    const totalOrders = invoices.length;
    const totalSpent = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

    res.json({
      totalOrders,
      totalSpent,
      averageOrderValue,
      invoices: invoices.slice(0, 10), // 10 hóa đơn gần nhất
    });
  } catch (error) {
    console.error("Get customer statistics error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

module.exports = router;

