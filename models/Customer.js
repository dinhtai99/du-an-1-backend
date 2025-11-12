const mongoose = require("mongoose");

const CustomerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: String,
  address: String,
  joinedDate: { type: Date, default: Date.now },
  type: { type: String, enum: ["VIP", "Normal"], default: "Normal" },
  active: { type: Boolean, default: true }
});

module.exports = mongoose.model("Customer", CustomerSchema);
