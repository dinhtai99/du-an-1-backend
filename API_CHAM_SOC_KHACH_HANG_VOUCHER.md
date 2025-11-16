# 📚 API CHĂM SÓC KHÁCH HÀNG & VOUCHER - Shop THB

## 📋 Mục lục
1. [Chăm sóc khách hàng (Support/Ticket)](#chăm-sóc-khách-hàng)
2. [Voucher (Mã giảm giá)](#voucher)
3. [Theo dõi đơn hàng với Timeline](#theo-dõi-đơn-hàng)

---

## 🎫 CHĂM SÓC KHÁCH HÀNG (Support/Ticket)

### Model: `Support`
- `ticketNumber`: Mã ticket tự động (VD: TK20240101001)
- `customer`: Khách hàng tạo ticket
- `order`: Đơn hàng liên quan (nếu có)
- `subject`: Tiêu đề
- `category`: Loại yêu cầu (order, product, payment, shipping, refund, other)
- `priority`: Mức độ ưu tiên (low, medium, high, urgent)
- `status`: Trạng thái (open, in_progress, resolved, closed)
- `assignedTo`: Admin được gán xử lý
- `messages`: Danh sách tin nhắn
- `resolvedAt`, `closedAt`: Thời gian giải quyết/đóng

---

### 1. Lấy danh sách ticket

**Endpoint:**
```
GET /api/support
```

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` - Lọc theo trạng thái (open, in_progress, resolved, closed)
- `category` - Lọc theo loại (order, product, payment, shipping, refund, other)
- `priority` - Lọc theo mức độ (low, medium, high, urgent)
- `page` - Trang (mặc định: 1)
- `limit` - Số lượng mỗi trang (mặc định: 10)

**Response (200):**
```json
{
  "tickets": [
    {
      "_id": "...",
      "ticketNumber": "TK20240101001",
      "customer": {
        "_id": "...",
        "fullName": "Nguyễn Văn A",
        "email": "customer1@example.com",
        "phone": "0912345678"
      },
      "order": {
        "_id": "...",
        "orderNumber": "DH20240101001"
      },
      "subject": "Hỏi về đơn hàng",
      "category": "order",
      "priority": "medium",
      "status": "open",
      "assignedTo": null,
      "messages": [...],
      "createdAt": "2024-01-01T10:00:00.000Z"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

**Lưu ý:**
- Customer: Chỉ xem ticket của mình
- Admin: Xem tất cả ticket

---

### 2. Lấy chi tiết ticket

**Endpoint:**
```
GET /api/support/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "_id": "...",
  "ticketNumber": "TK20240101001",
  "customer": {
    "_id": "...",
    "fullName": "Nguyễn Văn A",
    "email": "customer1@example.com",
    "phone": "0912345678"
  },
  "order": {
    "_id": "...",
    "orderNumber": "DH20240101001",
    "total": 33990000,
    "status": "processing"
  },
  "subject": "Hỏi về đơn hàng",
  "category": "order",
  "priority": "medium",
  "status": "open",
  "assignedTo": {
    "_id": "...",
    "fullName": "Admin User"
  },
  "messages": [
    {
      "_id": "...",
      "sender": "customer",
      "senderId": {
        "_id": "...",
        "fullName": "Nguyễn Văn A",
        "role": "customer"
      },
      "message": "Khi nào đơn hàng được giao?",
      "attachments": [],
      "createdAt": "2024-01-01T10:00:00.000Z"
    },
    {
      "_id": "...",
      "sender": "admin",
      "senderId": {
        "_id": "...",
        "fullName": "Admin User",
        "role": "admin"
      },
      "message": "Đơn hàng sẽ được giao trong 2-3 ngày",
      "attachments": [],
      "createdAt": "2024-01-01T10:30:00.000Z"
    }
  ],
  "createdAt": "2024-01-01T10:00:00.000Z",
  "updatedAt": "2024-01-01T10:30:00.000Z"
}
```

---

### 3. Tạo ticket mới (Customer)

**Endpoint:**
```
POST /api/support
```

**Headers:**
```
Authorization: Bearer <customer_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "subject": "Hỏi về đơn hàng",
  "category": "order",
  "priority": "medium",
  "order": "order_id_here", // Optional
  "message": "Khi nào đơn hàng được giao?"
}
```

**Response (201):**
```json
{
  "message": "Tạo ticket thành công!",
  "ticket": {
    "_id": "...",
    "ticketNumber": "TK20240101001",
    "customer": {...},
    "subject": "Hỏi về đơn hàng",
    "status": "open",
    "messages": [...]
  }
}
```

---

### 4. Gửi tin nhắn trong ticket

**Endpoint:**
```
POST /api/support/:id/message
```

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "message": "Cảm ơn bạn đã phản hồi!",
  "attachments": ["https://example.com/file.jpg"] // Optional
}
```

**Response (200):**
```json
{
  "message": "Gửi tin nhắn thành công!",
  "ticket": {
    "_id": "...",
    "messages": [...]
  }
}
```

**Lưu ý:**
- Customer: Chỉ gửi trong ticket của mình
- Admin: Gửi trong bất kỳ ticket nào
- Tự động mở lại ticket nếu đã đóng

---

### 5. Cập nhật ticket (Admin)

**Endpoint:**
```
PUT /api/support/:id
```

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "in_progress",
  "priority": "high",
  "assignedTo": "admin_user_id",
  "subject": "Updated subject",
  "category": "payment"
}
```

**Response (200):**
```json
{
  "message": "Cập nhật ticket thành công!",
  "ticket": {...}
}
```

---

### 6. Đóng ticket

**Endpoint:**
```
PUT /api/support/:id/close
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Đóng ticket thành công!",
  "ticket": {...}
}
```

**Lưu ý:**
- Customer: Chỉ đóng ticket của mình
- Admin: Đóng bất kỳ ticket nào

---

## 🎟️ VOUCHER (Mã giảm giá)

### Model: `Voucher`
- `code`: Mã voucher (VD: SALE50) - unique, uppercase
- `name`: Tên voucher
- `description`: Mô tả
- `type`: Loại (percentage, fixed)
- `value`: Giá trị giảm (VD: 50% hoặc 50000 VNĐ)
- `minOrderValue`: Đơn hàng tối thiểu
- `maxDiscount`: Giảm giá tối đa (chỉ cho percentage)
- `quantity`: Số lượng voucher
- `usedCount`: Số lần đã sử dụng
- `startDate`, `endDate`: Thời gian hiệu lực
- `applicableProducts`: Sản phẩm áp dụng (rỗng = tất cả)
- `applicableCategories`: Danh mục áp dụng (rỗng = tất cả)
- `applicableUsers`: User được áp dụng (rỗng = tất cả)
- `status`: 0 = ẩn, 1 = hiển thị

---

### 1. Lấy danh sách voucher

**Endpoint:**
```
GET /api/vouchers
```

**Query Parameters:**
- `code` - Tìm theo mã voucher
- `status` - Lọc theo status (chỉ Admin)
- `page` - Trang
- `limit` - Số lượng mỗi trang

**Response (200):**
```json
{
  "vouchers": [
    {
      "_id": "...",
      "code": "SALE50",
      "name": "Giảm 50%",
      "description": "Giảm 50% cho đơn hàng từ 500k",
      "type": "percentage",
      "value": 50,
      "minOrderValue": 500000,
      "maxDiscount": 200000,
      "quantity": 100,
      "usedCount": 25,
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-12-31T23:59:59.000Z",
      "applicableProducts": [],
      "applicableCategories": [],
      "status": 1
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

**Lưu ý:**
- Customer: Chỉ xem voucher hợp lệ và đang hiển thị
- Admin: Xem tất cả voucher

---

### 2. Lấy chi tiết voucher

**Endpoint:**
```
GET /api/vouchers/:id
```

**Response (200):**
```json
{
  "_id": "...",
  "code": "SALE50",
  "name": "Giảm 50%",
  "type": "percentage",
  "value": 50,
  "minOrderValue": 500000,
  "maxDiscount": 200000,
  "applicableProducts": [
    {
      "_id": "...",
      "name": "iPhone 15 Pro Max",
      "image": "...",
      "price": 33990000
    }
  ],
  "applicableCategories": [...]
}
```

---

### 3. Kiểm tra voucher có hợp lệ không

**Endpoint:**
```
POST /api/vouchers/check
```

**Headers:**
```
Authorization: Bearer <customer_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "code": "SALE50",
  "orderValue": 1000000,
  "productIds": ["product_id_1", "product_id_2"] // Optional
}
```

**Response (200):**
```json
{
  "valid": true,
  "voucher": {
    "id": "...",
    "code": "SALE50",
    "name": "Giảm 50%",
    "type": "percentage",
    "value": 50,
    "discountAmount": 200000,
    "maxDiscount": 200000
  }
}
```

**Response (400) - Voucher không hợp lệ:**
```json
{
  "message": "Mã voucher không tồn tại!"
}
// hoặc
{
  "message": "Voucher đã hết lượt sử dụng!"
}
// hoặc
{
  "message": "Đơn hàng tối thiểu 500000 VNĐ để sử dụng voucher này!"
}
```

---

### 4. Tạo voucher mới (Admin)

**Endpoint:**
```
POST /api/vouchers
```

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "code": "SALE50",
  "name": "Giảm 50%",
  "description": "Giảm 50% cho đơn hàng từ 500k",
  "type": "percentage",
  "value": 50,
  "minOrderValue": 500000,
  "maxDiscount": 200000,
  "quantity": 100,
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-12-31T23:59:59.000Z",
  "applicableProducts": ["product_id_1"], // Optional, rỗng = tất cả
  "applicableCategories": ["category_id_1"], // Optional, rỗng = tất cả
  "applicableUsers": ["user_id_1"], // Optional, rỗng = tất cả
  "status": 1
}
```

**Response (201):**
```json
{
  "message": "Tạo voucher thành công!",
  "voucher": {...}
}
```

---

### 5. Cập nhật voucher (Admin)

**Endpoint:**
```
PUT /api/vouchers/:id
```

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated name",
  "quantity": 200,
  "status": 0
}
```

**Response (200):**
```json
{
  "message": "Cập nhật voucher thành công!",
  "voucher": {...}
}
```

---

### 6. Xóa voucher (Admin)

**Endpoint:**
```
DELETE /api/vouchers/:id
```

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "message": "Xóa voucher thành công!"
}
```

---

## 📦 THEO DÕI ĐƠN HÀNG VỚI TIMELINE

### Cải thiện Order Model
- Thêm `timeline`: Mảng các sự kiện theo dõi đơn hàng
- Thêm `voucher`, `voucherCode`, `voucherDiscount`: Thông tin voucher đã sử dụng

### Timeline Structure
```javascript
{
  status: "new", // Trạng thái tại thời điểm này
  message: "Đơn hàng đã được tạo", // Thông báo
  updatedBy: ObjectId, // Người cập nhật
  createdAt: Date // Thời gian
}
```

---

### 1. Lấy chi tiết đơn hàng (có timeline)

**Endpoint:**
```
GET /api/orders/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "_id": "...",
  "orderNumber": "DH20240101001",
  "customer": {...},
  "items": [...],
  "subtotal": 33990000,
  "shippingFee": 30000,
  "voucher": {
    "_id": "...",
    "code": "SALE50",
    "name": "Giảm 50%",
    "type": "percentage",
    "value": 50
  },
  "voucherCode": "SALE50",
  "voucherDiscount": 1700000,
  "total": 32390000,
  "status": "processing",
  "timeline": [
    {
      "_id": "...",
      "status": "new",
      "message": "Đơn hàng đã được tạo",
      "updatedBy": {
        "_id": "...",
        "fullName": "Nguyễn Văn A",
        "role": "customer"
      },
      "createdAt": "2024-01-01T10:00:00.000Z"
    },
    {
      "_id": "...",
      "status": "processing",
      "message": "Đơn hàng đang được xử lý",
      "updatedBy": {
        "_id": "...",
        "fullName": "Admin User",
        "role": "admin"
      },
      "createdAt": "2024-01-01T11:00:00.000Z"
    }
  ],
  "createdAt": "2024-01-01T10:00:00.000Z"
}
```

---

### 2. Lấy timeline đơn hàng

**Endpoint:**
```
GET /api/orders/:id/timeline
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "orderNumber": "DH20240101001",
  "currentStatus": "processing",
  "timeline": [
    {
      "status": "new",
      "message": "Đơn hàng đã được tạo",
      "updatedBy": {
        "_id": "...",
        "fullName": "Nguyễn Văn A",
        "role": "customer"
      },
      "createdAt": "2024-01-01T10:00:00.000Z"
    },
    {
      "status": "processing",
      "message": "Đơn hàng đang được xử lý",
      "updatedBy": {
        "_id": "...",
        "fullName": "Admin User",
        "role": "admin"
      },
      "createdAt": "2024-01-01T11:00:00.000Z"
    }
  ]
}
```

---

### 3. Tạo đơn hàng với voucher

**Endpoint:**
```
POST /api/orders
```

**Headers:**
```
Authorization: Bearer <customer_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "shippingAddress": {
    "fullName": "Nguyễn Văn A",
    "phone": "0912345678",
    "address": "123 Đường ABC",
    "ward": "Phường 1",
    "district": "Quận 1",
    "city": "Hồ Chí Minh"
  },
  "paymentMethod": "COD",
  "notes": "Giao hàng buổi sáng",
  "voucherCode": "SALE50"
}
```

**Response (201):**
```json
{
  "message": "Đặt hàng thành công!",
  "order": {
    "_id": "...",
    "orderNumber": "DH20240101001",
    "voucherCode": "SALE50",
    "voucherDiscount": 1700000,
    "total": 32390000,
    "timeline": [
      {
        "status": "new",
        "message": "Đơn hàng đã được tạo",
        "updatedBy": {...}
      }
    ]
  }
}
```

**Lưu ý:**
- Voucher được kiểm tra và áp dụng tự động
- Số lần sử dụng voucher (`usedCount`) được tăng lên
- Timeline tự động thêm sự kiện "Đơn hàng đã được tạo"

---

### 4. Cập nhật trạng thái đơn hàng (tự động thêm timeline)

**Endpoint:**
```
PUT /api/orders/:id/status
```

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "status": "shipping",
  "shipper": "shipper_user_id", // Optional
  "note": "Đơn hàng đã được giao cho shipper" // Optional
}
```

**Response (200):**
```json
{
  "message": "Cập nhật trạng thái đơn hàng thành công!",
  "order": {
    "_id": "...",
    "status": "shipping",
    "timeline": [
      {
        "status": "new",
        "message": "Đơn hàng đã được tạo",
        "updatedBy": {...},
        "createdAt": "2024-01-01T10:00:00.000Z"
      },
      {
        "status": "processing",
        "message": "Đơn hàng đang được xử lý",
        "updatedBy": {...},
        "createdAt": "2024-01-01T11:00:00.000Z"
      },
      {
        "status": "shipping",
        "message": "Đơn hàng đã được giao cho shipper",
        "updatedBy": {
          "_id": "...",
          "fullName": "Admin User",
          "role": "admin"
        },
        "createdAt": "2024-01-01T12:00:00.000Z"
      }
    ]
  }
}
```

**Lưu ý:**
- Timeline tự động thêm sự kiện mới khi cập nhật trạng thái
- Có thể thêm `note` tùy chỉnh, nếu không sẽ dùng message mặc định

---

### 5. Hủy đơn hàng (tự động thêm timeline)

**Endpoint:**
```
PUT /api/orders/:id/cancel
```

**Headers:**
```
Authorization: Bearer <customer_token>
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
  "order": {
    "_id": "...",
    "status": "cancelled",
    "cancelledReason": "Không cần nữa",
    "timeline": [
      {
        "status": "new",
        "message": "Đơn hàng đã được tạo",
        "updatedBy": {...}
      },
      {
        "status": "cancelled",
        "message": "Đơn hàng đã bị hủy. Lý do: Không cần nữa",
        "updatedBy": {...}
      }
    ]
  }
}
```

---

## 📱 SỬ DỤNG TRONG ANDROID

### 1. Tạo ticket chăm sóc khách hàng

```kotlin
val requestBody = JSONObject().apply {
    put("subject", "Hỏi về đơn hàng")
    put("category", "order")
    put("priority", "medium")
    put("order", orderId) // Optional
    put("message", "Khi nào đơn hàng được giao?")
}

val request = Request.Builder()
    .url("${API_URL}/support")
    .addHeader("Authorization", "Bearer $token")
    .post(requestBody.toString().toRequestBody("application/json".toMediaType()))
    .build()
```

### 2. Kiểm tra voucher

```kotlin
val requestBody = JSONObject().apply {
    put("code", "SALE50")
    put("orderValue", 1000000)
    put("productIds", JSONArray().apply {
        put(productId1)
        put(productId2)
    })
}

val request = Request.Builder()
    .url("${API_URL}/vouchers/check")
    .addHeader("Authorization", "Bearer $token")
    .post(requestBody.toString().toRequestBody("application/json".toMediaType()))
    .build()
```

### 3. Lấy timeline đơn hàng

```kotlin
val request = Request.Builder()
    .url("${API_URL}/orders/$orderId/timeline")
    .addHeader("Authorization", "Bearer $token")
    .get()
    .build()

val response = client.newCall(request).execute()
val timeline = // Parse timeline từ response
```

---

## ✅ TÓM TẮT

### Chăm sóc khách hàng:
- ✅ Customer tạo ticket, gửi tin nhắn
- ✅ Admin quản lý ticket, gán người xử lý
- ✅ Timeline tin nhắn đầy đủ
- ✅ Thông báo tự động

### Voucher:
- ✅ Tạo voucher (Admin)
- ✅ Kiểm tra voucher hợp lệ
- ✅ Áp dụng voucher vào đơn hàng
- ✅ Giới hạn sản phẩm, danh mục, user
- ✅ Giảm giá theo % hoặc số tiền cố định

### Timeline đơn hàng:
- ✅ Tự động ghi lại mọi thay đổi trạng thái
- ✅ Hiển thị người cập nhật và thời gian
- ✅ API riêng để lấy timeline
- ✅ Tích hợp voucher vào đơn hàng

---

## 🎯 KẾT LUẬN

**Đã hoàn thành:**
1. ✅ API Chăm sóc khách hàng (Support/Ticket)
2. ✅ API Voucher (Mã giảm giá)
3. ✅ Cải thiện API theo dõi đơn hàng với timeline

**Tất cả API đã sẵn sàng để tích hợp vào Android app!**

