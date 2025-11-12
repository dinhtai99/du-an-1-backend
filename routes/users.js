const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { verifyToken, requireAdmin } = require("../middleware/authMiddleware");

// 👥 Lấy danh sách nhân viên (Admin only)
router.get("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { search, role, page = 1, limit = 10 } = req.query;
    const query = {};

    // Tìm kiếm theo tên hoặc số điện thoại
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { username: { $regex: search, $options: "i" } },
      ];
    }

    // Lọc theo role
    if (role) {
      query.role = role;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách nhân viên!" });
  }
});

// 👤 Lấy chi tiết nhân viên (Admin only)
router.get("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy nhân viên!" });
    }
    res.json(user);
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// ➕ Thêm nhân viên mới (Admin only)
router.post("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { username, password, fullName, gender, dateOfBirth, phone, role, avatar } = req.body;

    if (!username || !password || !fullName) {
      return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin bắt buộc!" });
    }

    // Kiểm tra username đã tồn tại
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Tên đăng nhập đã tồn tại!" });
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      password: hashedPassword,
      fullName,
      gender: gender || "male",
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      phone,
      role: role || "staff",
      avatar: avatar || "",
    });

    await newUser.save();
    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json({
      message: "Thêm nhân viên thành công!",
      user: userResponse,
    });
  } catch (error) {
    console.error("Create user error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Tên đăng nhập đã tồn tại!" });
    }
    res.status(500).json({ message: "Lỗi server khi thêm nhân viên!" });
  }
});

// ✏️ Cập nhật nhân viên (Admin only)
router.put("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const { fullName, gender, dateOfBirth, phone, role, avatar, password } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy nhân viên!" });
    }

    // Cập nhật thông tin
    if (fullName) user.fullName = fullName;
    if (gender) user.gender = gender;
    if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);
    if (phone !== undefined) user.phone = phone;
    if (role) user.role = role;
    if (avatar !== undefined) user.avatar = avatar;

    // Đổi mật khẩu nếu có
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự!" });
      }
      user.password = await bcrypt.hash(password, 10);
    }

    user.updatedAt = Date.now();
    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      message: "Cập nhật nhân viên thành công!",
      user: userResponse,
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ message: "Lỗi server khi cập nhật nhân viên!" });
  }
});

// 🗑️ Xóa nhân viên (Admin only)
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Không cho xóa chính mình
    if (userId === req.user.userId) {
      return res.status(400).json({ message: "Không thể xóa chính tài khoản của bạn!" });
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy nhân viên!" });
    }

    res.json({ message: "Xóa nhân viên thành công!" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Lỗi server khi xóa nhân viên!" });
  }
});

module.exports = router;
