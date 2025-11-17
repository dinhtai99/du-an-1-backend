const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const Voucher = require("../models/Voucher");
const Product = require("../models/Product");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");

// 📋 Lấy danh sách voucher (Public: chỉ voucher hợp lệ, Admin: tất cả)
router.get("/", async (req, res) => {
  try {
    const { code, status, active, page = 1, limit = 100 } = req.query;
    const query = {};

    // Nếu có code, tìm voucher theo code
    if (code) {
      query.code = code.toUpperCase();
    }

    // Kiểm tra token nếu có (optional)
    let isAdmin = false;
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && decoded.role === "admin") {
          isAdmin = true;
          req.user = decoded;
        }
      } catch (err) {
        // Token không hợp lệ, xử lý như customer
      }
    }

    // Customer chỉ xem voucher có status=1 (đang hiển thị)
    // Không filter theo thời gian và số lượng để customer có thể xem tất cả voucher
    if (!isAdmin) {
      query.status = 1;
    } else {
      // Admin có thể lọc theo status, nhưng mặc định lấy tất cả
      if (status !== undefined && status !== '') {
        query.status = parseInt(status);
      }
      // Admin xem tất cả voucher, không cần filter thêm
    }

    // Nếu có query param `active`, filter theo active (chỉ lấy voucher đang hoạt động)
    // Nếu không có `active` hoặc `active=false`, chỉ filter theo status=1
    if (active !== undefined && (active === 'true' || active === true)) {
      const now = new Date();
      query.status = 1;
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
      query.$expr = { $lt: ["$usedCount", "$quantity"] };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    console.log('🔍 Voucher query:', JSON.stringify(query, null, 2));
    console.log('👤 Is Admin:', isAdmin);
    console.log('📄 Page:', page, 'Limit:', limit);
    
    const vouchers = await Voucher.find(query)
      .populate("applicableProducts", "name")
      .populate("applicableCategories", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Voucher.countDocuments(query);

    console.log('✅ Found vouchers:', vouchers.length, 'Total:', total);

    // Map vouchers sang format Android app mong đợi
    const mappedVouchers = vouchers.map(voucher => {
      const now = new Date();
      let statusStr = "active";
      if (voucher.status === 0) {
        statusStr = "inactive";
      } else if (voucher.endDate < now) {
        statusStr = "expired";
      } else if (voucher.usedCount >= voucher.quantity) {
        statusStr = "expired";
      }

      return {
        _id: voucher._id.toString(),
        code: voucher.code,
        name: voucher.name,
        description: voucher.description || "",
        discount: voucher.value, // Map value → discount
        discountType: voucher.type, // Map type → discountType
        minOrderAmount: voucher.minOrderValue || 0,
        quantity: voucher.quantity,
        used: voucher.usedCount || 0, // Map usedCount → used
        startDate: voucher.startDate ? voucher.startDate.toISOString().split('T')[0] : null,
        endDate: voucher.endDate ? voucher.endDate.toISOString().split('T')[0] : null,
        status: statusStr, // Map status (0/1) → status ("active"/"inactive"/"expired")
        createdAt: voucher.createdAt ? voucher.createdAt.toISOString() : null,
        updatedAt: voucher.updatedAt ? voucher.updatedAt.toISOString() : null,
      };
    });

    // Trả về format Android app mong đợi
    res.json({
      success: true,
      message: "Lấy danh sách voucher thành công!",
      data: mappedVouchers,
    });
  } catch (error) {
    console.error("Get vouchers error:", error);
    res.status(500).json({ 
      success: false,
      message: "Lỗi server!",
      data: null
    });
  }
});

