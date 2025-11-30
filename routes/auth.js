// Import các thư viện và modules cần thiết
const express = require("express"); // Framework web server
const router = express.Router(); // Router để định nghĩa các routes
const bcrypt = require("bcryptjs"); // Thư viện mã hóa mật khẩu (hash password)
const jwt = require("jsonwebtoken"); // Thư viện tạo và verify JWT token
const User = require("../models/User"); // Model User từ database
const { verifyToken } = require("../middleware/authMiddleware"); // Middleware xác thực JWT token

/**
 * 🔐 Đăng nhập
 * POST /api/auth/login
 * Xác thực user và trả về JWT token
 * @body {String} username - Tên đăng nhập
 * @body {String} password - Mật khẩu
 * @body {Boolean} rememberMe - Có lưu mật khẩu không (optional, mặc định false)
 * @returns {Object} { message, token, user }
 */
router.post("/login", async (req, res) => {
  try {
    // Lấy thông tin từ request body
    const { username, password, rememberMe } = req.body;

    // Validate input: phải có username và password
    if (!username || !password) {
      return res.status(400).json({ message: "Vui lòng nhập tên đăng nhập và mật khẩu!" });
    }

    // Tìm user trong database theo username
    const user = await User.findOne({ username });
    if (!user) {
      // Không tiết lộ user có tồn tại hay không (bảo mật)
      return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không đúng!" });
    }

    // Kiểm tra tài khoản bị khóa vĩnh viễn bởi admin
    // isBanned = true nghĩa là admin đã khóa tài khoản này
    if (user.isBanned) {
      return res.status(403).json({ 
        message: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ admin để được hỗ trợ!" 
      });
    }

    // Kiểm tra tài khoản bị khóa tạm thời (sau 5 lần đăng nhập sai)
    // isLocked = true nghĩa là đã đăng nhập sai quá nhiều lần
    if (user.isLocked) {
      // Kiểm tra xem thời gian khóa đã hết chưa
      if (user.lockUntil && user.lockUntil > Date.now()) {
        // Tính số phút còn lại trước khi mở khóa
        const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
        return res.status(403).json({ 
          message: `Tài khoản đã bị khóa. Vui lòng thử lại sau ${minutesLeft} phút!` 
        });
      } else {
        // Hết thời gian khóa, mở lại tài khoản
        user.isLocked = false;
        user.loginAttempts = 0;
        user.lockUntil = null;
      }
    }

    // Kiểm tra mật khẩu bằng bcrypt.compare()
    // So sánh password plain text với password đã hash trong database
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Mật khẩu sai → tăng số lần đăng nhập sai
      user.loginAttempts += 1;
      
      // Khóa tài khoản sau 5 lần sai
      if (user.loginAttempts >= 5) {
        user.isLocked = true;
        user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // Khóa 30 phút (30 * 60 * 1000 ms)
        await user.save();
        return res.status(403).json({ 
          message: "Đăng nhập sai quá 5 lần. Tài khoản đã bị khóa 30 phút!" 
        });
      }
      
      // Lưu số lần đăng nhập sai
      await user.save();
      return res.status(401).json({ 
        message: `Tên đăng nhập hoặc mật khẩu không đúng! (Còn ${5 - user.loginAttempts} lần thử)` 
      });
    }

    // Đăng nhập thành công - reset loginAttempts và mở khóa tài khoản
    user.loginAttempts = 0;
    user.isLocked = false;
    user.lockUntil = null;
    await user.save();

    // Tạo JWT token để xác thực các request sau
    // expiresIn: Thời gian hết hạn của token
    // - rememberMe = true: 30 ngày (lưu mật khẩu)
    // - rememberMe = false: 1 ngày (không lưu mật khẩu)
    const expiresIn = rememberMe ? "30d" : "1d";
    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role }, // Payload chứa thông tin user
      process.env.JWT_SECRET, // Secret key để ký token
      { expiresIn } // Thời gian hết hạn
    );

    // Trả về thông tin user (không có password để bảo mật)
    const userInfo = {
      id: user._id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
    };

    // Trả về token và thông tin user
    res.json({
      message: "Đăng nhập thành công!",
      token, // JWT token để dùng cho các request sau
      user: userInfo, // Thông tin user (không có password)
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Lỗi server khi đăng nhập!" });
  }
});

/**
 * 🚪 Đăng xuất
 * POST /api/auth/logout
 * Lưu ý: JWT là stateless, nên đăng xuất chỉ cần xóa token ở client
 * Server không cần xử lý gì (không có session để xóa)
 * @middleware verifyToken - Phải đăng nhập mới đăng xuất được
 * @returns {Object} { message }
 */
