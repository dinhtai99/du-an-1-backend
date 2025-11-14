# 📱 API CHO ANDROID - KHÁCH HÀNG

## 🔗 Base URL
```
http://localhost:3000/api
```
**Lưu ý:** Khi deploy, thay `localhost:3000` bằng domain/IP thực tế của server.

---

## 🔐 1. AUTHENTICATION (`/api/auth`)

### POST `/api/auth/register` - Đăng ký tài khoản
**Không cần token**

**Request Body:**
```json
{
  "username": "customer1",
  "password": "123456",
  "email": "customer1@example.com",
  "fullName": "Nguyễn Văn A",
  "phone": "0912345678"
}
```

**Response (201):**
```json
{
  "message": "Đăng ký thành công!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "username": "customer1",
    "email": "customer1@example.com",
    "fullName": "Nguyễn Văn A",
    "role": "customer",
    "phone": "0912345678"
  }
}
```

---

### POST `/api/auth/login` - Đăng nhập
**Không cần token**

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
    "fullName": "Nguyễn Văn A",
    "role": "customer"
  }
}
```

**Lưu ý:** 
- `rememberMe: true` → Token có hiệu lực 30 ngày
- `rememberMe: false` → Token có hiệu lực 1 ngày

---

### GET `/api/auth/me` - Lấy thông tin user hiện tại
**Cần token**

**Headers:**
```
Authorization: Bearer <token>
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
  "avatar": "",
  "gender": "male",
  "dateOfBirth": null
}
```

---

### PUT `/api/auth/me` - Cập nhật thông tin cá nhân
**Cần token**

**Headers:**
```
Authorization: Bearer <token>
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

---

### PUT `/api/auth/change-password` - Đổi mật khẩu
**Cần token**

