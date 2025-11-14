# 👥 TÀI KHOẢN KHÁCH HÀNG - Shop THB

## 📋 Tổng quan

**Khách hàng (Customer)** là người dùng cuối, sử dụng ứng dụng Android để:
- Xem sản phẩm
- Mua hàng, đặt hàng
- Quản lý đơn hàng của mình
- Đánh giá sản phẩm
- Yêu thích sản phẩm

---

## 🔐 TÀI KHOẢN KHÁCH HÀNG MẪU

Sau khi chạy `seed.js`, hệ thống sẽ tạo **2 tài khoản khách hàng mẫu**:

### 👤 Customer 1:
- **Username:** `customer1`
- **Password:** `123456`
- **Email:** `customer1@example.com`
- **Họ tên:** Nguyễn Văn A (Khách hàng)
- **Số điện thoại:** 0912345678
- **Role:** customer

### 👤 Customer 2:
- **Username:** `customer2`
- **Password:** `123456`
- **Email:** `customer2@example.com`
- **Họ tên:** Trần Thị B (Khách hàng)
- **Số điện thoại:** 0923456789
- **Role:** customer

---

## 🚀 CÁCH TẠO TÀI KHOẢN KHÁCH HÀNG

### Cách 1: Khách hàng tự đăng ký (Qua Android App)

**API Endpoint:**
```
POST http://localhost:3000/api/auth/register
```

**Request Body:**
```json
{
  "username": "newcustomer",
  "password": "123456",
  "email": "newcustomer@example.com",
  "fullName": "Lê Văn C",
  "phone": "0934567890"
}
```

**Response (201):**
```json
{
  "message": "Đăng ký thành công!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "username": "newcustomer",
    "email": "newcustomer@example.com",
    "fullName": "Lê Văn C",
    "role": "customer",
    "phone": "0934567890"
  }
}
```

**Lưu ý:**
- Tự động set `role: "customer"`
- Token được trả về ngay sau khi đăng ký
- Không cần xác nhận email (có thể thêm sau)

---

### Cách 2: Admin tạo tài khoản khách hàng (Qua Web Admin)

**API Endpoint:**
```
POST http://localhost:3000/api/users
```

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "customer3",
  "password": "123456",
  "email": "customer3@example.com",
  "fullName": "Phạm Văn D",
  "phone": "0945678901",
  "role": "customer"
}
```

**Response (201):**
```json
{
  "message": "Thêm người dùng thành công!",
  "user": {
    "_id": "...",
    "username": "customer3",
    "email": "customer3@example.com",
    "fullName": "Phạm Văn D",
    "role": "customer"
  }
}
```

**Lưu ý:**
- Chỉ Admin mới có quyền tạo tài khoản qua API này
- Có thể set `role: "customer"` hoặc để mặc định

---

### Cách 3: Thêm vào seed.js (Để test)

Thêm vào mảng `users` trong file `seed.js`:

```javascript
{
  username: "customer3",
  password: passwordCustomer,
  email: "customer3@example.com",
  fullName: "Phạm Văn D",
  phone: "0945678901",
  role: "customer",
}
```

Sau đó chạy:
```bash
node seed.js
```

**⚠️ Lưu ý:** `seed.js` sẽ **XÓA TẤT CẢ** dữ liệu cũ, chỉ dùng khi muốn reset toàn bộ!

---

## 📱 ĐĂNG NHẬP KHÁCH HÀNG (Android)

**API Endpoint:**
```
POST http://localhost:3000/api/auth/login
```

**Request Body:**
```json
{
  "username": "customer1",
  "password": "123456",
  "rememberMe": false
}
```

**Response (200):**
```json
{
  "message": "Đăng nhập thành công!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "username": "customer1",
    "fullName": "Nguyễn Văn A (Khách hàng)",
    "role": "customer",
    "email": "customer1@example.com",
    "phone": "0912345678"
  }
}
```

**Lưu ý:**
- Token có hiệu lực 1 ngày (hoặc 30 ngày nếu `rememberMe: true`)
- Lưu token để dùng cho các API khác

---

## 👨‍💼 ADMIN QUẢN LÝ KHÁCH HÀNG

### 1. Xem danh sách khách hàng

**API Endpoint:**
```
GET http://localhost:3000/api/users?role=customer&page=1&limit=10
```

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "users": [
    {
      "_id": "...",
      "username": "customer1",
      "email": "customer1@example.com",
      "fullName": "Nguyễn Văn A",
      "phone": "0912345678",
      "role": "customer",
      "createdAt": "2024-01-01T10:00:00.000Z"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

---

### 2. Xem danh sách khách hàng với thống kê

**API Endpoint:**
```
GET http://localhost:3000/api/users/customers/list?search=&page=1&limit=10
```

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "customers": [
    {
      "_id": "...",
      "username": "customer1",
      "email": "customer1@example.com",
      "fullName": "Nguyễn Văn A",
      "phone": "0912345678",
      "totalOrders": 5,
      "totalSpent": 150000000,
      "lastOrderDate": "2024-01-15T10:00:00.000Z"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

**Thống kê bao gồm:**
- `totalOrders`: Tổng số đơn hàng đã hoàn thành
- `totalSpent`: Tổng số tiền đã chi
- `lastOrderDate`: Ngày đặt hàng gần nhất

---

### 3. Xem chi tiết khách hàng

**API Endpoint:**
```
GET http://localhost:3000/api/users/:id
```

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "_id": "...",
  "username": "customer1",
  "email": "customer1@example.com",
  "fullName": "Nguyễn Văn A",
  "phone": "0912345678",
  "role": "customer",
  "gender": "male",
  "dateOfBirth": null,
  "avatar": "",
  "createdAt": "2024-01-01T10:00:00.000Z"
}
```