router.post("/logout", verifyToken, (req, res) => {
  // Chỉ trả về message thành công
  // Client sẽ xóa token khỏi localStorage/sessionStorage
  res.json({ message: "Đăng xuất thành công!" });
});

/**
 * 🔑 Đổi mật khẩu
 * PUT /api/auth/change-password
 * Cho phép user đổi mật khẩu khi đã đăng nhập
 * @middleware verifyToken - Phải đăng nhập
 * @body {String} oldPassword - Mật khẩu cũ
 * @body {String} newPassword - Mật khẩu mới
 * @body {String} confirmPassword - Xác nhận mật khẩu mới
 * @returns {Object} { message }
 */
router.put("/change-password", verifyToken, async (req, res) => {
  try {
    // Lấy thông tin từ request body
    const { oldPassword, newPassword, confirmPassword } = req.body;
    
    // Lấy userId từ JWT token (đã được verify bởi verifyToken middleware)
    const userId = req.user.userId;

    // Validate input: phải có đầy đủ 3 trường
    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin!" });
    }

    // Validate: mật khẩu mới và xác nhận phải khớp nhau
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Mật khẩu mới và xác nhận mật khẩu không khớp!" });
    }

    // Validate: mật khẩu mới phải có ít nhất 6 ký tự
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự!" });
    }

    // Tìm user trong database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng!" });
    }

    // Kiểm tra mật khẩu cũ có đúng không
    // So sánh oldPassword (plain text) với user.password (đã hash)
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Mật khẩu cũ không đúng!" });
    }

    // Mã hóa mật khẩu mới bằng bcrypt
    // bcrypt.hash(password, saltRounds) - saltRounds = 10 (độ phức tạp)
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Cập nhật mật khẩu mới và thời gian cập nhật
    user.password = hashedPassword;
    user.updatedAt = Date.now();
    await user.save();

    // Trả về thông báo thành công
    res.json({ message: "Đổi mật khẩu thành công!" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Lỗi server khi đổi mật khẩu!" });
  }
});

/**
 * 👤 Đăng ký (chỉ cho customer)
 * POST /api/auth/register
 * Tạo tài khoản mới cho khách hàng
 * @body {String} username - Tên đăng nhập (unique)
 * @body {String} password - Mật khẩu (tối thiểu 6 ký tự)
 * @body {String} email - Email (unique)
 * @body {String} fullName - Họ tên
 * @body {String} phone - Số điện thoại (optional)
 * @returns {Object} { message, token, user }
 */
router.post("/register", async (req, res) => {
  try {
    // Lấy thông tin từ request body
    const { username, password, email, fullName, phone } = req.body;

    // Validate input: phải có đầy đủ thông tin bắt buộc
    if (!username || !password || !email || !fullName) {
      return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin bắt buộc!" });
    }

    // Validate: mật khẩu phải có ít nhất 6 ký tự
    if (password.length < 6) {
      return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự!" });
    }

    // Kiểm tra username hoặc email đã tồn tại chưa
    // $or: tìm user có username HOẶC email trùng
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      // Nếu tài khoản bị khóa (isBanned), không cho đăng ký lại bằng email đó
      if (existingUser.isBanned) {
        return res.status(403).json({ message: "Email này đã bị khóa và không thể sử dụng!" });
      }
      return res.status(400).json({ message: "Tên đăng nhập hoặc email đã tồn tại!" });
    }

    // Mã hóa mật khẩu bằng bcrypt trước khi lưu vào database
    // bcrypt.hash(password, saltRounds) - saltRounds = 10
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo user mới với role = "customer" (chỉ customer mới được đăng ký)
    const newUser = new User({
      username,
      password: hashedPassword, // Lưu password đã hash, không lưu plain text
      email,
      fullName,
      phone: phone || "", // Phone là optional, mặc định là chuỗi rỗng
      role: "customer", // Mặc định là customer
    });

    // Lưu user vào database
    await newUser.save();

    // Tạo JWT token để user có thể đăng nhập ngay sau khi đăng ký
    // expiresIn: "1d" (1 ngày)
    const token = jwt.sign(
      { userId: newUser._id, username: newUser.username, role: newUser.role }, // Payload
      process.env.JWT_SECRET, // Secret key
      { expiresIn: "1d" } // Thời gian hết hạn
    );

    // Tạo object userInfo (không có password) để trả về
    const userInfo = {
      id: newUser._id,
      username: newUser.username,
      email: newUser.email,
      fullName: newUser.fullName,
      role: newUser.role,
      avatar: newUser.avatar,
      phone: newUser.phone,
    };

    // Trả về token và thông tin user (status 201 = Created)
    res.status(201).json({
      message: "Đăng ký thành công!",
      token, // JWT token
      user: userInfo, // Thông tin user (không có password)
    });
  } catch (error) {
    console.error("Register error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Tên đăng nhập hoặc email đã tồn tại!" });
    }
    res.status(500).json({ message: "Lỗi server khi đăng ký!" });
  }
});