**Headers:**
```
Authorization: Bearer <token>
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

## 📦 2. PRODUCTS (`/api/products`)

### GET `/api/products` - Lấy danh sách sản phẩm
**Không cần token**

**Query Parameters:**
- `search` - Tìm kiếm theo tên
- `category` - Lọc theo danh mục (category ID)
- `minPrice` - Giá tối thiểu
- `maxPrice` - Giá tối đa
- `isFeatured` - Sản phẩm nổi bật (true/false)
- `isPromotion` - Sản phẩm khuyến mãi (true/false)
- `sortBy` - Sắp xếp (price, rating, name, createdAt)
- `sortOrder` - Thứ tự (asc, desc)
- `page` - Trang (mặc định: 1)
- `limit` - Số lượng mỗi trang (mặc định: 10)

**Example:**
```
GET /api/products?search=iphone&category=xxx&page=1&limit=20
```

**Response (200):**
```json
{
  "products": [
    {
      "_id": "...",
      "name": "iPhone 15 Pro Max",
      "category": { "_id": "...", "name": "Điện thoại" },
      "price": 33990000,
      "salePrice": 32990000,
      "stock": 8,
      "image": "https://...",
      "rating": 4.8,
      "totalReviews": 125,
      "isFeatured": true,
      "isPromotion": true
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

### GET `/api/products/:id` - Lấy chi tiết sản phẩm
**Không cần token**

**Response (200):**
```json
{
  "_id": "...",
  "name": "iPhone 15 Pro Max",
  "category": { "_id": "...", "name": "Điện thoại" },
  "importPrice": 30000000,
  "price": 33990000,
  "salePrice": 32990000,
  "stock": 8,
  "minStock": 5,
  "description": "...",
  "image": "https://...",
  "images": ["https://...", "https://..."],
  "colors": ["Titanium Xanh", "Titanium Trắng"],
  "sizes": ["256GB", "512GB"],
  "rating": 4.8,
  "totalReviews": 125,
  "isFeatured": true,
  "isPromotion": true,
  "status": 1
}
```

---

## 🗂️ 3. CATEGORIES (`/api/categories`)

### GET `/api/categories/all` - Lấy tất cả danh mục
**Không cần token**

**Response (200):**
```json
[
  {
    "_id": "...",
    "name": "Điện thoại",
    "description": "Các dòng smartphone cao cấp và tầm trung",
    "status": 1
  },
  {
    "_id": "...",
    "name": "Laptop",
    "description": "Laptop học tập, văn phòng, gaming",
    "status": 1
  }
]
```

---

### GET `/api/categories/:id` - Lấy chi tiết danh mục
**Không cần token**

**Response (200):**
```json
{
  "_id": "...",
  "name": "Điện thoại",
  "description": "...",
  "status": 1
}
```

---

### GET `/api/categories/:id/products` - Lấy sản phẩm theo danh mục
**Không cần token**

**Response (200):**
```json
[
  {
    "_id": "...",
    "name": "iPhone 15 Pro Max",
    "price": 33990000,
    ...
  }
]
```

---

## 🏠 4. HOME (`/api/home`)

### GET `/api/home` - Trang chủ (danh mục, sản phẩm nổi bật, khuyến mãi)
**Không cần token**

**Response (200):**
```json
{
  "categories": [
    { "_id": "...", "name": "Điện thoại", ... }
  ],
  "featuredProducts": [
    { "_id": "...", "name": "...", "isFeatured": true, ... }
  ],
  "promotionProducts": [
    { "_id": "...", "name": "...", "isPromotion": true, ... }
  ],
  "newProducts": [...],
  "bestSellerProducts": [...]
}
```

---

## 🛒 5. CART (`/api/cart`)

### GET `/api/cart` - Lấy giỏ hàng
**Cần token**

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "cart": {
    "_id": "...",
    "user": "...",
    "items": [
      {
        "_id": "...",
        "product": {
          "_id": "...",
          "name": "iPhone 15 Pro Max",
          "image": "https://...",
          "price": 33990000
        },
        "quantity": 2,
        "price": 32990000,
        "color": "Titanium Xanh",
        "size": "256GB"
      }
    ]
  },
  "total": 65980000
}
```

---

### POST `/api/cart` - Thêm sản phẩm vào giỏ hàng
**Cần token**

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "productId": "...",
  "quantity": 1,
  "color": "Titanium Xanh",
  "size": "256GB"
}
```

**Response (200):**
```json
{
  "message": "Thêm vào giỏ hàng thành công!",
  "cart": { ... }
}
```

---

### PUT `/api/cart/:itemId` - Cập nhật số lượng
**Cần token**

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "quantity": 3
}
```

**Response (200):**
```json
{
  "message": "Cập nhật giỏ hàng thành công!",
  "cart": { ... }
}
```

---

### DELETE `/api/cart/:itemId` - Xóa sản phẩm khỏi giỏ
**Cần token**

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Xóa sản phẩm khỏi giỏ hàng thành công!",
  "cart": { ... }
}
```

---

### DELETE `/api/cart` - Xóa toàn bộ giỏ hàng
**Cần token**

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Đã xóa toàn bộ giỏ hàng!"
}
```

---

## 📋 6. ORDERS (`/api/orders`)

### POST `/api/orders` - Tạo đơn hàng từ giỏ hàng
**Cần token**

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "shippingAddress": {
    "fullName": "Nguyễn Văn A",
    "phone": "0912345678",
    "address": "123 Đường ABC",
    "ward": "Phường XYZ",
    "district": "Quận 1",
    "city": "Hồ Chí Minh"
  },
  "paymentMethod": "COD",
  "notes": "Giao hàng buổi sáng"
}
```

**Response (201):**
```json
{
  "message": "Đặt hàng thành công!",
  "order": {
    "_id": "...",
    "orderNumber": "DH20240101001",
    "customer": "...",
    "items": [
      {
        "product": { "_id": "...", "name": "..." },
        "quantity": 2,
        "price": 32990000,
        "subtotal": 65980000
      }
    ],
    "subtotal": 65980000,
    "shippingFee": 30000,
    "total": 66010000,
    "status": "new",
    "paymentMethod": "COD",
    "createdAt": "2024-01-01T10:00:00.000Z"
  }
}
```

---

