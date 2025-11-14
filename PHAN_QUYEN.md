# 🔐 PHÂN QUYỀN HỆ THỐNG - Shop THB

## 📋 Tổng quan

Hệ thống có **2 loại người dùng**:
1. **Admin** - Quản trị viên (quản lý web)
2. **Customer** - Khách hàng (sử dụng Android)

**Lưu ý:** Không có nhân viên (staff) trong hệ thống này.

---

## 👤 CÁC ROLE TRONG HỆ THỐNG

### 1. **Admin** (`role: "admin"`)
- Quyền cao nhất
- Quản lý tất cả: sản phẩm, đơn hàng, người dùng, danh mục
- Xem thống kê, dashboard
- Truy cập trang web admin

### 2. **Customer** (`role: "customer"`)
- Người dùng cuối
- Mua hàng, đặt hàng, đánh giá
- Chỉ xem và quản lý dữ liệu của chính mình
- Sử dụng ứng dụng Android

---

## 🔑 CÁCH PHÂN QUYỀN HOẠT ĐỘNG

### 1. **Backend (API) - Middleware**

#### `verifyToken` - Xác thực token
```javascript
// Kiểm tra token có hợp lệ không
// Tất cả API cần token đều phải qua middleware này
```

#### `requireAdmin` - Chỉ Admin
```javascript
// Chỉ Admin mới được truy cập
if (req.user.role !== "admin") {
  return res.status(403).json({ message: "Chỉ Admin mới có quyền truy cập!" });
}
```

#### `requireAdminOrStaff` - Admin hoặc Staff
```javascript
// Admin hoặc Staff được truy cập
// (Hiện tại không dùng vì không có staff)
if (req.user.role !== "admin" && req.user.role !== "staff") {
  return res.status(403).json({ message: "Không có quyền truy cập!" });
}
```

---

## 📊 BẢNG PHÂN QUYỀN API

### ✅ API KHÔNG CẦN TOKEN (Public)

| API | Mô tả | Admin | Customer |
|-----|-------|-------|----------|
| `POST /api/auth/register` | Đăng ký | ✅ | ✅ |
| `POST /api/auth/login` | Đăng nhập | ✅ | ✅ |
| `GET /api/products` | Danh sách sản phẩm | ✅ | ✅ |
| `GET /api/products/:id` | Chi tiết sản phẩm | ✅ | ✅ |
| `GET /api/categories/all` | Tất cả danh mục | ✅ | ✅ |
| `GET /api/categories/:id` | Chi tiết danh mục | ✅ | ✅ |
| `GET /api/home` | Trang chủ | ✅ | ✅ |
| `GET /api/reviews/product/:id` | Đánh giá sản phẩm | ✅ | ✅ |

---

### 🔒 API CẦN TOKEN - CẢ ADMIN VÀ CUSTOMER

| API | Mô tả | Admin | Customer | Ghi chú |
|-----|-------|-------|----------|---------|
| `GET /api/auth/me` | Thông tin user | ✅ | ✅ | Xem thông tin của chính mình |
| `PUT /api/auth/me` | Cập nhật profile | ✅ | ✅ | Sửa thông tin của chính mình |
| `PUT /api/auth/change-password` | Đổi mật khẩu | ✅ | ✅ | Đổi mật khẩu của chính mình |

---

### 🛒 API CART - CHỈ CUSTOMER

| API | Mô tả | Admin | Customer |
|-----|-------|-------|----------|
| `GET /api/cart` | Lấy giỏ hàng | ❌ | ✅ |
| `POST /api/cart` | Thêm vào giỏ | ❌ | ✅ |
| `PUT /api/cart/:itemId` | Cập nhật giỏ | ❌ | ✅ |
| `DELETE /api/cart/:itemId` | Xóa khỏi giỏ | ❌ | ✅ |

**Lưu ý:** Admin không có giỏ hàng (vì không mua hàng trên web)

---

### 📋 API ORDERS - PHÂN QUYỀN THEO ROLE

| API | Mô tả | Admin | Customer | Ghi chú |
|-----|-------|-------|----------|---------|
| `GET /api/orders` | Danh sách đơn hàng | ✅ Tất cả | ✅ Chỉ của mình | Admin xem tất cả, Customer chỉ xem của mình |
| `GET /api/orders/:id` | Chi tiết đơn hàng | ✅ Tất cả | ✅ Chỉ của mình | Admin xem tất cả, Customer chỉ xem của mình |
| `POST /api/orders` | Tạo đơn hàng | ❌ | ✅ | Chỉ Customer tạo đơn hàng |
| `PUT /api/orders/:id/status` | Cập nhật trạng thái | ✅ | ❌ | Chỉ Admin cập nhật trạng thái |
| `PUT /api/orders/:id/cancel` | Hủy đơn hàng | ✅ | ✅ Chỉ của mình | Customer chỉ hủy đơn của mình |

