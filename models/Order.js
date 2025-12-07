// Import thư viện mongoose để tạo schema và model
const mongoose = require("mongoose");

/**
 * OrderItem Schema - Định nghĩa cấu trúc dữ liệu cho từng item trong đơn hàng
 * Mỗi đơn hàng có thể có nhiều items (sản phẩm)
 */
const orderItemSchema = new mongoose.Schema({
  // Sản phẩm - Reference đến Product model, bắt buộc
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  
  // Số lượng - Bắt buộc, tối thiểu 1
  quantity: { type: Number, required: true, min: 1 },
  
  // Màu sắc đã chọn - Optional
  color: { type: String },
  
  // Kích thước đã chọn - Optional
  size: { type: String },
  
  // Giá bán tại thời điểm đặt hàng - Bắt buộc
  // Lưu giá tại thời điểm đặt hàng để tránh thay đổi giá sau này
  price: { type: Number, required: true },
  
  // Giảm giá cho từng sản phẩm (%) - Mặc định 0
  discount: { type: Number, default: 0 },
  
  // Tổng tiền sau giảm giá - Bắt buộc
  // subtotal = price * quantity * (1 - discount/100)
  subtotal: { type: Number, required: true },
});

/**
 * Order Schema - Định nghĩa cấu trúc dữ liệu cho Order trong MongoDB
 * Schema này định nghĩa các trường dữ liệu và validation rules cho Order
 */
const orderSchema = new mongoose.Schema({
  // Mã đơn hàng tự động - Unique, bắt buộc
  // Format: DHYYYYMMDDXXXX (ví dụ: DH202511280001)
  orderNumber: { type: String, unique: true, required: true },
  
  // Khách hàng - Reference đến User model, bắt buộc
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  
  // Địa chỉ giao hàng - Object chứa thông tin địa chỉ
  shippingAddress: { 
    fullName: { type: String, required: true }, // Họ tên người nhận
    phone: { type: String, required: true }, // Số điện thoại
    address: { type: String, required: true }, // Địa chỉ chi tiết
    ward: { type: String }, // Phường/Xã (optional)
    district: { type: String }, // Quận/Huyện (optional)
    city: { type: String, default: "" }, // Tỉnh/Thành phố (optional, có thể để trống nếu lấy từ User profile)
  },
  
  // Danh sách sản phẩm trong đơn hàng - Mảng các orderItemSchema
  items: [orderItemSchema],
  
  // Tổng tiền trước giảm giá - Bắt buộc
  // subtotal = tổng của tất cả items.subtotal
  subtotal: { type: Number, required: true },
  
  // Phí vận chuyển - Mặc định 0
  shippingFee: { type: Number, default: 0 },
  
  // Giảm giá tổng (%) - Mặc định 0
  discount: { type: Number, default: 0 },
  
  // Tổng tiền cuối cùng - Bắt buộc
  // total = (subtotal * (1 - discount/100)) + shippingFee - voucherDiscount
  total: { type: Number, required: true },
  
  // Phương thức thanh toán - Bắt buộc, mặc định "COD"
  // COD = Thanh toán khi nhận hàng
  // cash = Tiền mặt, card = Thẻ, e-wallet = Ví điện tử
  // zalopay = ZaloPay, momo = MoMo, vnpay = VNPay
  paymentMethod: { 
    type: String, 
    enum: ["COD", "cash", "card", "e-wallet", "zalopay", "momo", "vnpay"], 
    default: "COD",
    required: true 
  },
  
  // Trạng thái thanh toán - Mặc định "pending"
  // Chỉ dùng cho online payment (zalopay, momo, vnpay)
  // pending = Chờ thanh toán, processing = Đang xử lý
  // success = Thanh toán thành công, failed = Thanh toán thất bại
  // cancelled = Đã hủy thanh toán
  paymentStatus: {
    type: String,
    enum: ["pending", "processing", "success", "failed", "cancelled"],
    default: "pending"
  },
  
  // ZaloPay transaction token (zp_trans_token) - Optional
  zalopayTransToken: { type: String },
  
  // ZaloPay order ID - Optional
  zalopayOrderId: { type: String },
  
  // ZaloPay MAC for verification - Optional
  zalopayMac: { type: String },
  
  // MoMo order ID - Optional
  momoOrderId: { type: String },
  
  // MoMo request ID - Optional
  momoRequestId: { type: String },
  
  // MoMo transaction ID - Optional
  momoTransId: { type: String },
  
  // MoMo signature for verification - Optional
  momoSignature: { type: String },
  
  // VNPay transaction reference - Optional
  vnpayTxnRef: { type: String },
  
  // VNPay transaction number - Optional
  vnpayTransactionNo: { type: String },
  
  // VNPay secure hash for verification - Optional
  vnpaySecureHash: { type: String },
  
  // Trạng thái đơn hàng - Mặc định "new"
  // new = Mới tạo, processing = Đang xử lý
  // shipping = Đang giao hàng, completed = Hoàn thành
  // cancelled = Đã hủy
  status: { 
    type: String, 
    enum: ["new", "processing", "shipping", "completed", "cancelled"], 
    default: "new" 
  },
  
  // Nhân viên giao hàng - Reference đến User model, optional
  shipper: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  
  // Voucher đã sử dụng - Reference đến Voucher model, optional
  voucher: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher" },
  
  // Mã voucher đã sử dụng - Optional
  voucherCode: { type: String },
  
  // Số tiền giảm từ voucher - Mặc định 0
  voucherDiscount: { type: Number, default: 0 },
  
  // Ghi chú - Mặc định chuỗi rỗng
  notes: { type: String, default: "" },
  
  // Thời gian hủy - Optional
  cancelledAt: { type: Date },
  
  // Lý do hủy - Optional
  cancelledReason: { type: String },
  
  // Thời gian hoàn thành - Optional
  completedAt: { type: Date },
  
  // Timeline theo dõi đơn hàng - Mảng các sự kiện
  // Mỗi sự kiện ghi lại: status, message, updatedBy, createdAt
  timeline: [{ 
    status: { type: String, required: true }, // Trạng thái tại thời điểm đó
    message: { type: String, required: true }, // Thông báo
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Ai cập nhật
    createdAt: { type: Date, default: Date.now }, // Thời gian cập nhật
  }],
  
  // Thời gian tạo - Tự động set khi tạo order mới
  createdAt: { type: Date, default: Date.now },
  
  // Thời gian cập nhật - Tự động cập nhật mỗi khi save
  updatedAt: { type: Date, default: Date.now },
});