### GET `/api/orders` - Lấy danh sách đơn hàng của mình
**Cần token**

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` - Lọc theo trạng thái (new, processing, shipping, completed, cancelled)
- `page` - Trang
- `limit` - Số lượng mỗi trang

**Response (200):**
```json
{
  "orders": [
    {
      "_id": "...",
      "orderNumber": "DH20240101001",
      "total": 66010000,
      "status": "new",
      "createdAt": "2024-01-01T10:00:00.000Z",
      "items": [...]
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

---

### GET `/api/orders/:id` - Lấy chi tiết đơn hàng
**Cần token**

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "_id": "...",
  "orderNumber": "DH20240101001",
  "customer": {
    "_id": "...",
    "fullName": "Nguyễn Văn A",
    "email": "...",
    "phone": "0912345678"
  },
  "shippingAddress": {
    "fullName": "Nguyễn Văn A",
    "phone": "0912345678",
    "address": "123 Đường ABC",
    "city": "Hồ Chí Minh"
  },
  "items": [
    {
      "product": {
        "_id": "...",
        "name": "iPhone 15 Pro Max",
        "image": "https://...",
        "price": 33990000
      },
      "quantity": 2,
      "price": 32990000,
      "subtotal": 65980000
    }
  ],
  "subtotal": 65980000,
  "shippingFee": 30000,
  "total": 66010000,
  "status": "new",
  "paymentMethod": "COD",
  "createdAt": "2024-01-01T10:00:00.000Z"
}
```

---

### PUT `/api/orders/:id/cancel` - Hủy đơn hàng
**Cần token**

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "Không cần nữa"
}
```

**Response (200):**
```json
{
  "message": "Hủy đơn hàng thành công!",
  "order": { ... }
}
```

**Lưu ý:** Chỉ hủy được đơn hàng có status: `new` hoặc `processing`

---

## ⭐ 7. REVIEWS (`/api/reviews`)

### GET `/api/reviews/product/:productId` - Lấy đánh giá của sản phẩm
**Không cần token**

**Query Parameters:**
- `page` - Trang
- `limit` - Số lượng mỗi trang

**Response (200):**
```json
{
  "reviews": [
    {
      "_id": "...",
      "user": {
        "_id": "...",
        "fullName": "Nguyễn Văn A",
        "avatar": "https://..."
      },
      "product": "...",
      "rating": 5,
      "comment": "Sản phẩm rất tốt!",
      "images": ["https://..."],
      "createdAt": "2024-01-01T10:00:00.000Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

---

### GET `/api/reviews/my` - Lấy đánh giá của mình
**Cần token**

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "_id": "...",
    "product": {
      "_id": "...",
      "name": "iPhone 15 Pro Max",
      "image": "https://...",
      "price": 33990000
    },
    "rating": 5,
    "comment": "...",
    "createdAt": "..."
  }
]
```

---

### POST `/api/reviews` - Thêm đánh giá
**Cần token**

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "productId": "...",
  "orderId": "...",
  "rating": 5,
  "comment": "Sản phẩm rất tốt!",
  "images": ["https://..."]
}
```

**Response (201):**
```json
{
  "message": "Đánh giá thành công!",
  "review": { ... }
}
```

**Lưu ý:** Chỉ đánh giá được sản phẩm đã mua (có trong đơn hàng completed)

---

### PUT `/api/reviews/:id` - Cập nhật đánh giá
**Cần token**

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "rating": 4,
  "comment": "Cập nhật đánh giá",
  "images": ["https://..."]
}
```

---

### DELETE `/api/reviews/:id` - Xóa đánh giá
**Cần token**

**Headers:**
```
Authorization: Bearer <token>
```

---

## ❤️ 8. FAVORITES (`/api/favorites`)

### GET `/api/favorites` - Lấy danh sách yêu thích
**Cần token**

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "_id": "...",
    "name": "iPhone 15 Pro Max",
    "price": 33990000,
    "image": "https://...",
    ...
  }
]
```

---

### GET `/api/favorites/check/:productId` - Kiểm tra đã yêu thích chưa
**Cần token**

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "isFavorite": true
}
```

---

### POST `/api/favorites/:productId` - Thêm vào yêu thích
**Cần token**

