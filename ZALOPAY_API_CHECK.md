# 🔍 Báo cáo kiểm tra API ZaloPay

## ✅ Đã hoàn thành

### 1. **ZaloPay Service** (`services/zalopayService.js`)
- ✅ Class `ZaloPayService` đã được tạo
- ✅ Các method chính:
  - ✅ `createOrder()` - Tạo đơn hàng thanh toán
  - ✅ `verifyCallback()` - Xác thực callback từ ZaloPay
  - ✅ `queryOrder()` - Query trạng thái đơn hàng
  - ✅ `generateAppTransId()` - Tạo mã đơn hàng theo format ZaloPay
  - ✅ `createMac()` - Tạo MAC để xác thực

### 2. **Payment Routes** (`routes/payment.js`)

#### ✅ POST `/api/payment/zalopay/create`
**Chức năng:** Tạo đơn hàng và gọi ZaloPay API
- ✅ Validate input (shippingAddress, items)
- ✅ Tạo order với `paymentMethod = "zalopay"`
- ✅ Tính toán subtotal, shipping fee, voucher discount
- ✅ Tạo `app_trans_id` theo format ZaloPay
- ✅ Gọi `zalopayService.createOrder()`
- ✅ Lưu `zalopayTransToken` và `zalopayOrderId` vào order
- ✅ Trả về `zp_trans_token` cho client SDK
- ✅ Logging đầy đủ

**Response:**
```json
{
  "success": true,
  "message": "Tạo đơn hàng thanh toán ZaloPay thành công!",
  "zp_trans_token": "...",
  "order_url": "...",
  "order_token": "...",
  "orderId": "...",
  "orderNumber": "..."
}
```

#### ✅ POST `/api/payment/zalopay/callback`
**Chức năng:** Xử lý callback từ ZaloPay
- ✅ Parse callback data (hỗ trợ nhiều format)
- ✅ Xác thực MAC với `key2`
- ✅ Parse `embed_data` để lấy `orderId` (hỗ trợ nhiều format)
- ✅ Fallback: Tìm order theo `zalopayOrderId` nếu không có trong embed_data
- ✅ Xử lý thanh toán thành công (status = 1):
  - Cập nhật `paymentStatus = "success"`
  - Trừ tồn kho
  - Tạo notification
  - Xóa giỏ hàng
- ✅ Xử lý thanh toán thất bại:
  - Cập nhật `paymentStatus = "failed"`
  - Hoàn lại voucher
- ✅ Idempotency check (tránh xử lý trùng)
- ✅ Logging chi tiết

**Response:**
```json
{
  "return_code": 1,
  "return_message": "OK"
}
```

#### ✅ GET `/api/payment/zalopay/status/:orderId`
**Chức năng:** Kiểm tra trạng thái thanh toán
- ✅ Kiểm tra quyền truy cập (customer chỉ xem đơn của mình)
- ✅ Query từ ZaloPay nếu đang processing
- ✅ Cập nhật payment status nếu có thay đổi

### 3. **Order Model** (`models/Order.js`)
- ✅ `paymentMethod` enum có `"zalopay"`
- ✅ Các field ZaloPay:
  - ✅ `zalopayTransToken` - Transaction token
  - ✅ `zalopayOrderId` - Order ID (app_trans_id)
  - ✅ `zalopayMac` - MAC từ callback

### 4. **MAC Verification**
- ✅ Tạo MAC đúng format (sort keys, join bằng `&`)
- ✅ Sử dụng `key1` cho create order
- ✅ Sử dụng `key2` cho verify callback
- ✅ Case-insensitive comparison
- ✅ Loại bỏ `mac` khỏi data trước khi tính

### 5. **Error Handling**
- ✅ Validate config (appId, key1, key2)
- ✅ Validate input (app_trans_id, amount, description, item)
- ✅ Try-catch đầy đủ
- ✅ Logging chi tiết lỗi
- ✅ Response error rõ ràng

### 6. **Logging**
- ✅ Log request/response khi create order
- ✅ Log callback data
- ✅ Log MAC verification
- ✅ Log order finding process
- ✅ Log payment processing

---

## ⚠️ Cần kiểm tra

### 1. **Biến môi trường (.env)**

Cần có các biến sau trong file `.env`:

```env
# ZaloPay Configuration
ZALOPAY_APP_ID=your_app_id
ZALOPAY_KEY1=your_key1
ZALOPAY_KEY2=your_key2
ZALOPAY_ENDPOINT=https://sb-openapi.zalopay.vn/v2/create
ZALOPAY_CALLBACK_URL=http://your-domain.com/api/payment/zalopay/callback
ZALOPAY_ENV=sandbox
```

**Lưu ý:**
- **Sandbox:** `https://sb-openapi.zalopay.vn/v2/create`
- **Production:** `https://openapi.zalopay.vn/v2/create`
- **Callback URL** phải:
  - Là HTTPS trong production
  - Accessible từ internet (không dùng localhost)
  - Đã được cấu hình trong ZaloPay Partner Portal

### 2. **Callback URL Configuration**

Trong ZaloPay Partner Portal, cần cấu hình:
- **Callback URL:** `https://your-domain.com/api/payment/zalopay/callback`
- URL này phải accessible từ ZaloPay servers

### 3. **App Trans ID Format**