/**
 * 👤 Lấy thông tin user hiện tại
 * GET /api/auth/me
 * Lấy thông tin của user đang đăng nhập
 * @middleware verifyToken - Phải đăng nhập
 * @returns {Object} User object (không có password)
 */
router.get("/me", verifyToken, async (req, res) => {
  try {
    // Tìm user theo userId từ JWT token
    // .select("-password"): Loại bỏ trường password khỏi kết quả (bảo mật)
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng!" });
    }
    // Trả về thông tin user (không có password)
    res.json(user);
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

/**
 * ✏️ Cập nhật thông tin cá nhân (Customer)
 * PUT /api/auth/me
 * Cho phép user cập nhật thông tin cá nhân (fullName, email, phone, address, gender, dateOfBirth, avatar)
 * @middleware verifyToken - Phải đăng nhập
 * @body {String} fullName - Họ tên (optional)
 * @body {String} email - Email (optional, phải unique)
 * @body {String} phone - Số điện thoại (optional)
 * @body {String} address - Địa chỉ (optional)
 * @body {String} gender - Giới tính (optional)
 * @body {String} dateOfBirth - Ngày sinh (optional)
 * @body {String} avatar - URL avatar (optional)
 * @returns {Object} { message, user }
 */
router.put("/me", verifyToken, async (req, res) => {
  try {
    // Lấy thông tin từ request body (tất cả đều optional)
    const { fullName, email, phone, address, gender, dateOfBirth, avatar } = req.body;
    
    // Tìm user theo userId từ JWT token
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng!" });
    }

    // Cập nhật thông tin (chỉ cập nhật các trường có trong request body)
    if (fullName) user.fullName = fullName;
    
    if (email) {
      // Kiểm tra email đã tồn tại chưa (trừ chính mình)
      // $ne: not equal - tìm user có email trùng nhưng _id khác
      const existingUser = await User.findOne({ email, _id: { $ne: user._id } });
      if (existingUser) {
        return res.status(400).json({ message: "Email đã được sử dụng!" });
      }
      user.email = email;
    }
    
    // phone !== undefined: Cho phép set phone = "" (chuỗi rỗng)
    if (phone !== undefined) user.phone = phone;
    
    if (gender) user.gender = gender;
    
    // Chuyển dateOfBirth từ string sang Date object
    if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);
    
    // avatar !== undefined: Cho phép set avatar = "" (xóa avatar)
    if (avatar !== undefined) user.avatar = avatar;
    
    // address !== undefined: Cho phép set address = "" (xóa address)
    if (address !== undefined) user.address = address;
    
    // Cập nhật thời gian cập nhật
    user.updatedAt = Date.now();
    
    // Lưu vào database
    await user.save();

    // Chuyển user sang object và xóa password trước khi trả về
    const userResponse = user.toObject();
    delete userResponse.password;

    // Trả về thông báo thành công và thông tin user đã cập nhật
    res.json({
      message: "Cập nhật thông tin thành công!",
      user: userResponse, // Thông tin user (không có password)
    });
  } catch (error) {
    console.error("Update profile error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Email đã được sử dụng!" });
    }
    res.status(500).json({ message: "Lỗi server!" });
  }
});

/**
 * 🔑 Quên mật khẩu - Gửi reset token
 * POST /api/auth/forgot-password
 * Tạo reset token và gửi link đặt lại mật khẩu (qua email)
 * @body {String} email - Email (optional, nếu có email thì dùng email)
 * @body {String} username - Tên đăng nhập (optional, nếu không có email thì dùng username)
 * @returns {Object} { success, message, resetToken? (dev only), expiresAt? (dev only) }
 */
