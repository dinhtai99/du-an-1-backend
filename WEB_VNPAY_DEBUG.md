# 🔍 Debug VNPay Error "Sai chữ ký" từ Web

## ❌ Vấn đề

Khi test thanh toán VNPay từ web, gặp lỗi **"Sai chữ ký"** từ VNPay.

## 🔍 Nguyên nhân có thể

### 1. **Return URL không đúng**

**Vấn đề:**
- Web gọi từ `http://localhost:3000`
- VNPay Return URL có thể là `http://localhost:3000/api/payment/vnpay/return`
- VNPay sandbox không thể truy cập localhost

**Giải pháp:**
- Dùng ngrok cho Return URL
- Hoặc test trên production với domain thật

### 2. **IP Address không đúng**

**Vấn đề:**
- IP address từ web có thể là `127.0.0.1` hoặc `::1`
- VNPay có thể không chấp nhận localhost IP

**Kiểm tra:**
- Xem logs backend để xem IP address được gửi
- Đảm bảo IP address là IPv4 thật (không phải localhost)

### 3. **Signature generation**

**Vấn đề:**
- Signature generation đã được test và đúng
- Nhưng có thể có vấn đề khi gọi từ web

**Kiểm tra:**
- Xem logs backend khi gọi từ web
- So sánh với logs khi gọi từ mobile

---

## 🔧 Cách debug

### 1. Kiểm tra logs backend

Khi test thanh toán từ web, xem logs backend:

```
📤 VNPay create payment params: { ... }
🔐 VNPay querystring for signature (raw, no encode): ...
🔐 VNPay SecureHash (full): ...
🔗 VNPay payment URL (FULL): ...
```

**Kiểm tra:**
- ✅ Querystring có đúng format không?
- ✅ Signature có được tạo đúng không?
- ✅ Return URL có đúng không?
- ✅ IP address có đúng không?

### 2. So sánh với mobile

So sánh logs khi gọi từ web vs mobile:
- Querystring có giống nhau không?
- Signature có giống nhau không?
- Return URL có khác nhau không?

### 3. Kiểm tra Return URL

```bash
# Kiểm tra .env
cat .env | grep VNPAY_RETURN_URL

# Phải là ngrok URL hoặc public URL
VNPAY_RETURN_URL=https://your-ngrok-url.ngrok.io/api/payment/vnpay/return
```

---

## 💡 Giải pháp

### Option 1: Dùng ngrok cho Return URL

1. Chạy ngrok:
   ```bash
   ngrok http 3000
   ```

2. Copy URL ngrok (ví dụ: `https://abc123.ngrok.io`)

3. Cập nhật `.env`:
   ```env
   VNPAY_RETURN_URL=https://abc123.ngrok.io/api/payment/vnpay/return
   VNPAY_IPN_URL=https://abc123.ngrok.io/api/payment/vnpay/callback
   ```

4. Restart server:
   ```bash
   npm start
   ```

### Option 2: Kiểm tra IP address

Nếu IP address là `127.0.0.1` hoặc `::1`, VNPay có thể không chấp nhận.

**Giải pháp:**
- Dùng IP thật của máy (không phải localhost)
- Hoặc test trên server production

### Option 3: Kiểm tra signature

Nếu signature vẫn sai, kiểm tra:
- HashSecret có đúng không?
- Querystring có đúng format không?
- Params có được sort đúng không?

---

## 📋 Checklist Debug

- [ ] Kiểm tra logs backend khi gọi từ web
- [ ] So sánh với logs khi gọi từ mobile
- [ ] Kiểm tra Return URL trong .env
- [ ] Kiểm tra IP address trong logs
- [ ] Kiểm tra signature trong logs
- [ ] Test với ngrok URL
- [ ] Test với IP thật (không phải localhost)

---

## 🐛 Các lỗi thường gặp

### 1. Return URL là localhost

**Triệu chứng:**
- Error "Sai chữ ký" từ VNPay
- Return URL trong logs là `http://localhost:3000/...`

**Giải pháp:**
- Dùng ngrok
- Hoặc test trên production

### 2. IP address là localhost

**Triệu chứng:**
- IP address trong logs là `127.0.0.1` hoặc `::1`

**Giải pháp:**
- Dùng IP thật của máy
- Hoặc test trên server production

### 3. Signature không khớp

**Triệu chứng:**
- Signature trong logs khác với VNPay mong đợi

**Giải pháp:**
- Kiểm tra HashSecret
- Kiểm tra querystring format
- Kiểm tra params sorting

---

## ✅ Kết luận

**Vấn đề chính:** Return URL hoặc IP address không đúng khi gọi từ web.

**Giải pháp:**
1. Dùng ngrok cho Return URL
2. Kiểm tra IP address
3. Kiểm tra logs backend để debug

**Nếu vẫn lỗi:**
- Xem logs backend chi tiết
- So sánh với logs từ mobile
- Liên hệ VNPay support nếu cần

