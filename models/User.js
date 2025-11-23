const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
  fullName: { type: String, required: true },
  gender: { type: String, enum: ["male", "female", "other"], default: "male" },
  dateOfBirth: { type: Date },
  phone: { type: String },
  address: { type: String, default: "" }, // ✅ THÊM DÒNG NÀY
  role: { type: String, enum: ["admin", "staff", "customer"], default: "customer" },
  avatar: { type: String, default: "" },
  isLocked: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
