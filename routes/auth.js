const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { verifyToken } = require("../middleware/authMiddleware");

// 🔐 Đăng nhập
router.post("/login", async (req, res) => {
  try {
    const { username, password, rememberMe } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Vui lòng nhập tên đăng nhập và mật khẩu!" });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không đúng!" });
    }

    // Kiểm tra tài khoản bị khóa
    if (user.isLocked) {
      if (user.lockUntil && user.lockUntil > Date.now()) {
        const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
        return res.status(403).json({ 
          message: `Tài khoản đã bị khóa. Vui lòng thử lại sau ${minutesLeft} phút!` 
        });
      } else {
        // Hết thời gian khóa, mở lại
        user.isLocked = false;
        user.loginAttempts = 0;
        user.lockUntil = null;
      }
    }

    // Kiểm tra mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Tăng số lần đăng nhập sai
      user.loginAttempts += 1;
      
      // Khóa sau 5 lần sai
      if (user.loginAttempts >= 5) {
        user.isLocked = true;
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // Khóa 30 phút
        await user.save();
        return res.status(403).json({ 
          message: "Đăng nhập sai quá 5 lần. Tài khoản đã bị khóa 30 phút!" 
        });
      }
      
      await user.save();
      return res.status(401).json({ 
        message: `Tên đăng nhập hoặc mật khẩu không đúng! (Còn ${5 - user.loginAttempts} lần thử)` 
      });
    }

    // Đăng nhập thành công - reset loginAttempts
    user.loginAttempts = 0;
    user.isLocked = false;
    user.lockUntil = null;
    await user.save();

    // Tạo JWT token
    const expiresIn = rememberMe ? "30d" : "1d"; // Lưu mật khẩu: 30 ngày, không: 1 ngày
    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn }
    );

    // Trả về thông tin user (không có password)
    const userInfo = {
      id: user._id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
    };

    res.json({
      message: "Đăng nhập thành công!",
      token,
      user: userInfo,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Lỗi server khi đăng nhập!" });
  }
});

// 🚪 Đăng xuất (chỉ cần xóa token ở client, không cần xử lý ở server)
router.post("/logout", verifyToken, (req, res) => {
  res.json({ message: "Đăng xuất thành công!" });
});

// 🔑 Đổi mật khẩu
router.put("/change-password", verifyToken, async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user.userId;

    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin!" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Mật khẩu mới và xác nhận mật khẩu không khớp!" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự!" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng!" });
    }

    // Kiểm tra mật khẩu cũ
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Mật khẩu cũ không đúng!" });
    }

    // Mã hóa mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.updatedAt = Date.now();
    await user.save();

    res.json({ message: "Đổi mật khẩu thành công!" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Lỗi server khi đổi mật khẩu!" });
  }
});

// 👤 Đăng ký (chỉ cho customer)
router.post("/register", async (req, res) => {
  try {
    const { username, password, email, fullName, phone } = req.body;

    if (!username || !password || !email || !fullName) {
      return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin bắt buộc!" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự!" });
    }

    // Kiểm tra username đã tồn tại
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: "Tên đăng nhập hoặc email đã tồn tại!" });
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      password: hashedPassword,
      email,
      fullName,
      phone: phone || "",
      role: "customer",
    });

    await newUser.save();

    // Tạo JWT token
    const token = jwt.sign(
      { userId: newUser._id, username: newUser.username, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const userInfo = {
      id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      fullName: newUser.fullName,
      role: newUser.role,
      avatar: newUser.avatar,
      phone: newUser.phone,
    };

    res.status(201).json({
      message: "Đăng ký thành công!",
      token,
      user: userInfo,
    });
  } catch (error) {
    console.error("Register error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Tên đăng nhập hoặc email đã tồn tại!" });
    }
    res.status(500).json({ message: "Lỗi server khi đăng ký!" });
  }
});

// 👤 Lấy thông tin user hiện tại
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng!" });
    }
    res.json(user);
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// ✏️ Cập nhật thông tin cá nhân (Customer)
router.put("/me", verifyToken, async (req, res) => {
  try {
    const { fullName, email, phone, gender, dateOfBirth, avatar } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng!" });
    }

    // Cập nhật thông tin
    if (fullName) user.fullName = fullName;
    if (email) {
      // Kiểm tra email đã tồn tại chưa (trừ chính mình)
      const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({ message: "Email đã được sử dụng!" });
      }
      user.email = email;
    }
    if (phone !== undefined) user.phone = phone;
    if (gender) user.gender = gender;
    if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);
    if (avatar !== undefined) user.avatar = avatar;

    user.updatedAt = Date.now();
    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      message: "Cập nhật thông tin thành công!",
      user: userResponse,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Email đã được sử dụng!" });
    }
    res.status(500).json({ message: "Lỗi server!" });
  }
});

module.exports = router;