**Logic phân quyền:**
```javascript
// GET /api/orders
if (req.user.role === "customer") {
  query.customer = req.user.userId; // Chỉ lấy đơn hàng của mình
}
// Admin: lấy tất cả đơn hàng
```

---

### ⭐ API REVIEWS - CẢ ADMIN VÀ CUSTOMER

| API | Mô tả | Admin | Customer |
|-----|-------|-------|----------|
| `GET /api/reviews/product/:id` | Đánh giá sản phẩm | ✅ | ✅ |
| `GET /api/reviews/my` | Đánh giá của mình | ✅ | ✅ |
| `POST /api/reviews` | Thêm đánh giá | ✅ | ✅ |
| `PUT /api/reviews/:id` | Cập nhật đánh giá | ✅ | ✅ Chỉ của mình |
| `DELETE /api/reviews/:id` | Xóa đánh giá | ✅ | ✅ Chỉ của mình |

**Lưu ý:** Customer chỉ sửa/xóa đánh giá của chính mình

---

### ❤️ API FAVORITES - CHỈ CUSTOMER

| API | Mô tả | Admin | Customer |
|-----|-------|-------|----------|
| `GET /api/favorites` | Danh sách yêu thích | ❌ | ✅ |
| `POST /api/favorites/:id` | Thêm yêu thích | ❌ | ✅ |
| `DELETE /api/favorites/:id` | Xóa yêu thích | ❌ | ✅ |

---

### 📍 API ADDRESSES - CHỈ CUSTOMER

| API | Mô tả | Admin | Customer |
|-----|-------|-------|----------|
| `GET /api/addresses` | Danh sách địa chỉ | ❌ | ✅ |
| `POST /api/addresses` | Thêm địa chỉ | ❌ | ✅ |
| `PUT /api/addresses/:id` | Cập nhật địa chỉ | ❌ | ✅ |
| `DELETE /api/addresses/:id` | Xóa địa chỉ | ❌ | ✅ |

---

### 🔔 API NOTIFICATIONS - CẢ ADMIN VÀ CUSTOMER

| API | Mô tả | Admin | Customer |
|-----|-------|-------|----------|
| `GET /api/notifications` | Danh sách thông báo | ✅ | ✅ |
| `PUT /api/notifications/:id/read` | Đánh dấu đã đọc | ✅ | ✅ |
| `DELETE /api/notifications/:id` | Xóa thông báo | ✅ | ✅ |

---

### 👥 API USERS - CHỈ ADMIN

| API | Mô tả | Admin | Customer |
|-----|-------|-------|----------|
| `GET /api/users` | Danh sách người dùng | ✅ | ❌ |
| `GET /api/users/:id` | Chi tiết người dùng | ✅ | ❌ |
| `POST /api/users` | Thêm người dùng | ✅ | ❌ |
| `PUT /api/users/:id` | Cập nhật người dùng | ✅ | ❌ |
| `DELETE /api/users/:id` | Xóa người dùng | ✅ | ❌ |
| `GET /api/users/:id/orders` | Lịch sử mua hàng | ✅ | ✅ Chỉ của mình |

**Middleware:** `verifyToken, requireAdmin`

---

### 📦 API PRODUCTS - PHÂN QUYỀN

| API | Mô tả | Admin | Customer | Ghi chú |
|-----|-------|-------|----------|---------|
| `GET /api/products` | Danh sách sản phẩm | ✅ Tất cả | ✅ Chỉ active | Admin xem tất cả, Customer chỉ xem status=1 |
| `GET /api/products/:id` | Chi tiết sản phẩm | ✅ Tất cả | ✅ Chỉ active | Admin xem tất cả, Customer chỉ xem status=1 |
| `POST /api/products` | Thêm sản phẩm | ✅ | ❌ | Chỉ Admin |
| `PUT /api/products/:id` | Cập nhật sản phẩm | ✅ | ❌ | Chỉ Admin |
| `DELETE /api/products/:id` | Xóa sản phẩm | ✅ | ❌ | Chỉ Admin |

