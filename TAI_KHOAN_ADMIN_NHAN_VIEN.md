# Tài khoản Admin và Nhân viên

## 📋 Thông tin đăng nhập mặc định

Sau khi chạy file `seed.js`, hệ thống sẽ tạo 2 tài khoản mẫu:

### 👑 Tài khoản Admin:
- **Username:** `admin`
- **Password:** `admin123`
- **Họ tên:** Trần Đình Tài (Admin)
- **Số điện thoại:** 0987654321
- **Role:** admin

### 👤 Tài khoản Nhân viên:
- **Username:** `nhanvien1`
- **Password:** `staff123`
- **Họ tên:** Nguyễn Văn B (Nhân viên)
- **Số điện thoại:** 0912345678
- **Role:** staff

---

## 🚀 Cách tạo tài khoản mẫu

### Bước 1: Chạy seed script
```bash
cd /Users/trantai/Desktop/Shop_THB
node seed.js
```

### Bước 2: Kiểm tra kết quả
Bạn sẽ thấy thông báo:
```
✅ Kết nối MongoDB thành công!
👥 Thêm người dùng mẫu thành công!
🗂️ Thêm loại sản phẩm mẫu thành công!
📦 Thêm sản phẩm công nghệ mẫu thành công!
🧑‍💼 Thêm khách hàng mẫu thành công!
🎉 Import dữ liệu Shop Công Nghệ THB thành công!
```

---

## 🔐 Đăng nhập

### API Endpoint:
```
POST http://localhost:3000/api/auth/login
```

### Request Body:
```json
{
  "username": "admin",
  "password": "admin123",
  "rememberMe": false
}
```

### Response (Thành công):
```json
{
  "message": "Đăng nhập thành công!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "username": "admin",
    "fullName": "Trần Đình Tài (Admin)",
    "role": "admin",
    "avatar": "",
    "phone": "0987654321"
  }
}
```

---

## 👥 Phân quyền Admin và Nhân viên

### Role: `admin`
- Quyền cao nhất, có thể:
  - Quản lý tất cả người dùng (thêm, sửa, xóa)
  - Quản lý sản phẩm, danh mục
  - Quản lý khách hàng, hóa đơn
  - Xem thống kê
  - Tất cả các chức năng của nhân viên

### Role: `staff`
- Quyền cơ bản, có thể:
  - Xem và quản lý sản phẩm
  - Xem và quản lý khách hàng
  - Tạo và quản lý hóa đơn
  - Xem thống kê cơ bản
  - **KHÔNG** thể quản lý người dùng khác

---

## 🛡️ Bảo mật

### Tính năng bảo vệ tài khoản:
1. **Khóa tài khoản sau 5 lần đăng nhập sai**
   - Tài khoản sẽ bị khóa trong 30 phút
   - Thông báo: "Đăng nhập sai quá 5 lần. Tài khoản đã bị khóa 30 phút!"

2. **Mật khẩu được mã hóa**
   - Sử dụng bcryptjs để hash mật khẩu
   - Không lưu mật khẩu dạng plain text

3. **JWT Token**
   - Token có thời hạn: 1 ngày (mặc định) hoặc 30 ngày (nếu chọn "Lưu mật khẩu")
   - Token chứa thông tin: userId, username, role

---

## 📝 Tạo tài khoản mới

### Cách 1: Qua API (nếu có endpoint đăng ký)
```bash
POST http://localhost:3000/api/auth/register
```

### Cách 2: Thêm trực tiếp vào MongoDB
1. Mở MongoDB Compass
2. Vào database `ShopTHB` → collection `users`
3. Thêm document mới với cấu trúc:
```json
{
  "username": "username_moi",
  "password": "hashed_password", // Phải hash bằng bcrypt
  "fullName": "Họ và tên",
  "phone": "0123456789",
  "role": "admin" hoặc "staff",
  "gender": "male",
  "isLocked": false,
  "loginAttempts": 0
}
```

### Cách 3: Sửa file seed.js
Thêm user mới vào mảng `users` trong file `seed.js`, sau đó chạy lại:
```bash
node seed.js
```

---

## ⚠️ Lưu ý

1. **Đổi mật khẩu sau lần đầu đăng nhập**
   - Sử dụng API: `PUT /api/auth/change-password`

2. **File seed.js sẽ XÓA tất cả dữ liệu cũ**
   - Chỉ chạy khi muốn reset toàn bộ dữ liệu
   - Backup dữ liệu trước khi chạy nếu cần

3. **Mật khẩu mặc định không an toàn**
   - Nên đổi mật khẩu ngay sau khi setup

---

## 🔧 Cấu trúc User Model

```javascript
{
  username: String (unique, required),
  password: String (hashed, required),
  fullName: String (required),
  gender: "male" | "female" | "other",
  dateOfBirth: Date,
  phone: String,
  role: "admin" | "staff" (default: "staff"),
  avatar: String,
  isLocked: Boolean (default: false),
  loginAttempts: Number (default: 0),
  lockUntil: Date,
  createdAt: Date,
  updatedAt: Date
}
```