/**
 * Pre-save hook - Tự động tạo mã đơn hàng trước khi lưu
 * Hook này chạy trước khi save order vào database
 * Nếu orderNumber chưa có, sẽ tự động tạo theo format: DHYYYYMMDDXXXX
 */
orderSchema.pre("save", async function (next) {
  // Chỉ tạo orderNumber nếu chưa có
  if (!this.orderNumber) {
    // Đếm số lượng order hiện có trong database
    const count = await mongoose.model("Order").countDocuments();
    
    // Lấy ngày hiện tại
    const date = new Date();
    const year = date.getFullYear(); // Năm (ví dụ: 2025)
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Tháng (01-12)
    const day = String(date.getDate()).padStart(2, "0"); // Ngày (01-31)
    
    // Tạo orderNumber: DH + YYYY + MM + DD + XXXX (số thứ tự, 4 chữ số)
    // Ví dụ: DH202511280001 (đơn hàng đầu tiên ngày 28/11/2025)
    this.orderNumber = `DH${year}${month}${day}${String(count + 1).padStart(4, "0")}`;
  }
  
  // Cập nhật updatedAt mỗi khi save
  this.updatedAt = Date.now();
  
  // Chuyển sang bước tiếp theo (lưu vào database)
  next();
});

// Export Order model để sử dụng trong các file khác
// mongoose.model("Order", orderSchema) - Tạo model từ schema
module.exports = mongoose.model("Order", orderSchema);

