const express = require("express");
const router = express.Router();
const Voucher = require("../models/Voucher");
const Product = require("../models/Product");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");

// 📋 Lấy danh sách voucher (Public: chỉ voucher hợp lệ, Admin: tất cả)
router.get("/", async (req, res) => {
  try {
    const { code, status, page = 1, limit = 10 } = req.query;
    const query = {};

    // Nếu có code, tìm voucher theo code
    if (code) {
      query.code = code.toUpperCase();
    }

    // Customer chỉ xem voucher hợp lệ và đang hiển thị
    if (!req.user || req.user.role !== "admin") {
      const now = new Date();
      query.status = 1;
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
      query.$expr = { $lt: ["$usedCount", "$quantity"] };
    } else {
      // Admin có thể lọc theo status
      if (status !== undefined) {
        query.status = parseInt(status);
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const vouchers = await Voucher.find(query)
      .populate("applicableProducts", "name")
      .populate("applicableCategories", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Voucher.countDocuments(query);

    res.json({
      vouchers,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Get vouchers error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 📋 Lấy chi tiết voucher
router.get("/:id", async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id)
      .populate("applicableProducts", "name image price")
      .populate("applicableCategories", "name");

    if (!voucher) {
      return res.status(404).json({ message: "Không tìm thấy voucher!" });
    }

    res.json(voucher);
  } catch (error) {
    console.error("Get voucher error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 🔍 Kiểm tra voucher có hợp lệ không
router.post("/check", verifyToken, async (req, res) => {
  try {
    const { code, orderValue, productIds } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Vui lòng nhập mã voucher!" });
    }

    const voucher = await Voucher.findOne({ code: code.toUpperCase() })
      .populate("applicableProducts", "name category")
      .populate("applicableCategories", "name");

    if (!voucher) {
      return res.status(404).json({ message: "Mã voucher không tồn tại!" });
    }

    // Kiểm tra trạng thái
    if (voucher.status === 0) {
      return res.status(400).json({ message: "Voucher đã bị vô hiệu hóa!" });
    }

    // Kiểm tra số lượng
    if (voucher.usedCount >= voucher.quantity) {
      return res.status(400).json({ message: "Voucher đã hết lượt sử dụng!" });
    }

    // Kiểm tra thời gian
    const now = new Date();
    if (now < voucher.startDate) {
      return res.status(400).json({ message: "Voucher chưa có hiệu lực!" });
    }
    if (now > voucher.endDate) {
      return res.status(400).json({ message: "Voucher đã hết hạn!" });
    }

    // Kiểm tra đơn hàng tối thiểu
    if (orderValue && orderValue < voucher.minOrderValue) {
      return res.status(400).json({ 
        message: `Đơn hàng tối thiểu ${voucher.minOrderValue.toLocaleString()} VNĐ để sử dụng voucher này!` 
      });
    }

    // Kiểm tra user được áp dụng
    if (voucher.applicableUsers.length > 0) {
      const isApplicable = voucher.applicableUsers.some(
        id => id.toString() === req.user.userId.toString()
      );
      if (!isApplicable) {
        return res.status(400).json({ message: "Bạn không được sử dụng voucher này!" });
      }
    }

    // Kiểm tra sản phẩm áp dụng
    if (productIds && productIds.length > 0) {
      if (voucher.applicableProducts.length > 0) {
        const applicable = productIds.some(productId => 
          voucher.applicableProducts.some(p => p._id.toString() === productId.toString())
        );
        if (!applicable) {
          return res.status(400).json({ message: "Voucher không áp dụng cho sản phẩm này!" });
        }
      }
    }

    // Tính toán giảm giá
    let discountAmount = 0;
    if (orderValue) {
      if (voucher.type === "percentage") {
        discountAmount = (orderValue * voucher.value) / 100;
        if (voucher.maxDiscount && discountAmount > voucher.maxDiscount) {
          discountAmount = voucher.maxDiscount;
        }
      } else {
        discountAmount = voucher.value;
      }
    }

    res.json({
      valid: true,
      voucher: {
        id: voucher._id,
        code: voucher.code,
        name: voucher.name,
        type: voucher.type,
        value: voucher.value,
        discountAmount,
        maxDiscount: voucher.maxDiscount,
      },
    });
  } catch (error) {
    console.error("Check voucher error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// ➕ Tạo voucher mới (Admin)
router.post("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      type,
      value,
      minOrderValue,
      maxDiscount,
      quantity,
      startDate,
      endDate,
      applicableProducts,
      applicableCategories,
      applicableUsers,
      status,
    } = req.body;

    if (!code || !name || !type || !value || !quantity || !startDate || !endDate) {
      return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin!" });
    }

    // Kiểm tra code đã tồn tại
    const existingVoucher = await Voucher.findOne({ code: code.toUpperCase() });
    if (existingVoucher) {
      return res.status(400).json({ message: "Mã voucher đã tồn tại!" });
    }

    // Kiểm tra thời gian
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({ message: "Ngày kết thúc phải sau ngày bắt đầu!" });
    }

    // Kiểm tra giá trị
    if (type === "percentage" && (value <= 0 || value > 100)) {
      return res.status(400).json({ message: "Phần trăm giảm giá phải từ 1-100!" });
    }
    if (type === "fixed" && value <= 0) {
      return res.status(400).json({ message: "Số tiền giảm giá phải lớn hơn 0!" });
    }

    const voucher = new Voucher({
      code: code.toUpperCase(),
      name,
      description,
      type,
      value,
      minOrderValue: minOrderValue || 0,
      maxDiscount: type === "percentage" ? maxDiscount : null,
      quantity,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      applicableProducts: applicableProducts || [],
      applicableCategories: applicableCategories || [],
      applicableUsers: applicableUsers || [],
      status: status !== undefined ? status : 1,
    });

    await voucher.save();

    await voucher.populate("applicableProducts", "name");
    await voucher.populate("applicableCategories", "name");

    res.status(201).json({
      message: "Tạo voucher thành công!",
      voucher,
    });
  } catch (error) {
    console.error("Create voucher error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Mã voucher đã tồn tại!" });
    }
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// ✏️ Cập nhật voucher (Admin)
router.put("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      type,
      value,
      minOrderValue,
      maxDiscount,
      quantity,
      startDate,
      endDate,
      applicableProducts,
      applicableCategories,
      applicableUsers,
      status,
    } = req.body;

    const voucher = await Voucher.findById(req.params.id);

    if (!voucher) {
      return res.status(404).json({ message: "Không tìm thấy voucher!" });
    }

    if (name) voucher.name = name;
    if (description !== undefined) voucher.description = description;
    if (type) voucher.type = type;
    if (value !== undefined) voucher.value = value;
    if (minOrderValue !== undefined) voucher.minOrderValue = minOrderValue;
    if (maxDiscount !== undefined) voucher.maxDiscount = maxDiscount;
    if (quantity !== undefined) voucher.quantity = quantity;
    if (startDate) voucher.startDate = new Date(startDate);
    if (endDate) voucher.endDate = new Date(endDate);
    if (applicableProducts !== undefined) voucher.applicableProducts = applicableProducts;
    if (applicableCategories !== undefined) voucher.applicableCategories = applicableCategories;
    if (applicableUsers !== undefined) voucher.applicableUsers = applicableUsers;
    if (status !== undefined) voucher.status = status;

    // Kiểm tra thời gian
    if (voucher.startDate >= voucher.endDate) {
      return res.status(400).json({ message: "Ngày kết thúc phải sau ngày bắt đầu!" });
    }

    await voucher.save();

    await voucher.populate("applicableProducts", "name");
    await voucher.populate("applicableCategories", "name");

    res.json({
      message: "Cập nhật voucher thành công!",
      voucher,
    });
  } catch (error) {
    console.error("Update voucher error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// ❌ Xóa voucher (Admin)
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id);

    if (!voucher) {
      return res.status(404).json({ message: "Không tìm thấy voucher!" });
    }

    await voucher.deleteOne();

    res.json({
      message: "Xóa voucher thành công!",
    });
  } catch (error) {
    console.error("Delete voucher error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

module.exports = router;