router.post("/forgot-password", async (req, res) => {
  try {
    // Lấy email hoặc username từ request body
    const { email, username } = req.body;

    // Phải có email hoặc username (ít nhất một trong hai)
    if (!email && !username) {
      return res.status(400).json({ 
        success: false,
        message: "Vui lòng nhập email hoặc tên đăng nhập!" 
      });
    }

    // Tìm user theo email hoặc username
    // Ưu tiên email nếu có, nếu không thì dùng username
    const query = {};
    if (email) {
      query.email = email;
    } else {
      query.username = username;
    }

    const user = await User.findOne(query);
    
    // Bảo mật: Không tiết lộ thông tin user có tồn tại hay không
    // Luôn trả về message thành công (dù user có tồn tại hay không)
    // Để tránh attacker biết được email/username nào tồn tại trong hệ thống
    if (!user) {
      // Trả về thành công để không tiết lộ thông tin
      return res.json({ 
        success: true,
        message: "Nếu email/tên đăng nhập tồn tại, chúng tôi đã gửi link đặt lại mật khẩu!" 
      });
    }

    // Kiểm tra tài khoản bị khóa
    if (user.isBanned) {
      return res.status(403).json({ 
        success: false,
        message: "Tài khoản đã bị khóa. Vui lòng liên hệ admin!" 
      });
    }

    // Tạo reset token (random string 64 ký tự hex)
    // crypto.randomBytes(32): Tạo 32 bytes random → 64 ký tự hex
    const crypto = require("crypto");
    const resetToken = crypto.randomBytes(32).toString("hex");
    
    // Token hết hạn sau 1 giờ (60 * 60 * 1000 milliseconds)
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);

    // Lưu token và thời gian hết hạn vào database
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpires;
    await user.save();

    // TODO: Gửi email với reset token
    // Trong production, nên gửi email với link reset password
    // const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    // await sendEmail(user.email, "Reset Password", resetUrl);
    
    // Log token trong development (để test)
    console.log(`🔑 Reset password token for ${user.email || user.username}: ${resetToken}`);
    console.log(`⏰ Token expires at: ${resetTokenExpires}`);

    // Trong môi trường development, trả về token để test
    // Trong production, chỉ trả về message thành công (không trả về token)
    const isDevelopment = process.env.NODE_ENV !== "production";
    
    res.json({ 
      success: true,
      message: "Nếu email/tên đăng nhập tồn tại, chúng tôi đã gửi link đặt lại mật khẩu!",
      ...(isDevelopment && {
        // Chỉ trả về token trong development mode
        resetToken: resetToken, // Token để test (chỉ trong dev)
        expiresAt: resetTokenExpires, // Thời gian hết hạn
        note: "⚠️ Development mode: Token được trả về để test. Trong production sẽ gửi qua email."
      })
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ 
      success: false,
      message: "Lỗi server khi xử lý yêu cầu quên mật khẩu!" 
    });
  }
});

/**
 * 🔑 Đặt lại mật khẩu với reset token
 * POST /api/auth/reset-password
 * Đặt lại mật khẩu mới bằng reset token (từ link trong email)
 * @body {String} token - Reset token (từ link email)
 * @body {String} newPassword - Mật khẩu mới
 * @body {String} confirmPassword - Xác nhận mật khẩu mới
 * @returns {Object} { success, message }
 */
router.post("/reset-password", async (req, res) => {
  try {
    // Lấy thông tin từ request body
    const { token, newPassword, confirmPassword } = req.body;

    // Validate input: phải có đầy đủ 3 trường
    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ 
        success: false,
        message: "Vui lòng điền đầy đủ thông tin!" 
      });
    }

    // Validate: mật khẩu mới và xác nhận phải khớp nhau
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        success: false,
        message: "Mật khẩu mới và xác nhận mật khẩu không khớp!" 
      });
    }

    // Validate: mật khẩu mới phải có ít nhất 6 ký tự
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: "Mật khẩu mới phải có ít nhất 6 ký tự!" 
      });
    }

    // Tìm user với token hợp lệ và chưa hết hạn
    // $gt: greater than - resetPasswordExpires > Date.now() (token chưa hết hạn)
    const user = await User.findOne({
      resetPasswordToken: token, // Token phải khớp
      resetPasswordExpires: { $gt: Date.now() } // Token chưa hết hạn
    });

    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: "Token không hợp lệ hoặc đã hết hạn! Vui lòng yêu cầu đặt lại mật khẩu lại." 
      });
    }

    // Kiểm tra tài khoản bị khóa
    if (user.isBanned) {
      return res.status(403).json({ 
        success: false,
        message: "Tài khoản đã bị khóa. Vui lòng liên hệ admin!" 
      });
    }

    // Mã hóa mật khẩu mới bằng bcrypt
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Cập nhật mật khẩu mới và xóa reset token
    user.password = hashedPassword;
    user.resetPasswordToken = undefined; // Xóa token sau khi dùng
    user.resetPasswordExpires = undefined; // Xóa thời gian hết hạn
    user.updatedAt = Date.now();
    
    // Reset login attempts khi đặt lại mật khẩu
    // Cho phép user đăng nhập lại sau khi đặt lại mật khẩu
    user.loginAttempts = 0;
    user.isLocked = false;
    user.lockUntil = null;
    
    // Lưu vào database
    await user.save();

    // Log thành công
    console.log(`✅ Password reset successful for user: ${user.email || user.username}`);

    // Trả về thông báo thành công
    res.json({ 
      success: true,
      message: "Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại." 
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ 
      success: false,
      message: "Lỗi server khi đặt lại mật khẩu!" 
    });
  }
});

module.exports = router;

