// Import thư viện mongoose để tạo schema và model
const mongoose = require("mongoose");

/**
 * Category Schema - Định nghĩa cấu trúc dữ liệu cho Category trong MongoDB
 * Schema này định nghĩa các trường dữ liệu và validation rules cho Category (Danh mục sản phẩm)
 */
const CategorySchema = new mongoose.Schema({
  // Tên danh mục - Bắt buộc, phải unique (duy nhất)
  name: { type: String, required: true, unique: true },
  
  // Mô tả danh mục - Optional
  description: { type: String },
  
  // Trạng thái danh mục - Mặc định 1
  // 1 = hoạt động (hiển thị), 0 = ẩn (không hiển thị)
  status: { type: Number, default: 1 }
});

// Export Category model để sử dụng trong các file khác
// mongoose.model("Category", CategorySchema) - Tạo model từ schema
module.exports = mongoose.model("Category", CategorySchema);
