const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: { type: String, required: true },
  gender: { type: String, enum: ["male", "female", "other"], default: "male" }, // Giới tính
  dateOfBirth: { type: Date }, // Ngày sinh
  phone: { type: String },
  role: { type: String, enum: ["admin", "staff"], default: "staff" },
  avatar: { type: String, default: "" },
  isLocked: { type: Boolean, default: false }, // khóa sau 5 lần đăng nhập sai
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date }, // Thời gian khóa đến khi nào
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