**Logic phân quyền:**
```javascript
// GET /api/products
if (status === undefined) {
  // Mặc định chỉ hiển thị sản phẩm đang hoạt động cho customer
  query.status = 1;
}
// Admin có thể xem tất cả (kể cả status=0)
```

**Middleware:** 
- GET: Không cần token (public)
- POST/PUT/DELETE: `verifyToken, requireAdmin`

---

### 🗂️ API CATEGORIES - PHÂN QUYỀN

| API | Mô tả | Admin | Customer | Ghi chú |
|-----|-------|-------|----------|---------|
| `GET /api/categories` | Danh sách danh mục | ✅ Tất cả | ✅ Chỉ active | Admin xem tất cả, Customer chỉ xem status=1 |
| `GET /api/categories/all` | Tất cả danh mục | ✅ | ✅ | Public |
| `GET /api/categories/:id` | Chi tiết danh mục | ✅ | ✅ | Public |
| `POST /api/categories` | Thêm danh mục | ✅ | ❌ | Chỉ Admin |
| `PUT /api/categories/:id` | Cập nhật danh mục | ✅ | ❌ | Chỉ Admin |
| `DELETE /api/categories/:id` | Xóa danh mục | ✅ | ❌ | Chỉ Admin |

**Middleware:**
- GET: Không cần token (public)
- POST/PUT/DELETE: `verifyToken, requireAdmin`

---

### 📊 API DASHBOARD - CHỈ ADMIN

| API | Mô tả | Admin | Customer |
|-----|-------|-------|----------|
| `GET /api/dashboard` | Dashboard tổng quan | ✅ | ❌ |
| `GET /api/dashboard/revenue` | Doanh thu | ✅ | ❌ |
| `GET /api/dashboard/top-products` | Sản phẩm bán chạy | ✅ | ❌ |

**Middleware:** `verifyToken, requireAdmin`

---

### 📈 API STATISTICS - CHỈ ADMIN

| API | Mô tả | Admin | Customer |
|-----|-------|-------|----------|
| `GET /api/statistics/overview` | Tổng quan thống kê | ✅ | ❌ |
| `GET /api/statistics/top-products/quantity` | Top sản phẩm (số lượng) | ✅ | ❌ |
| `GET /api/statistics/top-products/revenue` | Top sản phẩm (doanh thu) | ✅ | ❌ |
| `GET /api/statistics/revenue/daily` | Doanh thu theo ngày | ✅ | ❌ |
| `GET /api/statistics/revenue/monthly` | Doanh thu theo tháng | ✅ | ❌ |
| `GET /api/statistics/revenue/yearly` | Doanh thu theo năm | ✅ | ❌ |
| `GET /api/statistics/low-stock` | Sản phẩm tồn kho thấp | ✅ | ❌ |
| `GET /api/statistics/payment-methods` | Thống kê phương thức thanh toán | ✅ | ❌ |

**Middleware:** `verifyToken, requireAdmin`

---

## 🖥️ PHÂN QUYỀN TRONG FRONTEND (WEB)

### Khi đăng nhập thành công:

```javascript
async function checkAuth() {
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (response.ok) {
    currentUser = await response.json();
    
    // Hiển thị tên user
    document.getElementById('userName').textContent = currentUser.fullName;
    
    // Ẩn nút đăng nhập, hiện nút đăng xuất
    document.getElementById('loginBtn').classList.add('hidden');
    document.getElementById('logoutBtn').classList.remove('hidden');
    
    // Phân quyền: Chỉ Admin mới thấy link Dashboard
    if (currentUser.role === 'admin') {
      document.getElementById('adminLink').classList.remove('hidden');
      showSection('home'); // Hoặc 'dashboard'
    } else {
      // Customer không thể truy cập web admin
      document.getElementById('adminLink').classList.add('hidden');
      showSection('home');
    }
  }
}
```

### Các section trong Web:

| Section | Admin | Customer |
|---------|-------|----------|
| **Trang chủ** | ✅ | ✅ |
| **Sản phẩm** | ✅ | ✅ |
| **Giỏ hàng** | ❌ | ✅ |
| **Đơn hàng** | ❌ | ✅ |
| **Dashboard** | ✅ | ❌ |

**Logic:**
- Admin: Thấy tất cả + Dashboard
- Customer: Không nên truy cập web (dùng Android)

---

## 🔒 BẢO MẬT

