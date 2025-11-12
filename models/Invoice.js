const mongoose = require("mongoose");

const InvoiceItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true }, // Giá bán tại thời điểm tạo hóa đơn
  discount: { type: Number, default: 0 }, // Giảm giá cho từng sản phẩm (%)
  subtotal: { type: Number, required: true }, // Tổng tiền sau giảm giá
});

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true, required: true }, // Mã hóa đơn tự động
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
  staff: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Nhân viên bán hàng
  items: [InvoiceItemSchema],
  subtotal: { type: Number, required: true }, // Tổng tiền trước giảm giá
  discount: { type: Number, default: 0 }, // Giảm giá tổng (%)
  total: { type: Number, required: true }, // Tổng tiền cuối cùng
  paymentMethod: { 
    type: String, 
    enum: ["cash", "transfer", "card"], 
    default: "cash",
    required: true 
  }, // Tiền mặt / Chuyển khoản / Thẻ
  status: { 
    type: String, 
    enum: ["pending", "completed", "cancelled"], 
    default: "pending" 
  }, // Đang xử lý / Hoàn tất / Đã hủy
  notes: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Tự động tạo mã hóa đơn trước khi lưu
InvoiceSchema.pre("save", async function (next) {
  if (!this.invoiceNumber) {
    const count = await mongoose.model("Invoice").countDocuments();
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    this.invoiceNumber = `HD${year}${month}${day}${String(count + 1).padStart(4, "0")}`;
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Invoice", InvoiceSchema);