// 🔍 Validate voucher code (GET /api/vouchers/validate/{code})
// ⚠️ PHẢI ĐẶT TRƯỚC route /:id để Express match đúng
router.get("/validate/:code", async (req, res) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({ 
        success: false,
        message: "Vui lòng nhập mã voucher!",
        data: null
      });
    }

    const voucher = await Voucher.findOne({ code: code.toUpperCase() })
      .populate("applicableProducts", "name category")
      .populate("applicableCategories", "name");

    if (!voucher) {
      return res.status(404).json({ 
        success: false,
        message: "Mã voucher không tồn tại!",
        data: null
      });
    }

    // Kiểm tra trạng thái
    if (voucher.status === 0) {
      return res.status(400).json({ 
        success: false,
        message: "Voucher đã bị vô hiệu hóa!",
        data: null
      });
    }

    // Kiểm tra số lượng
    if (voucher.usedCount >= voucher.quantity) {
      return res.status(400).json({ 
        success: false,
        message: "Voucher đã hết lượt sử dụng!",
        data: null
      });
    }

    // Kiểm tra thời gian
    const now = new Date();
    if (now < voucher.startDate) {
      return res.status(400).json({ 
        success: false,
        message: "Voucher chưa có hiệu lực!",
        data: null
      });
    }
    if (now > voucher.endDate) {
      return res.status(400).json({ 
        success: false,
        message: "Voucher đã hết hạn!",
        data: null
      });
    }

    // Map voucher sang format Android app mong đợi
    let statusStr = "active";
    if (voucher.status === 0) {
      statusStr = "inactive";
    } else if (voucher.endDate < now) {
      statusStr = "expired";
    } else if (voucher.usedCount >= voucher.quantity) {
      statusStr = "expired";
    }

    const mappedVoucher = {
      _id: voucher._id.toString(),
      code: voucher.code,
      name: voucher.name,
      description: voucher.description || "",
      discount: voucher.value,
      discountType: voucher.type,
      minOrderAmount: voucher.minOrderValue || 0,
      quantity: voucher.quantity,
      used: voucher.usedCount || 0,
      startDate: voucher.startDate ? voucher.startDate.toISOString().split('T')[0] : null,
      endDate: voucher.endDate ? voucher.endDate.toISOString().split('T')[0] : null,
      status: statusStr,
      createdAt: voucher.createdAt ? voucher.createdAt.toISOString() : null,
      updatedAt: voucher.updatedAt ? voucher.updatedAt.toISOString() : null,
    };

    res.json({
      success: true,
      message: "Voucher hợp lệ!",
      data: mappedVoucher,
    });
  } catch (error) {
    console.error("Validate voucher error:", error);
    res.status(500).json({ 
      success: false,
      message: "Lỗi server!",
      data: null
    });
  }
});

// 📋 Lấy chi tiết voucher
router.get("/:id", async (req, res) => {
  try {
    const voucher = await Voucher.findById(req.params.id)
      .populate("applicableProducts", "name image price")
      .populate("applicableCategories", "name");

    if (!voucher) {
      return res.status(404).json({ 
        success: false,
        message: "Không tìm thấy voucher!",
        data: null
      });
    }

    // Map voucher sang format Android app mong đợi
    const now = new Date();
    let statusStr = "active";
    if (voucher.status === 0) {
      statusStr = "inactive";
    } else if (voucher.endDate < now) {
      statusStr = "expired";
    } else if (voucher.usedCount >= voucher.quantity) {
      statusStr = "expired";
    }

    const mappedVoucher = {
      _id: voucher._id.toString(),
      code: voucher.code,
      name: voucher.name,
      description: voucher.description || "",
      discount: voucher.value,
      discountType: voucher.type,
      minOrderAmount: voucher.minOrderValue || 0,
      quantity: voucher.quantity,
      used: voucher.usedCount || 0,
      startDate: voucher.startDate ? voucher.startDate.toISOString().split('T')[0] : null,
      endDate: voucher.endDate ? voucher.endDate.toISOString().split('T')[0] : null,
      status: statusStr,
      createdAt: voucher.createdAt ? voucher.createdAt.toISOString() : null,
      updatedAt: voucher.updatedAt ? voucher.updatedAt.toISOString() : null,
    };

    res.json({
      success: true,
      message: "Lấy chi tiết voucher thành công!",
      data: mappedVoucher,
    });
  } catch (error) {
    console.error("Get voucher error:", error);
    res.status(500).json({ 
      success: false,
      message: "Lỗi server!",
      data: null
    });
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

