const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  status: { type: Number, default: 1 } // 1 = hoạt động, 0 = ẩn
});

module.exports = mongoose.model("Category", CategorySchema);
