# ✅ Checklist tích hợp MoMo Payment

## Đã hoàn thành ✅

### 1. ✅ MoMoService đã được tạo
- **File:** `services/momoService.js`
- **Vị trí:** `/Users/trantai/Desktop/Shop_THB/services/momoService.js`
- **Chức năng:**
  - `createOrder()` - Tạo đơn thanh toán
  - `verifyCallback()` - Xác thực callback
  - `queryOrder()` - Query trạng thái
  - `generateOrderId()` - Tạo mã đơn hàng

### 2. ✅ Routes đã được thêm vào `routes/payment.js`
- ✅ `POST /api/payment/momo/create` - Tạo đơn hàng MoMo
- ✅ `POST /api/payment/momo/callback` - Xử lý callback từ MoMo
- ✅ `GET /api/payment/momo/return` - Xử lý redirect từ MoMo
- ✅ `GET /api/payment/momo/status/:orderId` - Kiểm tra trạng thái (bonus)

### 3. ✅ Order Model đã được cập nhật
- ✅ Thêm `"momo"` vào `paymentMethod` enum
- ✅ Thêm các field:
  - `momoOrderId`
  - `momoRequestId`
  - `momoTransId`
  - `momoSignature`

### 4. ✅ Orders Route đã được cập nhật
- ✅ Redirect khi chọn MoMo payment method

### 5. ✅ Hướng dẫn đã được tạo
- ✅ File: `HUONG_DAN_MOMO.md`

---

## ⚠️ Cần làm thêm

### 1. Cấu hình .env

Thêm vào file `.env` (tạo file nếu chưa có):

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
- Thay `your_partner_code`, `your_access_key`, `your_secret_key` bằng thông tin thực từ MoMo Partner Portal
- Đối với production, đổi:
  - `MOMO_ENDPOINT=https://payment.momo.vn/v2/gateway/api/create`
  - `MOMO_ENV=production`
  - `MOMO_CALLBACK_URL` và `MOMO_RETURN_URL` phải là HTTPS

### 2. Restart Server

Sau khi cấu hình `.env`, restart server:

```bash
# Dừng server (Ctrl + C)
# Sau đó chạy lại:
npm start
# hoặc
npm run dev
```

---

## 🧪 Test tích hợp

### Test tạo đơn thanh toán:

```bash
curl -X POST http://localhost:3000/api/payment/momo/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shippingAddress": {
      "fullName": "Nguyễn Văn A",
      "phone": "0912345678",
      "address": "123 Đường ABC",
      "city": "Hà Nội"
    }
  }'
```

### Kiểm tra callback URL:

MoMo sẽ gọi callback tại: `http://your-domain.com/api/payment/momo/callback`

**Lưu ý:** Trong môi trường production, callback URL phải:
- Là HTTPS
- Accessible từ internet (không dùng localhost)
- Đã được cấu hình trong MoMo Partner Portal

---

## 📋 Tóm tắt

| Bước | Trạng thái | Ghi chú |
|------|-----------|---------|
| 1. Tạo MoMoService | ✅ Hoàn thành | `services/momoService.js` |
| 2. Thêm routes | ✅ Hoàn thành | 4 routes trong `routes/payment.js` |
| 3. Cập nhật Order model | ✅ Hoàn thành | Thêm "momo" và các field |
| 4. Cấu hình .env | ⚠️ Cần làm | Thêm biến môi trường MoMo |
| 5. Restart server | ⚠️ Cần làm | Sau khi cấu hình .env |

---

## ✅ Kết luận

**Đã đủ code!** Chỉ cần:
1. Cấu hình `.env` với thông tin MoMo
2. Restart server

Sau đó có thể sử dụng MoMo payment ngay!

