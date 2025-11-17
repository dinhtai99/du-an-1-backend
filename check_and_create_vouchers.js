const mongoose = require("mongoose");
require("dotenv").config();

const Voucher = require("./models/Voucher");

// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  family: 4
})
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ Connection failed:", err);
    process.exit(1);
  });

async function checkAndCreateVouchers() {
  try {
    // Kiểm tra số lượng voucher hiện có
    const count = await Voucher.countDocuments();
    console.log(`\n📊 Tổng số voucher hiện có: ${count}`);

    if (count === 0) {
      console.log("\n⚠️  Chưa có voucher nào! Đang tạo voucher mẫu...\n");

      const now = new Date();
      const vouchers = [
        {
          code: "SALE10",
          name: "Giảm 10% vào ngày 20/10",
          description: "Áp dụng cho tất cả đơn hàng từ 50.000 VNĐ",
          type: "percentage",
          value: 10,
          minOrderValue: 50000,
          maxDiscount: 50000,
          quantity: 100,
          usedCount: 0,
          startDate: new Date(now.getFullYear(), 9, 20), // 20/10
          endDate: new Date(now.getFullYear(), 9, 20, 23, 59, 59),
          status: 1,
        },
        {
          code: "BLACKFRIDAY",
          name: "Giảm 20% cho đơn hàng lớn",
          description: "Black Friday - Giảm 20% cho đơn hàng từ 200.000 VNĐ",
          type: "percentage",
          value: 20,
          minOrderValue: 200000,
          maxDiscount: 100000,
          quantity: 50,
          usedCount: 0,
          startDate: new Date(now.getFullYear(), 10, 24), // 24/11 (Black Friday)
          endDate: new Date(now.getFullYear(), 10, 30, 23, 59, 59),
          status: 1,
        },
        {
          code: "NEWYEAR",
          name: "Giảm 15% đón năm mới",
          description: "Chào mừng năm mới - Giảm 15% cho đơn hàng từ 100.000 VNĐ",
          type: "percentage",
          value: 15,
          minOrderValue: 100000,
          maxDiscount: 75000,
          quantity: 200,
          usedCount: 0,
          startDate: new Date(now.getFullYear(), 11, 25), // 25/12
          endDate: new Date(now.getFullYear() + 1, 0, 5, 23, 59, 59), // 5/1 năm sau
          status: 1,
        },
        {
          code: "FREESHIP",
          name: "Miễn phí vận chuyển",
          description: "Miễn phí vận chuyển cho đơn hàng từ 150.000 VNĐ",
          type: "fixed",
          value: 30000,
          minOrderValue: 150000,
          quantity: 500,
          usedCount: 0,
          startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          endDate: new Date(now.getFullYear(), now.getMonth() + 1, now.getDate(), 23, 59, 59),
          status: 1,
        },
        {
          code: "WELCOME",
          name: "Voucher chào mừng",
          description: "Giảm 50.000 VNĐ cho đơn hàng đầu tiên",
          type: "fixed",
          value: 50000,
          minOrderValue: 100000,
          quantity: 1000,
          usedCount: 0,
          startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          endDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate(), 23, 59, 59),
          status: 1,
        },
      ];

      const created = await Voucher.insertMany(vouchers);
      console.log(`✅ Đã tạo ${created.length} voucher mẫu:\n`);
      
      created.forEach((v, index) => {
        console.log(`${index + 1}. ${v.code} - ${v.name}`);
        console.log(`   Giá trị: ${v.type === 'percentage' ? v.value + '%' : v.value.toLocaleString('vi-VN') + ' VNĐ'}`);
        console.log(`   Số lượng: ${v.quantity}`);
        console.log(`   Thời gian: ${v.startDate.toLocaleDateString('vi-VN')} - ${v.endDate.toLocaleDateString('vi-VN')}`);
        console.log("");
      });
    } else {
      console.log("\n✅ Đã có voucher trong hệ thống!\n");
      
      // Hiển thị danh sách voucher
      const allVouchers = await Voucher.find().sort({ createdAt: -1 });
      console.log("📋 Danh sách voucher:\n");
      
      allVouchers.forEach((v, index) => {
        const now = new Date();
        let statusText = v.status === 1 ? "Hoạt động" : "Dừng hoạt động";
        if (v.endDate < now) statusText = "Hết hạn";
        if (v.usedCount >= v.quantity) statusText = "Hết số lượng";
        
        console.log(`${index + 1}. ${v.code} - ${v.name}`);
        console.log(`   Giá trị: ${v.type === 'percentage' ? v.value + '%' : v.value.toLocaleString('vi-VN') + ' VNĐ'}`);
        console.log(`   Số lượng: ${v.quantity} (Đã dùng: ${v.usedCount})`);
        console.log(`   Trạng thái: ${statusText}`);
        console.log(`   Thời gian: ${v.startDate.toLocaleDateString('vi-VN')} - ${v.endDate.toLocaleDateString('vi-VN')}`);
        console.log("");
      });
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkAndCreateVouchers();