**Headers:**
```
Authorization: Bearer <token>
```

**Response (201):**
```json
{
  "message": "Đã thêm vào yêu thích!",
  "favorite": { ... }
}
```

---

### DELETE `/api/favorites/:productId` - Xóa khỏi yêu thích
**Cần token**

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Đã xóa khỏi yêu thích!"
}
```

---

## 📍 9. ADDRESSES (`/api/addresses`)

### GET `/api/addresses` - Lấy danh sách địa chỉ
**Cần token**

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "_id": "...",
    "fullName": "Nguyễn Văn A",
    "phone": "0912345678",
    "address": "123 Đường ABC",
    "ward": "Phường XYZ",
    "district": "Quận 1",
    "city": "Hồ Chí Minh",
    "isDefault": true
  }
]
```

---

### GET `/api/addresses/default` - Lấy địa chỉ mặc định
**Cần token**

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "_id": "...",
  "fullName": "Nguyễn Văn A",
  "phone": "0912345678",
  "address": "123 Đường ABC",
  "city": "Hồ Chí Minh",
  "isDefault": true
}
```

---

### POST `/api/addresses` - Thêm địa chỉ mới
**Cần token**

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "fullName": "Nguyễn Văn A",
  "phone": "0912345678",
  "address": "123 Đường ABC",
  "ward": "Phường XYZ",
  "district": "Quận 1",
  "city": "Hồ Chí Minh",
  "isDefault": true
}
```

**Response (201):**
```json
{
  "message": "Thêm địa chỉ thành công!",
  "address": { ... }
}
```

---

### PUT `/api/addresses/:id` - Cập nhật địa chỉ
**Cần token**

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "fullName": "Nguyễn Văn A Updated",
  "phone": "0987654321",
  "address": "456 Đường XYZ",
  "city": "Hà Nội",
  "isDefault": true
}
```

---

### DELETE `/api/addresses/:id` - Xóa địa chỉ
**Cần token**

**Headers:**
```
Authorization: Bearer <token>
```

---

## 🔔 10. NOTIFICATIONS (`/api/notifications`)

### GET `/api/notifications` - Lấy danh sách thông báo
**Cần token**

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `isRead` - Lọc theo đã đọc (true/false)
- `type` - Lọc theo loại (order, product, system)
- `page` - Trang
- `limit` - Số lượng mỗi trang

**Response (200):**
```json
{
  "notifications": [
    {
      "_id": "...",
      "type": "order",
      "title": "Đặt hàng thành công",
      "message": "Đơn hàng DH20240101001 đã được tạo thành công!",
      "link": "/orders/...",
      "isRead": false,
      "createdAt": "2024-01-01T10:00:00.000Z"
    }
  ],
  "total": 10,
  "unreadCount": 5,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

---

### PUT `/api/notifications/:id/read` - Đánh dấu đã đọc
**Cần token**

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Đã đánh dấu đã đọc!",
  "notification": { ... }
}
```

---

### PUT `/api/notifications/read-all` - Đánh dấu tất cả đã đọc
**Cần token**

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Đã đánh dấu tất cả đã đọc!"
}
```

---

### DELETE `/api/notifications/:id` - Xóa thông báo
**Cần token**

**Headers:**
```
Authorization: Bearer <token>
```

---

## 📝 LƯU Ý QUAN TRỌNG

### 1. **Authentication**
- Tất cả API có ghi "Cần token" đều yêu cầu header:
  ```
  Authorization: Bearer <token>
  ```
- Token được lấy từ `/api/auth/login` hoặc `/api/auth/register`
- Token có thời hạn: 1 ngày (hoặc 30 ngày nếu `rememberMe: true`)

### 2. **Error Response**
Tất cả lỗi đều trả về format:
```json
{
  "message": "Thông báo lỗi"
}
```

**Status Codes:**
- `200` - Thành công
- `201` - Tạo thành công
- `400` - Lỗi dữ liệu (thiếu thông tin, dữ liệu không hợp lệ)
- `401` - Chưa đăng nhập / Token không hợp lệ
- `403` - Không có quyền
- `404` - Không tìm thấy
- `500` - Lỗi server

