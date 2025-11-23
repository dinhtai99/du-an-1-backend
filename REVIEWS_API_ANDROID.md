# 📱 API Đánh giá Sản phẩm cho Android App

## 🔗 Base URL
```
http://your-server:3000/api/reviews
```

---

## 1️⃣ Lấy đánh giá của sản phẩm (Không cần đăng nhập)

**Endpoint:** `GET /api/reviews/product/:productId`

**Mô tả:** Lấy danh sách đánh giá của một sản phẩm (chỉ hiển thị những đánh giá `isVisible: true`)

**Request:**
```http
GET /api/reviews/product/507f1f77bcf86cd799439011?page=1&limit=10
```

**Query Parameters:**
- `page` (optional): Số trang (mặc định: 1)
- `limit` (optional): Số đánh giá mỗi trang (mặc định: 10)

**Response (200 OK):**
```json
{
  "reviews": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "user": {
        "_id": "507f1f77bcf86cd799439013",
        "fullName": "Nguyễn Văn A",
        "avatar": "https://example.com/avatar.jpg"
      },
      "product": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "iPhone 15 Pro",
        "image": "https://example.com/product.jpg"
      },
      "rating": 5,
      "comment": "Sản phẩm rất tốt, giao hàng nhanh!",
      "images": [
        "https://example.com/review1.jpg",
        "https://example.com/review2.jpg"
      ],
      "isVisible": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

**Lưu ý:** API này chỉ trả về những đánh giá có `isVisible: true` (admin có thể ẩn đánh giá xấu).

---

## 2️⃣ Lấy đánh giá của user hiện tại (Cần đăng nhập)

**Endpoint:** `GET /api/reviews/my`

**Mô tả:** Lấy tất cả đánh giá mà user hiện tại đã viết

**Headers:**
```http
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "user": "507f1f77bcf86cd799439013",
    "product": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "iPhone 15 Pro",
      "image": "https://example.com/product.jpg",
      "price": 25000000
    },
    "rating": 5,
    "comment": "Sản phẩm rất tốt!",
    "images": [],
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
]
```

---

## 3️⃣ Thêm đánh giá mới (Cần đăng nhập + đã mua sản phẩm)

**Endpoint:** `POST /api/reviews`

**Mô tả:** Thêm đánh giá cho sản phẩm (chỉ user đã mua sản phẩm mới được đánh giá)

**Headers:**
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "productId": "507f1f77bcf86cd799439011",
  "orderId": "507f1f77bcf86cd799439014",  // Optional: ID đơn hàng đã mua
  "rating": 5,                            // Bắt buộc: 1-5
  "comment": "Sản phẩm rất tốt!",         // Optional
  "images": [                             // Optional: Array URL hình ảnh
    "https://example.com/review1.jpg"
  ]
}
```

**Response (201 Created):**
```json
{
  "message": "Đánh giá thành công!",
  "review": {
    "_id": "507f1f77bcf86cd799439012",
    "user": {
      "_id": "507f1f77bcf86cd799439013",
      "fullName": "Nguyễn Văn A",
      "avatar": "https://example.com/avatar.jpg"
    },
    "product": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "iPhone 15 Pro",
      "image": "https://example.com/product.jpg"
    },
    "rating": 5,
    "comment": "Sản phẩm rất tốt!",
    "images": [],
    "isVisible": true,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**
- `400`: "Bạn đã đánh giá sản phẩm này rồi!" (đã đánh giá trước đó)
- `400`: "Bạn chưa mua sản phẩm này!" (chưa mua sản phẩm)
- `400`: "Đánh giá phải từ 1 đến 5 sao!"

---

## 4️⃣ Cập nhật đánh giá (Cần đăng nhập)

**Endpoint:** `PUT /api/reviews/:id`

**Mô tả:** Cập nhật đánh giá của user hiện tại

**Headers:**
```http
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "rating": 4,
  "comment": "Cập nhật: Sản phẩm tốt nhưng giá hơi cao",
  "images": ["https://example.com/new-image.jpg"]
}
```

**Response (200 OK):**
```json
{
  "message": "Cập nhật đánh giá thành công!",
  "review": { ... }
}
```

---

## 5️⃣ Xóa đánh giá (Cần đăng nhập)

**Endpoint:** `DELETE /api/reviews/:id`

**Mô tả:** Xóa đánh giá của user hiện tại

**Headers:**
```http
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Xóa đánh giá thành công!"
}
```

---

## 📝 Lưu ý quan trọng cho Android App

### 1. Hiển thị đánh giá trong Product Detail:
```kotlin
// Khi user xem chi tiết sản phẩm, gọi API:
GET /api/reviews/product/{productId}?page=1&limit=10

// Hiển thị:
// - Rating trung bình (từ product.rating)
// - Số lượng đánh giá (từ product.totalReviews)
// - Danh sách đánh giá (từ reviews array)
```

### 2. Chỉ hiển thị đánh giá visible:
- Backend tự động filter `isVisible: true`
- Admin có thể ẩn đánh giá xấu, app không cần xử lý

### 3. Thêm đánh giá sau khi mua hàng:
- Chỉ cho phép đánh giá khi:
  - User đã đăng nhập
  - Đơn hàng có status = "completed"
  - Sản phẩm có trong đơn hàng
  - Chưa đánh giá sản phẩm này trước đó

### 4. Upload hình ảnh đánh giá:
- App cần upload hình lên server trước (có thể dùng API upload riêng)
- Sau đó gửi array URL trong field `images`

---

## 🔄 Flow tích hợp vào Android App

### Screen 1: Product Detail
```
1. Hiển thị rating: ⭐ 4.5 (25 đánh giá)
2. Button "Xem tất cả đánh giá" → Mở Review List Screen
3. Hiển thị 3-5 đánh giá mới nhất ở dưới
```

### Screen 2: Review List
```
1. Gọi API: GET /api/reviews/product/{productId}?page=1&limit=20
2. Hiển thị danh sách đánh giá với:
   - Avatar + tên user
   - Rating (sao)
   - Comment
   - Hình ảnh (nếu có)
   - Ngày đánh giá
3. Pagination nếu có nhiều đánh giá
```

### Screen 3: Write Review (sau khi mua hàng)
```
1. Chỉ hiển thị khi:
   - Order status = "completed"
   - User chưa đánh giá sản phẩm này
2. Form:
   - Rating (1-5 sao)
   - Comment (text area)
   - Upload images (optional)
3. Gọi API: POST /api/reviews
```

---

## ✅ Test API

**Test lấy đánh giá:**
```bash
curl http://localhost:3000/api/reviews/product/507f1f77bcf86cd799439011
```

**Test thêm đánh giá (cần token):**
```bash
curl -X POST http://localhost:3000/api/reviews \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "507f1f77bcf86cd799439011",
    "rating": 5,
    "comment": "Sản phẩm tốt!"
  }'
```


