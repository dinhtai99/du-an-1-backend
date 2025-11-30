# 🔍 Kiểm tra VNPay từ Web - Lỗi "Sai chữ ký"

## ❌ Vấn đề

Khi test thanh toán VNPay từ web (`http://localhost:3000`), gặp lỗi **"Sai chữ ký"** từ VNPay.

## 🔍 Nguyên nhân có thể

### 1. **Return URL là localhost** ⚠️ QUAN TRỌNG

**Vấn đề:**
- VNPay Return URL trong `.env` có thể là `http://localhost:3000/api/payment/vnpay/return`
- VNPay sandbox **KHÔNG THỂ** truy cập localhost
- → VNPay không thể verify signature và callback về server

**Kiểm tra:**
```bash
cat .env | grep VNPAY_RETURN_URL
```

**Nếu là localhost:**
```env
VNPAY_RETURN_URL=http://localhost:3000/api/payment/vnpay/return  # ❌ SAI
```

**Giải pháp:**
- Dùng ngrok: `https://abc123.ngrok.io/api/payment/vnpay/return`
- Hoặc domain thật: `https://yourdomain.com/api/payment/vnpay/return`

### 2. **IP Address là localhost**

**Vấn đề:**
- IP address từ web có thể là `127.0.0.1` hoặc `::1`
- VNPay có thể không chấp nhận localhost IP

**Kiểm tra logs backend:**
```
📤 VNPay create payment params: {
  ...
  vnp_IpAddr: '127.0.0.1'  // ❌ Có thể là vấn đề
}
```

**Giải pháp:**
- Dùng IP thật của máy (không phải localhost)
- Hoặc test trên server production

### 3. **Signature generation**

**Vấn đề:**
- Signature generation đã được test và đúng
- Nhưng có thể có vấn đề khi gọi từ web

**Kiểm tra logs backend:**
```
🔐 VNPay querystring for signature (raw, no encode): ...
🔐 VNPay SecureHash (full): ...
```

---

## 🔧 Các bước debug

### Bước 1: Kiểm tra logs backend

Khi test thanh toán từ web, xem logs backend:

```
📤 VNPay create payment params: { ... }
🔐 VNPay querystring for signature (raw, no encode): ...
🔐 VNPay SecureHash (full): ...
🔗 VNPay payment URL (FULL): ...
🔗 VNPay payment URL has vnp_SecureHash: ✅ YES hoặc ❌ NO
```

**Gửi logs này để debug tiếp.**

### Bước 2: Kiểm tra Return URL

```bash
# Kiểm tra .env
cat .env | grep VNPAY

# Kết quả mong đợi:
VNPAY_RETURN_URL=https://your-ngrok-url.ngrok.io/api/payment/vnpay/return
VNPAY_IPN_URL=https://your-ngrok-url.ngrok.io/api/payment/vnpay/callback
```

**Nếu là localhost:**
- ❌ `http://localhost:3000/...` → VNPay không thể truy cập
- ✅ `https://abc123.ngrok.io/...` → VNPay có thể truy cập

### Bước 3: Setup ngrok (nếu chưa có)

```bash
# 1. Chạy ngrok
ngrok http 3000

# 2. Copy URL ngrok (ví dụ: https://abc123.ngrok.io)

# 3. Cập nhật .env
VNPAY_RETURN_URL=https://abc123.ngrok.io/api/payment/vnpay/return
VNPAY_IPN_URL=https://abc123.ngrok.io/api/payment/vnpay/callback

# 4. Restart server
npm start
```

### Bước 4: Test lại

1. Refresh trang web
2. Thêm sản phẩm vào giỏ hàng
3. Click "Thanh toán"
4. Chọn VNPay
5. Điền thông tin và xác nhận
6. Kiểm tra logs backend

---

## 📋 Checklist

- [ ] Kiểm tra Return URL trong .env (phải là ngrok hoặc public URL)
- [ ] Kiểm tra IPN URL trong .env (phải là ngrok hoặc public URL)
- [ ] Ngrok đang chạy (nếu dùng ngrok)
- [ ] Server đã restart sau khi cập nhật .env
- [ ] Kiểm tra logs backend khi test
- [ ] So sánh signature với logs trước đó

---

## 💡 Giải pháp nhanh

**Nếu Return URL là localhost:**

1. **Chạy ngrok:**
   ```bash
   ngrok http 3000
   ```

2. **Copy URL ngrok** (ví dụ: `https://abc123.ngrok.io`)

3. **Cập nhật .env:**
   ```env
   VNPAY_RETURN_URL=https://abc123.ngrok.io/api/payment/vnpay/return
   VNPAY_IPN_URL=https://abc123.ngrok.io/api/payment/vnpay/callback
   ```

4. **Restart server:**
   ```bash
   npm start
   ```

5. **Test lại thanh toán VNPay từ web**

---

## 🐛 Nếu vẫn lỗi

**Gửi thông tin sau:**
1. Logs backend khi test (querystring, signature, URL)
2. Return URL trong .env
3. IP address trong logs
4. Error message từ VNPay

**Hoặc:**
- Test với COD trước (không cần payment gateway)
- Test với ZaloPay/MoMo để xem có cùng vấn đề không
- Liên hệ VNPay support nếu cần

---

## ✅ Kết luận

**Vấn đề chính:** Return URL là localhost → VNPay không thể truy cập → Lỗi "Sai chữ ký"

**Giải pháp:** Dùng ngrok hoặc domain thật cho Return URL

**Bước tiếp theo:** Setup ngrok và test lại

