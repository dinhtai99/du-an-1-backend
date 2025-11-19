# 📱 Chat API Documentation cho Android

## 🔗 Base URL
```
http://YOUR_SERVER_IP:3000/api/chat
```

## 🔐 Authentication
Tất cả endpoints yêu cầu JWT token trong header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 📤 1. Gửi tin nhắn (Customer → Admin)

### Endpoint
```
POST /api/chat/messages
```

### Request Headers
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

### Request Body
```json
{
  "message": "Nội dung tin nhắn"
}
```

### Response Success (200)
```json
{
  "success": true,
  "message": "Gửi tin nhắn thành công!",
  "data": {
    "messageId": "507f1f77bcf86cd799439011",
    "chatId": "507f1f77bcf86cd799439012",
    "senderId": "507f1f77bcf86cd799439013",
    "senderRole": "customer",
    "message": "Nội dung tin nhắn",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "isRead": false
  },
  "chat": { ... }
}
```

### Response Error (400)
```json
{
  "success": false,
  "message": "Vui lòng nhập nội dung tin nhắn!",
  "error": "MESSAGE_REQUIRED"
}
```

### Response Error (401)
```json
{
  "message": "Chưa đăng nhập!"
}
```

### Response Error (500)
```json
{
  "success": false,
  "message": "Lỗi server!",
  "error": "Error message"
}
```

---

## 📥 2. Lấy danh sách tin nhắn (Customer)

### Endpoint
```
GET /api/chat/messages
```

### Request Headers
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Query Parameters (Optional)
- `limit`: Số lượng tin nhắn (default: 50)
- `page`: Trang (default: 1)

### Response Success (200)
```json
{
  "success": true,
  "messages": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "senderId": "507f1f77bcf86cd799439013",
      "senderRole": "customer",
      "senderName": "Tên khách hàng",
      "message": "Nội dung tin nhắn",
      "isRead": true,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "senderId": "507f1f77bcf86cd799439014",
      "senderRole": "admin",
      "senderName": "Admin",
      "message": "Phản hồi từ admin",
      "isRead": true,
      "createdAt": "2024-01-15T10:35:00.000Z"
    }
  ],
  "unreadCount": 0,
  "chatId": "507f1f77bcf86cd799439012"
}
```

### Response khi chưa có chat
```json
{
  "success": true,
  "messages": [],
  "unreadCount": 0
}
```

---

## 📊 3. Lấy số tin nhắn chưa đọc

### Endpoint
```
GET /api/chat/unread-count
```

### Request Headers
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Response Success (200)
```json
{
  "success": true,
  "unreadCount": 3
}
```

---

## ℹ️ 4. Lấy thông tin chat

### Endpoint
```
GET /api/chat/info
```

### Request Headers
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Response Success (200) - Có chat
```json
{
  "success": true,
  "hasChat": true,
  "chatId": "507f1f77bcf86cd799439012",
  "unreadCount": 2,
  "lastMessage": "Tin nhắn cuối cùng...",
  "lastMessageAt": "2024-01-15T10:35:00.000Z",
  "messageCount": 15
}
```

### Response Success (200) - Chưa có chat
```json
{
  "success": true,
  "hasChat": false,
  "unreadCount": 0,
  "lastMessageAt": null
}
```

---

## 🔄 Flow hoạt động trong Android App

### 1. Gửi tin nhắn
```kotlin
// 1. Kiểm tra đăng nhập
if (token == null) {
    // Chuyển đến màn hình đăng nhập
    return
}

// 2. Gửi request
val requestBody = JSONObject().apply {
    put("message", messageText)
}

val request = Request.Builder()
    .url("$BASE_URL/api/chat/messages")
    .post(requestBody.toRequestBody(JSON))
    .addHeader("Authorization", "Bearer $token")
    .addHeader("Content-Type", "application/json")
    .build()

// 3. Xử lý response
val response = client.newCall(request).execute()
if (response.isSuccessful) {
    val json = JSONObject(response.body?.string() ?: "")
    if (json.getBoolean("success")) {
        // Hiển thị tin nhắn ngay (optimistic update)
        val messageData = json.getJSONObject("data")
        // Thêm vào UI
    } else {
        // Xóa tin nhắn khỏi UI (nếu đã thêm)
        // Hiển thị lỗi
    }
}
```

### 2. Auto-refresh tin nhắn
```kotlin
// Sử dụng Handler hoặc Coroutine để refresh mỗi 5 giây
handler.postDelayed({
    loadMessages()
}, 5000)
```

### 3. Load tin nhắn khi mở màn hình
```kotlin
override fun onResume() {
    super.onResume()
    loadMessages()
    startAutoRefresh()
}

override fun onPause() {
    super.onPause()
    stopAutoRefresh()
}
```

---

## ⚠️ Error Codes

| Code | Mô tả |
|------|-------|
| `MESSAGE_REQUIRED` | Tin nhắn không được để trống |
| `MESSAGE_TOO_LONG` | Tin nhắn vượt quá 5000 ký tự |
| `CUSTOMER_ID_REQUIRED` | Admin phải chọn khách hàng |
| `CUSTOMER_NOT_FOUND` | Không tìm thấy khách hàng |

---

## 📝 Notes

1. **Message Length**: Tối đa 5000 ký tự
2. **Auto-refresh**: Nên refresh mỗi 5 giây khi đang ở màn hình chat
3. **Optimistic Update**: Hiển thị tin nhắn ngay khi gửi, xóa nếu gửi thất bại
4. **Error Handling**: Luôn kiểm tra `success` field trong response
5. **Token Expiry**: Xử lý 401 để chuyển đến màn hình đăng nhập

---

## 🧪 Test với Postman

### 1. Đăng nhập để lấy token
```
POST http://localhost:3000/api/auth/login
Body: {
  "email": "customer@example.com",
  "password": "password123"
}
```

### 2. Gửi tin nhắn
```
POST http://localhost:3000/api/chat/messages
Headers:
  Authorization: Bearer YOUR_TOKEN
  Content-Type: application/json
Body: {
  "message": "Xin chào admin!"
}
```

### 3. Lấy tin nhắn
```
GET http://localhost:3000/api/chat/messages
Headers:
  Authorization: Bearer YOUR_TOKEN
```

---

## ✅ Checklist cho Android Developer

- [ ] Đã thêm JWT token vào header `Authorization`
- [ ] Đã xử lý error 401 (unauthorized) → chuyển đến login
- [ ] Đã implement optimistic update
- [ ] Đã implement auto-refresh (5 giây)
- [ ] Đã xử lý error khi gửi thất bại
- [ ] Đã validate message không rỗng
- [ ] Đã validate message length (max 5000)
- [ ] Đã format datetime để hiển thị
- [ ] Đã hiển thị unread count badge
- [ ] Đã test với server thật

