const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true, min: 1 },
  color: { type: String }, // Màu sắc đã chọn
  size: { type: String }, // Kích thước đã chọn
  price: { type: Number, required: true }, // Giá bán tại thời điểm đặt hàng
  discount: { type: Number, default: 0 }, // Giảm giá cho từng sản phẩm (%)
  subtotal: { type: Number, required: true }, // Tổng tiền sau giảm giá
});

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true, required: true }, // Mã đơn hàng tự động
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Khách hàng
  shippingAddress: { 
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    ward: { type: String },
    district: { type: String },
    city: { type: String, required: true },
  }, // Địa chỉ giao hàng
  items: [orderItemSchema],
  subtotal: { type: Number, required: true }, // Tổng tiền trước giảm giá
  shippingFee: { type: Number, default: 0 }, // Phí vận chuyển
  discount: { type: Number, default: 0 }, // Giảm giá tổng (%)
  total: { type: Number, required: true }, // Tổng tiền cuối cùng
  paymentMethod: { 
    type: String, 
    enum: ["COD", "card", "e-wallet", "zalopay"], 
    default: "COD",
    required: true 
  }, // COD / Thẻ / Ví điện tử / ZaloPay
  paymentStatus: {
    type: String,
    enum: ["pending", "processing", "success", "failed", "cancelled"],
    default: "pending"
  }, // Trạng thái thanh toán (chỉ dùng cho online payment)
  zalopayTransToken: { type: String }, // ZaloPay transaction token (zp_trans_token)
  zalopayOrderId: { type: String }, // ZaloPay order ID
  zalopayMac: { type: String }, // ZaloPay MAC for verification
  status: { 
    type: String, 
    enum: ["new", "processing", "shipping", "completed", "cancelled"], 
    default: "new" 
  }, // Mới → Đang xử lý → Đang giao → Hoàn thành / Hủy
  shipper: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Nhân viên giao hàng
  voucher: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher" }, // Voucher đã sử dụng
  voucherCode: { type: String }, // Mã voucher đã sử dụng
  voucherDiscount: { type: Number, default: 0 }, // Số tiền giảm từ voucher
  notes: { type: String, default: "" },
  cancelledAt: { type: Date }, // Thời gian hủy
  cancelledReason: { type: String }, // Lý do hủy
  completedAt: { type: Date }, // Thời gian hoàn thành
  timeline: [{ // Timeline theo dõi đơn hàng
    status: { type: String, required: true },
    message: { type: String, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now },
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Tự động tạo mã đơn hàng trước khi lưu
orderSchema.pre("save", async function (next) {
  if (!this.orderNumber) {
    const count = await mongoose.model("Order").countDocuments();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    this.orderNumber = `DH${year}${month}${day}${String(count + 1).padStart(4, "0")}`;
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Order", orderSchema);

