const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true }, // Địa chỉ chi tiết
  ward: { type: String }, // Phường/Xã
  district: { type: String }, // Quận/Huyện
  city: { type: String, required: true }, // Tỉnh/Thành phố
  isDefault: { type: Boolean, default: false }, // Địa chỉ mặc định
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Address", addressSchema);