### 1. **Token JWT**
- Token chứa: `userId`, `username`, `role`
- Thời hạn: 1 ngày (hoặc 30 ngày nếu `rememberMe: true`)
- Lưu trong `localStorage` (web) hoặc `SharedPreferences` (Android)

### 2. **Kiểm tra quyền ở Backend**
- **Luôn kiểm tra quyền ở Backend**, không tin tưởng Frontend
- Frontend chỉ ẩn/hiện UI, nhưng Backend mới quyết định quyền truy cập

### 3. **Ví dụ bảo mật:**

```javascript
// ❌ SAI - Chỉ kiểm tra ở Frontend
if (currentUser.role === 'admin') {
  // Cho phép truy cập
}

// ✅ ĐÚNG - Kiểm tra ở Backend
router.get("/dashboard", verifyToken, requireAdmin, async (req, res) => {
  // Chỉ Admin mới vào được đây
});
```

---

## 📱 PHÂN QUYỀN TRONG ANDROID

### Customer sử dụng Android:
- Đăng nhập → Lấy token
- Token chứa `role: "customer"`
- Chỉ gọi được API dành cho Customer
- Nếu gọi API Admin → Server trả về `403 Forbidden`

### Ví dụ trong Android:

```kotlin
// Lưu token sau khi đăng nhập
val token = response.token
SharedPreferences.Editor.putString("token", token).apply()

// Gọi API với token
val request = Request.Builder()
    .url("${API_URL}/cart")
    .addHeader("Authorization", "Bearer $token")
    .build()

// Xử lý lỗi 403
if (response.code == 403) {
    // Không có quyền truy cập
    showError("Bạn không có quyền truy cập!")
}
```

---

## 🎯 TÓM TẮT PHÂN QUYỀN

### Admin (Web):
- ✅ Quản lý sản phẩm (CRUD)
- ✅ Quản lý danh mục (CRUD)
- ✅ Quản lý người dùng (CRUD)
- ✅ Xem tất cả đơn hàng
- ✅ Cập nhật trạng thái đơn hàng
- ✅ Xem dashboard, thống kê
- ❌ Không có giỏ hàng
- ❌ Không tạo đơn hàng

### Customer (Android):
- ✅ Xem sản phẩm (chỉ active)
- ✅ Xem danh mục
- ✅ Thêm vào giỏ hàng
- ✅ Tạo đơn hàng
- ✅ Xem đơn hàng của mình
- ✅ Hủy đơn hàng của mình
- ✅ Đánh giá sản phẩm
- ✅ Yêu thích sản phẩm
- ✅ Quản lý địa chỉ
- ✅ Xem thông báo
- ❌ Không quản lý sản phẩm
- ❌ Không xem dashboard
- ❌ Không xem đơn hàng của người khác

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **Luôn kiểm tra quyền ở Backend**
   - Frontend chỉ ẩn/hiện UI
   - Backend mới quyết định quyền truy cập

2. **Token phải được gửi trong Header**
   ```
   Authorization: Bearer <token>
   ```

3. **Xử lý lỗi 403 (Forbidden)**
   - Nếu user không có quyền → Trả về 403
   - Frontend/Android cần xử lý và thông báo cho user

4. **Customer không nên truy cập Web**
   - Web chỉ dành cho Admin
   - Customer dùng Android app

5. **Admin không có giỏ hàng**
   - Admin không mua hàng trên web
   - Chỉ quản lý hệ thống

---

## 🔍 KIỂM TRA PHÂN QUYỀN

### Test với Postman/curl:

```bash
# 1. Đăng nhập Admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Lấy token từ response

# 2. Test API Admin (thành công)
curl -X GET http://localhost:3000/api/dashboard \
  -H "Authorization: Bearer <admin_token>"

# 3. Đăng nhập Customer
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"customer1","password":"123456"}'

# 4. Test API Admin với Customer token (lỗi 403)
curl -X GET http://localhost:3000/api/dashboard \
  -H "Authorization: Bearer <customer_token>"
# Response: {"message": "Chỉ Admin mới có quyền truy cập!"}
```

---

## ✅ KẾT LUẬN

**Hệ thống phân quyền rõ ràng:**
- ✅ Admin: Quản lý toàn bộ hệ thống (Web)
- ✅ Customer: Mua hàng, đặt hàng (Android)
- ✅ Backend kiểm tra quyền chặt chẽ
- ✅ Frontend chỉ ẩn/hiện UI theo role

**Bảo mật:**
- ✅ Token JWT
- ✅ Middleware kiểm tra quyền
- ✅ Mỗi API có quyền riêng