---

### 4. Xem lịch sử mua hàng của khách hàng

**API Endpoint:**
```
GET http://localhost:3000/api/users/:id/orders
```

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "orders": [
    {
      "_id": "...",
      "orderNumber": "DH20240101001",
      "total": 33990000,
      "status": "completed",
      "createdAt": "2024-01-01T10:00:00.000Z",
      "items": [...]
    }
  ],
  "total": 5
}
```

**Lưu ý:**
- Admin: Xem được lịch sử của bất kỳ customer nào
- Customer: Chỉ xem được lịch sử của chính mình

---

### 5. Cập nhật thông tin khách hàng

**API Endpoint:**
```
PUT http://localhost:3000/api/users/:id
```

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "fullName": "Nguyễn Văn A Updated",
  "phone": "0987654321",
  "email": "newemail@example.com"
}
```

**Response (200):**
```json
{
  "message": "Cập nhật người dùng thành công!",
  "user": { ... }
}
```

---

### 6. Xóa khách hàng

**API Endpoint:**
```
DELETE http://localhost:3000/api/users/:id
```

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "message": "Xóa người dùng thành công!"
}
```

**⚠️ Lưu ý:** Xóa khách hàng sẽ không xóa đơn hàng của họ (để giữ lịch sử)

---

## 🔍 TÌM KIẾM KHÁCH HÀNG

### Tìm kiếm theo tên, email, phone

**API Endpoint:**
```
GET http://localhost:3000/api/users?search=nguyen&role=customer
```

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `search` - Tìm kiếm theo username, fullName, email, phone
- `role` - Lọc theo role (customer)
- `page` - Trang
- `limit` - Số lượng mỗi trang

---

## 📊 THỐNG KÊ KHÁCH HÀNG

### Dashboard Admin hiển thị:
- Tổng số khách hàng
- Khách hàng mới trong tháng
- Top khách hàng mua nhiều nhất

**API Endpoint:**
```
GET http://localhost:3000/api/dashboard
```

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "totalCustomers": 50,
  "newCustomers": 10,
  "topCustomers": [
    {
      "customer": { "fullName": "Nguyễn Văn A", ... },
      "totalSpent": 150000000,
      "totalOrders": 5
    }
  ]
}
```

---

## 🔐 BẢO MẬT TÀI KHOẢN KHÁCH HÀNG

### 1. Khóa tài khoản sau 5 lần đăng nhập sai
- Tài khoản bị khóa trong **30 phút**
- Thông báo: "Đăng nhập sai quá 5 lần. Tài khoản đã bị khóa 30 phút!"

