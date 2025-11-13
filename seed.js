require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const Category = require("./models/Category");
const Product = require("./models/Product");

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Kết nối MongoDB thành công!");

    // Xóa dữ liệu cũ
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});

    // ======== 1️⃣ User (Admin + Nhân viên) ========
    const passwordAdmin = await bcrypt.hash("admin123", 10);
    const passwordStaff = await bcrypt.hash("staff123", 10);

    const users = await User.insertMany([
      {
        username: "admin",
        password: passwordAdmin,
        fullName: "Trần Đình Tài (Admin)",
        phone: "0987654321",
        role: "admin",
      },
      {
        username: "nhanvien1",
        password: passwordStaff,
        fullName: "Nguyễn Văn B (Nhân viên)",
        phone: "0912345678",
        role: "staff",
      },
    ]);
    console.log("👥 Thêm người dùng mẫu thành công!");

    // ======== 2️⃣ Category ========
    const categories = await Category.insertMany([
      { name: "Điện thoại", description: "Các dòng smartphone cao cấp và tầm trung" },
      { name: "Laptop", description: "Laptop học tập, văn phòng, gaming" },
      { name: "Tablet", description: "Máy tính bảng" },
      { name: "Phụ kiện", description: "Tai nghe, chuột, bàn phím, sạc nhanh, v.v." },
    ]);
    console.log("🗂️ Thêm loại sản phẩm mẫu thành công!");

    // ======== 3️⃣ Product ========
    const products = await Product.insertMany([
      {
        name: "iPhone 15 Pro Max 256GB",
        category: categories[0]._id,
        importPrice: 30000000,
        price: 33990000,
        salePrice: 32990000,
        stock: 8,
        minStock: 5,
        description: "Chip A17 Pro mạnh mẽ, camera 48MP, sạc USB-C, màn hình 6.7 inch Super Retina XDR",
        images: ["https://example.com/iphone15promax1.jpg", "https://example.com/iphone15promax2.jpg"],
        image: "https://example.com/iphone15promax.jpg",
        colors: ["Titanium Xanh", "Titanium Trắng", "Titanium Đen"],
        sizes: ["256GB", "512GB", "1TB"],
        isFeatured: true,
        isPromotion: true,
        rating: 4.8,
        totalReviews: 125,
      },
      {
        name: "Samsung Galaxy S24 Ultra",
        category: categories[0]._id,
        importPrice: 27000000,
        price: 29990000,
        salePrice: 28990000,
        stock: 10,
        minStock: 5,
        description: "Snapdragon 8 Gen 3, bút S Pen, camera zoom 10x, màn hình Dynamic AMOLED 2X 6.8 inch",
        images: ["https://example.com/s24ultra1.jpg"],
        image: "https://example.com/s24ultra.jpg",
        colors: ["Titanium Đen", "Titanium Vàng", "Titanium Tím"],
        sizes: ["256GB", "512GB", "1TB"],
        isFeatured: true,
        isPromotion: true,
        rating: 4.7,
        totalReviews: 98,
      },
      {
        name: "Xiaomi 14 Pro",
        category: categories[0]._id,
        importPrice: 18000000,
        price: 19990000,
        stock: 15,
        minStock: 10,
        description: "Snapdragon 8 Gen 3, camera Leica, sạc nhanh 120W",
        images: [],
        image: "https://example.com/xiaomi14pro.jpg",
        colors: ["Đen", "Trắng", "Xanh"],
        sizes: ["256GB", "512GB"],
        isFeatured: false,
        isPromotion: false,
        rating: 4.5,
        totalReviews: 67,
      },
      {
        name: "MacBook Air M2 2024 13 inch",
        category: categories[1]._id,
        importPrice: 26000000,
        price: 28990000,
        stock: 5,
        minStock: 3,
        description: "Chip M2, pin 18h, cực nhẹ chỉ 1.24kg, màn hình Retina 13.6 inch",
        images: [],
        image: "https://example.com/macbookairm2.jpg",
        colors: ["Bạc", "Vàng", "Xám", "Xanh"],
        sizes: ["256GB", "512GB", "1TB"],
        isFeatured: true,
        isPromotion: false,
        rating: 4.9,
        totalReviews: 203,
      },
      {
        name: "ASUS TUF Gaming F15 i7 RTX 4060",
        category: categories[1]._id,
        importPrice: 30000000,
        price: 32990000,
        salePrice: 31990000,
        stock: 4,
        minStock: 3,
        description: "Hiệu năng mạnh mẽ, phù hợp gaming và đồ họa, màn hình 15.6 inch 144Hz",
        images: [],
        image: "https://example.com/asusf15.jpg",
        colors: ["Đen"],
        sizes: ["512GB SSD", "1TB SSD"],
        isFeatured: false,
        isPromotion: true,
        rating: 4.6,
        totalReviews: 145,
      },
      {
        name: "Dell XPS 13 Plus",
        category: categories[1]._id,
        importPrice: 35000000,
        price: 38990000,
        stock: 3,
        minStock: 2,
        description: "Laptop cao cấp, màn hình OLED 13.4 inch, chip Intel Core i7 gen 13",
        images: [],
        image: "https://example.com/dellxps13.jpg",
        colors: ["Bạc", "Đen"],
        sizes: ["512GB", "1TB"],
        isFeatured: true,
        isPromotion: false,
        rating: 4.8,
        totalReviews: 89,
      },
      {
        name: "iPad Pro 12.9 inch M2",
        category: categories[2]._id,
        importPrice: 25000000,
        price: 27990000,
        salePrice: 26990000,
        stock: 12,
        minStock: 5,
        description: "Chip M2, màn hình Liquid Retina XDR 12.9 inch, hỗ trợ Apple Pencil",
        images: [],
        image: "https://example.com/ipadpro.jpg",
        colors: ["Bạc", "Xám"],
        sizes: ["128GB", "256GB", "512GB", "1TB"],
        isFeatured: true,
        isPromotion: true,
        rating: 4.7,
        totalReviews: 156,
      },
      {
        name: "Samsung Galaxy Tab S9 Ultra",
        category: categories[2]._id,
        importPrice: 22000000,
        price: 24990000,
        stock: 8,
        minStock: 5,
        description: "Màn hình Super AMOLED 14.6 inch, chip Snapdragon 8 Gen 2, bút S Pen",
        images: [],
        image: "https://example.com/tabs9ultra.jpg",
        colors: ["Đen", "Be"],
        sizes: ["256GB", "512GB"],
        isFeatured: false,
        isPromotion: false,
        rating: 4.6,
        totalReviews: 78,
      },
      {
        name: "Tai nghe Bluetooth Sony WH-1000XM5",
        category: categories[3]._id,
        importPrice: 7500000,
        price: 8990000,
        salePrice: 8490000,
        stock: 15,
        minStock: 10,
        description: "Chống ồn chủ động, pin 30h, sạc nhanh 3 phút nghe 3h, chất lượng âm thanh Hi-Res",
        images: [],
        image: "https://example.com/sony1000xm5.jpg",
        colors: ["Đen", "Bạc"],
        sizes: [],
        isFeatured: true,
        isPromotion: true,
        rating: 4.9,
        totalReviews: 312,
      },
      {
        name: "AirPods Pro 2",
        category: categories[3]._id,
        importPrice: 5500000,
        price: 6490000,
        stock: 20,
        minStock: 15,
        description: "Chống ồn chủ động, chip H2, pin 6h, case sạc MagSafe",
        images: [],
        image: "https://example.com/airpodspro2.jpg",
        colors: ["Trắng"],
        sizes: [],
        isFeatured: true,
        isPromotion: false,
        rating: 4.8,
        totalReviews: 445,
      },
      {
        name: "Chuột Logitech MX Master 3S",
        category: categories[3]._id,
        importPrice: 2000000,
        price: 2490000,
        stock: 20,
        minStock: 15,
        description: "Chuột cao cấp cho dân văn phòng và designer, kết nối đa thiết bị, pin 70 ngày",
        images: [],
        image: "https://example.com/logitechmx3s.jpg",
        colors: ["Đen", "Trắng", "Hồng"],
        sizes: [],
        isFeatured: false,
        isPromotion: false,
        rating: 4.7,
        totalReviews: 234,
      },
      {
        name: "Bàn phím cơ Keychron K8 Pro",
        category: categories[3]._id,
        importPrice: 2800000,
        price: 3290000,
        salePrice: 3090000,
        stock: 18,
        minStock: 10,
        description: "Bàn phím cơ 87 phím, switch Gateron, kết nối Bluetooth và USB-C",
        images: [],
        image: "https://example.com/keychronk8.jpg",
        colors: ["Đen", "Trắng"],
        sizes: [],
        isFeatured: false,
        isPromotion: true,
        rating: 4.6,
        totalReviews: 167,
      },
    ]);
    console.log("📦 Thêm sản phẩm công nghệ mẫu thành công!");

    console.log("🎉 Import dữ liệu Shop Công Nghệ THB thành công!");
    mongoose.connection.close();
  } catch (error) {
    console.error("❌ Lỗi khi import dữ liệu:", error);
  }
};

seedData();

