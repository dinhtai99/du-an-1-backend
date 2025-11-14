const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema({
  code: { 
    type: String, 
    unique: true, 
    required: true, 
    uppercase: true 
  }, // Mã voucher (VD: SALE50)
  name: { 
    type: String, 
    required: true 
  }, // Tên voucher
  description: { 
    type: String 
  }, // Mô tả
  type: { 
    type: String, 
    enum: ["percentage", "fixed"], 
    required: true 
  }, // Loại: phần trăm hoặc số tiền cố định
  value: { 
    type: Number, 
    required: true, 
    min: 0 
  }, // Giá trị giảm (VD: 50% hoặc 50000 VNĐ)
  minOrderValue: { 
    type: Number, 
    default: 0 
  }, // Đơn hàng tối thiểu để áp dụng
  maxDiscount: { 
    type: Number 
  }, // Giảm giá tối đa (chỉ áp dụng cho type: percentage)
  quantity: { 
    type: Number, 
    required: true, 
    min: 0 
  }, // Số lượng voucher
  usedCount: { 
    type: Number, 
    default: 0 
  }, // Số lần đã sử dụng
  startDate: { 
    type: Date, 
    required: true 
  }, // Ngày bắt đầu
  endDate: { 
    type: Date, 
    required: true 
  }, // Ngày kết thúc
  applicableProducts: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Product" 
  }], // Sản phẩm áp dụng (rỗng = tất cả)
  applicableCategories: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Category" 
  }], // Danh mục áp dụng (rỗng = tất cả)
  applicableUsers: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }], // Người dùng được áp dụng (rỗng = tất cả)
  status: { 
    type: Number, 
    enum: [0, 1], 
    default: 1 
  }, // 0 = ẩn, 1 = hiển thị
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
});

// Tự động cập nhật updatedAt
voucherSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Kiểm tra voucher còn hiệu lực
voucherSchema.methods.isValid = function () {
  const now = new Date();
  return (
    this.status === 1 &&
    this.quantity > this.usedCount &&
    now >= this.startDate &&
    now <= this.endDate
  );
};

// Kiểm tra voucher có thể áp dụng cho user
voucherSchema.methods.isApplicableForUser = function (userId) {
  if (this.applicableUsers.length === 0) return true;
  return this.applicableUsers.some(id => id.toString() === userId.toString());
};

// Kiểm tra voucher có thể áp dụng cho sản phẩm
voucherSchema.methods.isApplicableForProduct = function (productId) {
  if (this.applicableProducts.length === 0 && this.applicableCategories.length === 0) {
    return true;
  }
  // Cần populate category của product để kiểm tra
  return true; // Tạm thời, sẽ kiểm tra trong route
};

module.exports = mongoose.model("Voucher", voucherSchema);

