// Import thư viện mongoose để tạo schema và model
const mongoose = require("mongoose");

/**
 * Voucher Schema - Định nghĩa cấu trúc dữ liệu cho Voucher trong MongoDB
 * Schema này định nghĩa các trường dữ liệu và validation rules cho Voucher (Mã giảm giá)
 */
const voucherSchema = new mongoose.Schema({
  // Mã voucher - Unique, bắt buộc, tự động chuyển thành chữ hoa
  // Ví dụ: "SALE50" (tự động chuyển từ "sale50")
  code: { 
    type: String, 
    unique: true, 
    required: true, 
    uppercase: true 
  },
  
  // Tên voucher - Bắt buộc
  // Ví dụ: "Giảm 50% cho đơn hàng đầu tiên"
  name: { 
    type: String, 
    required: true 
  },
  
  // Mô tả voucher - Optional
  description: { 
    type: String 
  },
  
  // Loại voucher - Bắt buộc
  // "percentage" = Giảm theo phần trăm (ví dụ: 50%)
  // "fixed" = Giảm số tiền cố định (ví dụ: 50000 VNĐ)
  type: { 
    type: String, 
    enum: ["percentage", "fixed"], 
    required: true 
  },
  
  // Giá trị giảm - Bắt buộc, tối thiểu 0
  // Nếu type = "percentage": value = 50 (nghĩa là 50%)
  // Nếu type = "fixed": value = 50000 (nghĩa là 50000 VNĐ)
  value: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  
  // Đơn hàng tối thiểu để áp dụng - Mặc định 0
  // Ví dụ: minOrderValue = 100000 → chỉ áp dụng cho đơn hàng >= 100,000 VNĐ
  minOrderValue: { 
    type: Number, 
    default: 0 
  },
  
  // Giảm giá tối đa - Optional
  // Chỉ áp dụng cho type: "percentage"
  // Ví dụ: value = 50%, maxDiscount = 100000 → giảm tối đa 100,000 VNĐ
  maxDiscount: { 
    type: Number 
  },
  
  // Số lượng voucher - Bắt buộc, tối thiểu 0
  // Tổng số lần voucher có thể được sử dụng
  quantity: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  
  // Số lần đã sử dụng - Mặc định 0
  // Đếm số lần voucher đã được sử dụng
  usedCount: { 
    type: Number, 
    default: 0 
  },
  
  // Ngày bắt đầu - Bắt buộc
  // Voucher chỉ có hiệu lực từ startDate
  startDate: { 
    type: Date, 
    required: true 
  },
  
  // Ngày kết thúc - Bắt buộc
  // Voucher hết hiệu lực sau endDate
  endDate: { 
    type: Date, 
    required: true 
  },
  
  // Sản phẩm áp dụng - Mảng các Product IDs, optional
  // Rỗng = áp dụng cho tất cả sản phẩm
  // Có giá trị = chỉ áp dụng cho các sản phẩm trong danh sách
  applicableProducts: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Product" 
  }],
  
  // Danh mục áp dụng - Mảng các Category IDs, optional
  // Rỗng = áp dụng cho tất cả danh mục
  // Có giá trị = chỉ áp dụng cho các danh mục trong danh sách
  applicableCategories: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Category" 
  }],
  
  // Người dùng được áp dụng - Mảng các User IDs, optional
  // Rỗng = áp dụng cho tất cả người dùng
  // Có giá trị = chỉ áp dụng cho các user trong danh sách
  applicableUsers: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }],
  
  // Trạng thái voucher - Mặc định 1
  // 0 = ẩn (không hiển thị), 1 = hiển thị
  status: { 
    type: Number, 
    enum: [0, 1], 
    default: 1 
  },
  
  // Thời gian tạo - Tự động set khi tạo voucher mới
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  
  // Thời gian cập nhật - Tự động cập nhật mỗi khi save
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
});

/**
 * Pre-save hook - Tự động cập nhật updatedAt
 * Hook này chạy trước khi save voucher vào database
 */
voucherSchema.pre("save", function (next) {
  // Cập nhật updatedAt mỗi khi save
  this.updatedAt = Date.now();
  // Chuyển sang bước tiếp theo (lưu vào database)
  next();
});

/**
 * Method: Kiểm tra voucher còn hiệu lực không
 * @returns {Boolean} true nếu voucher còn hiệu lực, false nếu không
 */
voucherSchema.methods.isValid = function () {
  const now = new Date();
  // Voucher còn hiệu lực nếu:
  // 1. status === 1 (đang hiển thị)
  // 2. quantity > usedCount (còn voucher để sử dụng)
  // 3. now >= startDate (đã đến ngày bắt đầu)
  // 4. now <= endDate (chưa hết hạn)
  return (
    this.status === 1 &&
    this.quantity > this.usedCount &&
    now >= this.startDate &&
    now <= this.endDate
  );
};

/**
 * Method: Kiểm tra voucher có thể áp dụng cho user không
 * @param {String|ObjectId} userId - ID của user
 * @returns {Boolean} true nếu voucher có thể áp dụng cho user này
 */
voucherSchema.methods.isApplicableForUser = function (userId) {
  // Nếu applicableUsers rỗng → áp dụng cho tất cả user
  if (this.applicableUsers.length === 0) return true;
  
  // Kiểm tra userId có trong danh sách applicableUsers không
  return this.applicableUsers.some(id => id.toString() === userId.toString());
};

/**
 * Method: Kiểm tra voucher có thể áp dụng cho sản phẩm không
 * @param {String|ObjectId} productId - ID của sản phẩm
 * @returns {Boolean} true nếu voucher có thể áp dụng cho sản phẩm này
 * Lưu ý: Cần populate category của product để kiểm tra đầy đủ
 */
voucherSchema.methods.isApplicableForProduct = function (productId) {
  // Nếu cả applicableProducts và applicableCategories đều rỗng → áp dụng cho tất cả sản phẩm
  if (this.applicableProducts.length === 0 && this.applicableCategories.length === 0) {
    return true;
  }
  // TODO: Cần populate category của product để kiểm tra đầy đủ
  // Tạm thời trả về true, sẽ kiểm tra chi tiết trong route
  return true;
};

// Export Voucher model để sử dụng trong các file khác
// mongoose.model("Voucher", voucherSchema) - Tạo model từ schema
module.exports = mongoose.model("Voucher", voucherSchema);

