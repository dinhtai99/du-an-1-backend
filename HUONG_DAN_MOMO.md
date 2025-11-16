# Hướng dẫn tích hợp MoMo Payment

## 📋 Tổng quan

Hệ thống đã được tích hợp MoMo Payment để khách hàng có thể thanh toán qua ví MoMo.

## 🔧 Cấu hình

### 1. Đăng ký tài khoản MoMo Partner

1. Truy cập: https://developers.momo.vn/
2. Đăng ký tài khoản Merchant
3. Tạo ứng dụng và lấy thông tin:
   - **Partner Code**
   - **Access Key**
   - **Secret Key**

### 2. Cấu hình biến môi trường

Thêm vào file `.env`:

```env
# MoMo Payment Configuration
MOMO_PARTNER_CODE=your_partner_code
MOMO_ACCESS_KEY=your_access_key
MOMO_SECRET_KEY=your_secret_key
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_CALLBACK_URL=http://localhost:3000/api/payment/momo/callback
MOMO_RETURN_URL=http://localhost:3000/api/payment/momo/return
MOMO_ENV=sandbox
```

**Lưu ý:**
- `MOMO_ENV=sandbox` cho môi trường test
- `MOMO_ENV=production` cho môi trường thực tế
- Khi chuyển sang production, đổi endpoint thành: `https://payment.momo.vn/v2/gateway/api/create`

### 3. Cấu hình Callback URL

Trong dashboard MoMo Partner, cấu hình:
- **IPN URL (Callback)**: `https://yourdomain.com/api/payment/momo/callback`
- **Return URL**: `https://yourdomain.com/api/payment/momo/return`

## 📡 API Endpoints

### 1. Tạo đơn thanh toán MoMo

**POST** `/api/payment/momo/create`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "shippingAddress": {
    "fullName": "Nguyễn Văn A",
    "phone": "0912345678",
    "address": "123 Đường ABC",
    "city": "Hà Nội",
    "ward": "Phường XYZ",
    "district": "Quận 1"
  },
  "notes": "Giao hàng buổi sáng",
  "voucherCode": "VOUCHER123"
}
```

**Response (Thành công):**
```json
{
  "success": true,
  "message": "Tạo đơn hàng thanh toán MoMo thành công!",
  "payUrl": "https://test-payment.momo.vn/...",
  "deeplink": "momo://...",
  "qrCodeUrl": "https://...",
  "orderId": "...",
  "orderNumber": "DH20241201001",
  "momoOrderId": "MOMO_..."
}
```

### 2. Callback từ MoMo (Webhook)

**POST** `/api/payment/momo/callback`

Endpoint này được MoMo gọi tự động khi thanh toán hoàn tất. Không cần gọi thủ công.

### 3. Return URL (Redirect sau thanh toán)

**GET** `/api/payment/momo/return?orderId=...&resultCode=0&message=...`

URL này được MoMo redirect về sau khi user thanh toán xong.

### 4. Kiểm tra trạng thái thanh toán

**GET** `/api/payment/momo/status/:orderId`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "orderId": "...",
  "orderNumber": "DH20241201001",
  "paymentMethod": "momo",
  "paymentStatus": "success",
  "status": "new",
  "total": 500000,
  "momoOrderId": "MOMO_...",
  "momoTransId": "..."
}
```

## 🔄 Flow thanh toán

1. **Client** gọi `/api/payment/momo/create` → Nhận `payUrl`
2. **Client** redirect user đến `payUrl` hoặc mở `deeplink` trong app MoMo
3. **User** thanh toán trên MoMo
4. **MoMo** gọi callback `/api/payment/momo/callback` (webhook)
5. **MoMo** redirect user về `/api/payment/momo/return`
6. **Client** có thể query status bằng `/api/payment/momo/status/:orderId`

## 🔐 Bảo mật

- Tất cả requests đều được xác thực bằng **signature** (HMAC SHA256)
- Callback từ MoMo được verify signature trước khi xử lý
- Chỉ customer mới có thể tạo đơn thanh toán (requireCustomer middleware)

## 📝 Lưu ý

1. **Sandbox vs Production:**
   - Sandbox: Dùng để test, không tính phí
   - Production: Cần đăng ký và xác thực tài khoản

2. **Callback URL:**
   - Phải là HTTPS trong production
   - Phải accessible từ internet (không thể dùng localhost)

3. **Order ID:**
   - Format: `MOMO_<orderId>` (tối đa 50 ký tự)
   - Phải unique

4. **Amount:**
   - Đơn vị: VNĐ
   - Tối thiểu: 1,000 VNĐ
   - Tối đa: 20,000,000 VNĐ

## 🐛 Troubleshooting

### Lỗi "Signature không hợp lệ"
- Kiểm tra `MOMO_SECRET_KEY` đúng chưa
- Kiểm tra thứ tự các field trong signature string

### Lỗi "Không thể tạo đơn hàng"
- Kiểm tra `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`
- Kiểm tra endpoint URL đúng chưa
- Kiểm tra network connection

### Callback không nhận được
- Kiểm tra callback URL có accessible từ internet không
- Kiểm tra firewall/security group
- Kiểm tra logs server

## 📚 Tài liệu tham khảo

- MoMo Developer Portal: https://developers.momo.vn/
- MoMo API Documentation: https://developers.momo.vn/docs/