### 2. Mật khẩu được mã hóa
- Sử dụng `bcryptjs` để hash mật khẩu
- Không lưu mật khẩu dạng plain text

### 3. JWT Token
- Token chứa: `userId`, `username`, `role`
- Thời hạn: 1 ngày (hoặc 30 ngày nếu `rememberMe: true`)

---

## 📝 CẬP NHẬT THÔNG TIN CÁ NHÂN (Customer tự sửa)

**API Endpoint:**
```
PUT http://localhost:3000/api/auth/me
```

**Headers:**
```
Authorization: Bearer <customer_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "fullName": "Nguyễn Văn A Updated",
  "email": "newemail@example.com",
  "phone": "0987654321",
  "gender": "male",
  "dateOfBirth": "1990-01-01",
  "avatar": "https://..."
}
```

**Response (200):**
```json
{
  "message": "Cập nhật thông tin thành công!",
  "user": { ... }
}
```

**Lưu ý:** Customer chỉ sửa được thông tin của chính mình

---

## 🔑 ĐỔI MẬT KHẨU (Customer tự đổi)

**API Endpoint:**
```
PUT http://localhost:3000/api/auth/change-password
```

**Headers:**
```
Authorization: Bearer <customer_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "oldPassword": "123456",
  "newPassword": "newpassword123",
  "confirmPassword": "newpassword123"
}
```

**Response (200):**
```json
{
  "message": "Đổi mật khẩu thành công!"
}
```

---

## 📱 SỬ DỤNG TRONG ANDROID

### 1. Đăng ký tài khoản mới

```kotlin
val requestBody = JSONObject().apply {
    put("username", "newcustomer")
    put("password", "123456")
    put("email", "newcustomer@example.com")
    put("fullName", "Lê Văn C")
    put("phone", "0934567890")
}

val request = Request.Builder()
    .url("${API_URL}/auth/register")
    .post(requestBody.toString().toRequestBody("application/json".toMediaType()))
    .build()

val response = client.newCall(request).execute()
val responseBody = response.body?.string()
// Lưu token từ response
```

### 2. Đăng nhập

```kotlin
val requestBody = JSONObject().apply {
    put("username", "customer1")
    put("password", "123456")
    put("rememberMe", false)
}

val request = Request.Builder()
    .url("${API_URL}/auth/login")
    .post(requestBody.toString().toRequestBody("application/json".toMediaType()))
    .build()

val response = client.newCall(request).execute()
val token = // Lấy token từ response
SharedPreferences.Editor.putString("token", token).apply()
```

### 3. Lấy thông tin user

```kotlin
val token = SharedPreferences.getString("token", "")
val request = Request.Builder()
    .url("${API_URL}/auth/me")
    .addHeader("Authorization", "Bearer $token")
    .build()

val response = client.newCall(request).execute()
val user = // Parse user từ response
```

---

## ✅ TÓM TẮT

### Khách hàng có thể:
- ✅ Đăng ký tài khoản mới (qua Android)
- ✅ Đăng nhập
- ✅ Xem và cập nhật thông tin cá nhân
- ✅ Đổi mật khẩu
- ✅ Mua hàng, đặt hàng
- ✅ Xem đơn hàng của mình
- ✅ Đánh giá sản phẩm
- ✅ Yêu thích sản phẩm

### Admin có thể:
- ✅ Xem danh sách tất cả khách hàng
- ✅ Xem thống kê khách hàng
- ✅ Xem lịch sử mua hàng của khách hàng
- ✅ Cập nhật thông tin khách hàng
- ✅ Xóa khách hàng

---

## 🎯 KẾT LUẬN

**Tài khoản khách hàng:**
- ✅ Tự đăng ký qua Android app
- ✅ Admin quản lý qua web admin
- ✅ Có tài khoản mẫu trong seed.js để test
- ✅ Bảo mật: Mật khẩu hash, khóa sau 5 lần sai
- ✅ Token JWT để xác thực

**Bạn có thể:**
1. Dùng tài khoản mẫu: `customer1` / `123456` để test
2. Tạo tài khoản mới qua Android app
3. Admin quản lý khách hàng qua web admin