### 3. **Pagination**
Các API có phân trang trả về:
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

### 4. **Date Format**
- Sử dụng ISO 8601: `"2024-01-01T10:00:00.000Z"`
- Hoặc format: `YYYY-MM-DD`

### 5. **Price Format**
- Tất cả giá đều là số (VND)
- Ví dụ: `33990000` = 33,990,000 VND

---

## 🎯 TÓM TẮT API CHO ANDROID

### Không cần token:
- ✅ `POST /api/auth/register` - Đăng ký
- ✅ `POST /api/auth/login` - Đăng nhập
- ✅ `GET /api/products` - Danh sách sản phẩm
- ✅ `GET /api/products/:id` - Chi tiết sản phẩm
- ✅ `GET /api/categories/all` - Tất cả danh mục
- ✅ `GET /api/categories/:id` - Chi tiết danh mục
- ✅ `GET /api/categories/:id/products` - Sản phẩm theo danh mục
- ✅ `GET /api/home` - Trang chủ
- ✅ `GET /api/reviews/product/:productId` - Đánh giá sản phẩm

### Cần token (Customer):
- ✅ `GET /api/auth/me` - Thông tin user
- ✅ `PUT /api/auth/me` - Cập nhật thông tin
- ✅ `PUT /api/auth/change-password` - Đổi mật khẩu
- ✅ `GET /api/cart` - Giỏ hàng
- ✅ `POST /api/cart` - Thêm vào giỏ
- ✅ `PUT /api/cart/:itemId` - Cập nhật giỏ
- ✅ `DELETE /api/cart/:itemId` - Xóa khỏi giỏ
- ✅ `POST /api/orders` - Tạo đơn hàng
- ✅ `GET /api/orders` - Danh sách đơn hàng
- ✅ `GET /api/orders/:id` - Chi tiết đơn hàng
- ✅ `PUT /api/orders/:id/cancel` - Hủy đơn hàng
- ✅ `GET /api/reviews/my` - Đánh giá của mình
- ✅ `POST /api/reviews` - Thêm đánh giá
- ✅ `PUT /api/reviews/:id` - Cập nhật đánh giá
- ✅ `DELETE /api/reviews/:id` - Xóa đánh giá
- ✅ `GET /api/favorites` - Danh sách yêu thích
- ✅ `POST /api/favorites/:productId` - Thêm yêu thích
- ✅ `DELETE /api/favorites/:productId` - Xóa yêu thích
- ✅ `GET /api/addresses` - Danh sách địa chỉ
- ✅ `POST /api/addresses` - Thêm địa chỉ
- ✅ `PUT /api/addresses/:id` - Cập nhật địa chỉ
- ✅ `DELETE /api/addresses/:id` - Xóa địa chỉ
- ✅ `GET /api/notifications` - Thông báo
- ✅ `PUT /api/notifications/:id/read` - Đánh dấu đã đọc

---

## 🚀 CÁCH SỬ DỤNG TRONG ANDROID

### 1. Lưu token sau khi đăng nhập:
```kotlin
// Sau khi login thành công
val token = response.token
SharedPreferences.Editor.putString("token", token).apply()
```

### 2. Thêm token vào header:
```kotlin
val request = Request.Builder()
    .url(url)
    .addHeader("Authorization", "Bearer $token")
    .build()
```

### 3. Xử lý token hết hạn:
```kotlin
if (response.code == 401) {
    // Token hết hạn, yêu cầu đăng nhập lại
    clearToken()
    navigateToLogin()
}
```

---

## ✅ KẾT LUẬN

**Tất cả API cho Android đã sẵn sàng!**
- ✅ Đầy đủ chức năng: Auth, Products, Cart, Orders, Reviews, Favorites, Addresses, Notifications
- ✅ Không cần nhân viên (staff) - chỉ Admin và Customer
- ✅ Web chỉ dùng cho Admin
- ✅ Android dùng cho Customer

**Bạn có thể bắt đầu kết nối Android Studio ngay!**

