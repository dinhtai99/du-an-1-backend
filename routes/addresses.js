const express = require("express");
const router = express.Router();
const Address = require("../models/Address");
const { verifyToken, requireCustomer } = require("../middleware/authMiddleware");

// 📍 Lấy danh sách địa chỉ (chỉ customer)
router.get("/", verifyToken, requireCustomer, async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user.userId }).sort({ isDefault: -1, createdAt: -1 });
    res.json(addresses);
  } catch (error) {
    console.error("Get addresses error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 📍 Lấy địa chỉ mặc định (chỉ customer)
router.get("/default", verifyToken, requireCustomer, async (req, res) => {
  try {
    const address = await Address.findOne({ user: req.user.userId, isDefault: true });
    res.json(address || null);
  } catch (error) {
    console.error("Get default address error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// ➕ Thêm địa chỉ mới (chỉ customer)
router.post("/", verifyToken, requireCustomer, async (req, res) => {
  try {
    const { fullName, phone, address, ward, district, city, isDefault } = req.body;

    if (!fullName || !phone || !address || !city) {
      return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin bắt buộc!" });
    }

    // Nếu đặt làm mặc định, bỏ mặc định của các địa chỉ khác
    if (isDefault) {
      await Address.updateMany(
        { user: req.user.userId },
        { isDefault: false }
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

// ✏️ Cập nhật địa chỉ (chỉ customer)
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
    if (isDefault === true) {
      await Address.updateMany(
        { user: req.user.userId, _id: { $ne: req.params.id } },
        { isDefault: false }
      );
      addressDoc.isDefault = true;
    } else if (isDefault === false) {
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

// 🗑️ Xóa địa chỉ (chỉ customer)
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

