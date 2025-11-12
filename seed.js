require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("./models/User");
const Category = require("./models/Category");
const Product = require("./models/Product");
const Customer = require("./models/Customer");

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Kết nối MongoDB thành công!");

    // Xóa dữ liệu cũ
    await User.deleteMany({});
    await Category.deleteMany({});
    await Product.deleteMany({});
    await Customer.deleteMany({});

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
      { name: "Phụ kiện", description: "Tai nghe, chuột, bàn phím, sạc nhanh, v.v." },
    ]);
    console.log("🗂️ Thêm loại sản phẩm mẫu thành công!");

    // ======== 3️⃣ Product ========
    const products = await Product.insertMany([
      {
        name: "iPhone 15 Pro Max 256GB",
        category: categories[0]._id,
        price: 33990000,
        stock: 8,
        description: "Chip A17 Pro mạnh mẽ, camera 48MP, sạc USB-C",
        image: "https://example.com/iphone15promax.jpg",
      },
      {
        name: "Samsung Galaxy S24 Ultra",
        category: categories[0]._id,
        price: 29990000,
        stock: 10,
        description: "Snapdragon 8 Gen 3, bút S Pen, camera zoom 10x",
        image: "https://example.com/s24ultra.jpg",
      },
      {
        name: "MacBook Air M2 2024 13 inch",
        category: categories[1]._id,
        price: 28990000,
        stock: 5,
        description: "Chip M2, pin 18h, cực nhẹ chỉ 1.24kg",
        image: "https://example.com/macbookairm2.jpg",
      },
      {
        name: "ASUS TUF Gaming F15 i7 RTX 4060",
        category: categories[1]._id,
        price: 32990000,
        stock: 4,
        description: "Hiệu năng mạnh mẽ, phù hợp gaming và đồ họa",
        image: "https://example.com/asusf15.jpg",
      },
      {
        name: "Tai nghe Bluetooth Sony WH-1000XM5",
        category: categories[2]._id,
        price: 8990000,
        stock: 15,
        description: "Chống ồn chủ động, pin 30h, sạc nhanh 3 phút nghe 3h",
        image: "https://example.com/sony1000xm5.jpg",
      },
      {
        name: "Chuột Logitech MX Master 3S",
        category: categories[2]._id,
        price: 2490000,
        stock: 20,
        description: "Chuột cao cấp cho dân văn phòng và designer",
        image: "https://example.com/logitechmx3s.jpg",
      },
    ]);
    console.log("📦 Thêm sản phẩm công nghệ mẫu thành công!");

    // ======== 4️⃣ Customer ========
    const customers = await Customer.insertMany([
      {
        name: "Lê Minh Khang",
        phone: "0905123456",
        address: "Hà Nội",
        type: "VIP",
      },
      {
        name: "Nguyễn Thị Hồng",
        phone: "0909555777",
        address: "TP. Hồ Chí Minh",
        type: "Normal",
      },
      {
        name: "Phạm Văn Nam",
        phone: "0912223344",
        address: "Đà Nẵng",
        type: "Normal",
      },
    ]);
    console.log("🧑‍💼 Thêm khách hàng mẫu thành công!");

    console.log("🎉 Import dữ liệu Shop Công Nghệ THB thành công!");
    mongoose.connection.close();
  } catch (error) {
    console.error("❌ Lỗi khi import dữ liệu:", error);
  }
};

seedData();

