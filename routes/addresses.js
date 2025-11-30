// Import các thư viện và modules cần thiết
const express = require("express"); // Framework web server
const router = express.Router(); // Router để định nghĩa các routes
const Address = require("../models/Address"); // Model Address từ database
const { verifyToken, requireCustomer } = require("../middleware/authMiddleware"); // Middleware xác thực và phân quyền

/**
 * 📍 Lấy danh sách địa chỉ (chỉ customer)
 * GET /api/addresses
 * Lấy danh sách địa chỉ của user đang đăng nhập
 * @middleware verifyToken - Phải đăng nhập
 * @middleware requireCustomer - Chỉ customer mới được truy cập
 * @returns {Array} Danh sách địa chỉ (sắp xếp: địa chỉ mặc định trước, sau đó theo ngày tạo)
 */
router.get("/", verifyToken, requireCustomer, async (req, res) => {
  try {
    // Tìm tất cả địa chỉ của user đang đăng nhập
    // sort({ isDefault: -1, createdAt: -1 }): Sắp xếp địa chỉ mặc định trước (isDefault = true), sau đó theo ngày tạo giảm dần
    const addresses = await Address.find({ user: req.user.userId }).sort({ isDefault: -1, createdAt: -1 });
    
    // Trả về danh sách địa chỉ
    res.json(addresses);
  } catch (error) {
    console.error("Get addresses error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

/**
 * 📍 Lấy địa chỉ mặc định (chỉ customer)
 * GET /api/addresses/default
 * Lấy địa chỉ mặc định của user đang đăng nhập
 * @middleware verifyToken - Phải đăng nhập
 * @middleware requireCustomer - Chỉ customer mới được truy cập
 * @returns {Object|null} Địa chỉ mặc định hoặc null nếu không có
 */
router.get("/default", verifyToken, requireCustomer, async (req, res) => {
  try {
    const address = await Address.findOne({ user: req.user.userId, isDefault: true });
    res.json(address || null);
  } catch (error) {
    console.error("Get default address error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

/**
 * ➕ Thêm địa chỉ mới (chỉ customer)
 * POST /api/addresses
 * Tạo địa chỉ mới cho user đang đăng nhập
 * @middleware verifyToken - Phải đăng nhập
 * @middleware requireCustomer - Chỉ customer mới được truy cập
 * @body {String} fullName - Họ tên người nhận (required)
 * @body {String} phone - Số điện thoại (required)
 * @body {String} address - Địa chỉ chi tiết (required)
 * @body {String} ward - Phường/Xã (optional)
 * @body {String} district - Quận/Huyện (optional)
 * @body {String} city - Tỉnh/Thành phố (required)
 * @body {Boolean} isDefault - Đặt làm địa chỉ mặc định (optional)
 * @returns {Object} { message, address }
 */
router.post("/", verifyToken, requireCustomer, async (req, res) => {
  try {
    const { fullName, phone, address, ward, district, city, isDefault } = req.body;

    if (!fullName || !phone || !address || !city) {
      return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin bắt buộc!" });
    }

    // Nếu đặt làm mặc định, bỏ mặc định của các địa chỉ khác
    // Chỉ được có một địa chỉ mặc định tại một thời điểm
    if (isDefault) {
      await Address.updateMany(
        { user: req.user.userId }, // Tất cả địa chỉ của user
        { isDefault: false } // Bỏ mặc định
      );
    }

    const newAddress = new Address({
      user: req.user.userId,
      fullName,
      phone,
      address,
      ward: ward || "",
      district: district || "",
      city,
      isDefault: isDefault || false,
    });

    await newAddress.save();
    res.status(201).json({
      message: "Thêm địa chỉ thành công!",
      address: newAddress,
    });
  } catch (error) {
    console.error("Create address error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

/**
 * ✏️ Cập nhật địa chỉ (chỉ customer)
 * PUT /api/addresses/:id
 * Cập nhật thông tin địa chỉ (chỉ customer, chỉ địa chỉ của chính mình)
 * @middleware verifyToken - Phải đăng nhập
 * @middleware requireCustomer - Chỉ customer mới được truy cập
 * @param {String} id - ID của địa chỉ
 * @body {String} fullName - Họ tên người nhận (optional)
 * @body {String} phone - Số điện thoại (optional)
 * @body {String} address - Địa chỉ chi tiết (optional)
 * @body {String} ward - Phường/Xã (optional)
 * @body {String} district - Quận/Huyện (optional)
 * @body {String} city - Tỉnh/Thành phố (optional)
 * @body {Boolean} isDefault - Đặt làm địa chỉ mặc định (optional)
 * @returns {Object} { message, address }
 */
router.put("/:id", verifyToken, requireCustomer, async (req, res) => {
  try {
    const { fullName, phone, address, ward, district, city, isDefault } = req.body;
    const addressDoc = await Address.findOne({ _id: req.params.id, user: req.user.userId });

    if (!addressDoc) {
      return res.status(404).json({ message: "Không tìm thấy địa chỉ!" });
    }

    if (fullName) addressDoc.fullName = fullName;
    if (phone) addressDoc.phone = phone;
    if (address) addressDoc.address = address;
    if (ward !== undefined) addressDoc.ward = ward;
    if (district !== undefined) addressDoc.district = district;
    if (city) addressDoc.city = city;

    // Nếu đặt làm mặc định, bỏ mặc định của các địa chỉ khác
    // Chỉ được có một địa chỉ mặc định tại một thời điểm
    if (isDefault === true) {
      // Bỏ mặc định của tất cả địa chỉ khác (trừ địa chỉ hiện tại)
      await Address.updateMany(
        { user: req.user.userId, _id: { $ne: req.params.id } }, // Tất cả địa chỉ khác của user
        { isDefault: false } // Bỏ mặc định
      );
      addressDoc.isDefault = true; // Đặt địa chỉ hiện tại làm mặc định
    } else if (isDefault === false) {
      // Bỏ mặc định của địa chỉ hiện tại
      addressDoc.isDefault = false;
    }

    await addressDoc.save();
    res.json({
      message: "Cập nhật địa chỉ thành công!",
      address: addressDoc,
    });
  } catch (error) {
    console.error("Update address error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

/**
 * 🗑️ Xóa địa chỉ (chỉ customer)
 * DELETE /api/addresses/:id
 * Xóa địa chỉ (chỉ customer, chỉ địa chỉ của chính mình)
 * @middleware verifyToken - Phải đăng nhập
 * @middleware requireCustomer - Chỉ customer mới được truy cập
 * @param {String} id - ID của địa chỉ
 * @returns {Object} { message }
 */
router.delete("/:id", verifyToken, requireCustomer, async (req, res) => {
  try {
    const address = await Address.findOneAndDelete({ _id: req.params.id, user: req.user.userId });
    
    if (!address) {
      return res.status(404).json({ message: "Không tìm thấy địa chỉ!" });
    }

    res.json({ message: "Xóa địa chỉ thành công!" });
  } catch (error) {
    console.error("Delete address error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

module.exports = router;