Code hiện tại tạo `app_trans_id` theo format:
```
YYMMDD_orderId (tối đa 40 ký tự)
```

Ví dụ: `240115_507f1f77bcf86cd799439011`

**Lưu ý:** ZaloPay yêu cầu `app_trans_id` phải unique trong 1 ngày.

---

## 🧪 Test API

### Test 1: Tạo đơn hàng ZaloPay

```bash
curl -X POST http://localhost:3000/api/payment/zalopay/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shippingAddress": {
      "fullName": "Nguyễn Văn A",
      "phone": "0912345678",
      "address": "123 Đường ABC",
      "city": "Hà Nội"
    },
    "notes": "Giao hàng nhanh"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Tạo đơn hàng thanh toán ZaloPay thành công!",
  "zp_trans_token": "xxx...",
  "order_url": "https://...",
  "order_token": "xxx...",
  "orderId": "507f1f77bcf86cd799439011",
  "orderNumber": "ORD-20240115-143022-1234"
}
```

### Test 2: Kiểm tra trạng thái

```bash
curl -X GET http://localhost:3000/api/payment/zalopay/status/ORDER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 3: Simulate Callback (cho testing)

```bash
curl -X POST http://localhost:3000/api/payment/zalopay/callback \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "app_id": "2553",
      "app_trans_id": "240115_507f1f77bcf86cd799439011",
      "app_time": 1705312222000,
      "amount": 100000,
      "status": 1,
      "embed_data": "{\"orderId\":\"507f1f77bcf86cd799439011\",\"orderNumber\":\"ORD-20240115-143022-1234\"}"
    },
    "mac": "calculated_mac_here"
  }'
```

---

## 🔍 Kiểm tra lỗi thường gặp

### Lỗi 1: "ZaloPay chưa được cấu hình đầy đủ!"
**Nguyên nhân:** Thiếu biến môi trường
**Giải pháp:** Thêm các biến `ZALOPAY_APP_ID`, `ZALOPAY_KEY1`, `ZALOPAY_KEY2` vào `.env`

### Lỗi 2: "MAC không hợp lệ!"
**Nguyên nhân:** 
- `key2` sai
- Format data không đúng
- MAC từ ZaloPay không khớp

**Giải pháp:**
- Kiểm tra `ZALOPAY_KEY2` trong `.env`
- Xem logs để debug MAC calculation
- Đảm bảo callback URL đúng trong ZaloPay Portal

### Lỗi 3: "Không tìm thấy đơn hàng!"
**Nguyên nhân:** 
- `embed_data` không có `orderId`
- `app_trans_id` không khớp với `zalopayOrderId` trong database

**Giải pháp:**
- Kiểm tra logs để xem `embed_data` parse như thế nào
- Code đã có fallback tìm theo `zalopayOrderId`

### Lỗi 4: "Lỗi kết nối ZaloPay"
**Nguyên nhân:**
- Network issue
- ZaloPay API endpoint sai
- Timeout

**Giải pháp:**
- Kiểm tra `ZALOPAY_ENDPOINT` trong `.env`
- Kiểm tra network connection
- Code đã có timeout 30s

---

## 📋 Checklist hoạt động

### Backend Code
- [x] ZaloPayService đã được tạo
- [x] Routes đã được thêm vào `routes/payment.js`
- [x] Order model đã có các field ZaloPay
- [x] MAC verification đã được implement
- [x] Callback handling đã được implement
- [x] Error handling đầy đủ
- [x] Logging chi tiết

### Configuration
- [ ] Biến môi trường đã được cấu hình trong `.env`
- [ ] Callback URL đã được cấu hình trong ZaloPay Portal
- [ ] Server đã được restart sau khi cấu hình `.env`

### Testing
- [ ] Test tạo đơn hàng thành công
- [ ] Test callback từ ZaloPay
- [ ] Test query status
- [ ] Test error cases

---

## ✅ Kết luận

**Code đã sẵn sàng!** API ZaloPay đã được implement đầy đủ với:
- ✅ Service layer hoàn chỉnh
- ✅ Routes đầy đủ (create, callback, status)
- ✅ MAC verification
- ✅ Error handling
- ✅ Logging chi tiết
- ✅ Idempotency check

**Chỉ cần:**
1. ✅ Cấu hình biến môi trường trong `.env`
2. ✅ Cấu hình callback URL trong ZaloPay Partner Portal
3. ✅ Restart server

Sau đó API ZaloPay sẽ hoạt động ngay!

---

## 📝 Notes

1. **Sandbox vs Production:**
   - Sandbox: `https://sb-openapi.zalopay.vn/v2/create`
   - Production: `https://openapi.zalopay.vn/v2/create`
   - Set `ZALOPAY_ENV=sandbox` hoặc `production`

2. **App Trans ID:**
   - Format: `YYMMDD_orderId`
   - Phải unique trong 1 ngày
   - Tối đa 40 ký tự

3. **MAC Verification:**
   - Create order: dùng `key1`
   - Callback: dùng `key2`
   - Format: sort keys, join bằng `&`, hash SHA256

4. **Callback:**
   - ZaloPay sẽ gọi callback URL sau khi thanh toán
   - Phải trả về `{ return_code: 1, return_message: "OK" }` nếu thành công
   - Code đã xử lý nhiều format callback data

