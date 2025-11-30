# 🚀 Hướng dẫn Setup Ngrok cho VNPay Sandbox

## ❌ Vấn đề hiện tại

VNPay sandbox **KHÔNG THỂ** truy cập các URL local:
- ❌ `http://localhost:3000`
- ❌ `http://172.20.10.3:3000`
- ❌ `http://192.168.x.x:3000`

## ✅ Giải pháp: Dùng Ngrok

Ngrok tạo một public URL (HTTPS) trỏ về localhost của bạn, cho phép VNPay sandbox truy cập được.

---

## 📋 Bước 1: Cài đặt Ngrok

### macOS (Homebrew):
```bash
brew install ngrok
```

### Hoặc download từ:
https://ngrok.com/download

### Đăng ký tài khoản (miễn phí):
1. Truy cập: https://dashboard.ngrok.com/signup
2. Đăng ký tài khoản
3. Copy **Authtoken** từ dashboard

### Xác thực ngrok:
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

---

## 📋 Bước 2: Chạy Ngrok

### Terminal 1: Chạy backend server
```bash
cd /Users/trantai/Desktop/Shop_THB
npm start
```

### Terminal 2: Chạy ngrok
```bash
ngrok http 3000
```

### Kết quả:
```
Forwarding   https://abc123-def456.ngrok.io -> http://localhost:3000
```

**Copy URL này** (ví dụ: `https://abc123-def456.ngrok.io`)

---

## 📋 Bước 3: Cập nhật .env

Mở file `.env` và cập nhật:

```env
# VNPay Configuration
VNPAY_TMN_CODE=SY7OSRWP
VNPAY_HASH_SECRET=W3Z2UI7K934HIODNKU3OIE5ZR5A3WE9O
VNPAY_ENDPOINT=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html

# ⚠️ THAY ĐỔI CÁC DÒNG NÀY:
VNPAY_IPN_URL=https://abc123-def456.ngrok.io/api/payment/vnpay/callback
VNPAY_RETURN_URL=https://abc123-def456.ngrok.io/api/payment/vnpay/return
VNPAY_ENV=sandbox
```

**Lưu ý:** 
- Thay `abc123-def456.ngrok.io` bằng URL ngrok thực tế của bạn
- URL ngrok sẽ thay đổi mỗi lần restart (trừ khi dùng ngrok plan có tên miền cố định)

---

## 📋 Bước 4: Restart Server

```bash
# Dừng server (Ctrl+C)
# Sau đó chạy lại:
npm start
```

---

## 📋 Bước 5: Test lại

1. Tạo đơn hàng thanh toán VNPay từ app
2. Kiểm tra logs - không còn cảnh báo về localhost/IP local
3. Thanh toán trên VNPay sandbox
4. VNPay sẽ callback về ngrok URL → server của bạn

---

## 🔍 Kiểm tra cấu hình

Chạy script kiểm tra:

```bash
node test_vnpay_config.js
```

Kết quả mong đợi:
- ✅ TMN Code: ĐÚNG
- ✅ Hash Secret: ĐÚNG
- ✅ Endpoint: ĐÚNG
- ✅ IPN URL: Đang dùng ngrok (không còn localhost)
- ✅ Return URL: Đang dùng ngrok (không còn localhost)

---

## ⚠️ Lưu ý quan trọng

### 1. Ngrok URL thay đổi
- Mỗi lần restart ngrok, URL sẽ thay đổi
- Cần cập nhật lại `.env` mỗi lần

### 2. Ngrok Free Plan
- Có giới hạn số request
- URL thay đổi mỗi lần restart
- Có thể bị chậm

### 3. Ngrok Paid Plan
- Có thể đặt tên miền cố định
- Không giới hạn request
- Tốc độ nhanh hơn

### 4. Production
- **KHÔNG** dùng ngrok cho production
- Dùng domain thật với HTTPS
- Cập nhật `.env`:
  ```env
  VNPAY_ENDPOINT=https://www.vnpayment.vn/paymentv2/vpcpay.html
  VNPAY_IPN_URL=https://yourdomain.com/api/payment/vnpay/callback
  VNPAY_RETURN_URL=https://yourdomain.com/api/payment/vnpay/return
  VNPAY_ENV=production
  ```

---

## 🐛 Troubleshooting

### Ngrok không chạy được
```bash
# Kiểm tra xem port 3000 có đang chạy không
lsof -i :3000

# Kiểm tra ngrok config
ngrok config check
```

### VNPay vẫn báo lỗi
1. Kiểm tra ngrok đang chạy: `https://dashboard.ngrok.com/status/tunnels`
2. Test ngrok URL: Mở `https://your-ngrok-url.ngrok.io/api/payment/vnpay/return` trên browser
3. Kiểm tra logs ngrok để xem request có đến không
4. Kiểm tra server logs để xem callback có nhận được không

### Ngrok bị timeout
- Ngrok free plan có timeout sau 2 giờ không hoạt động
- Cần restart ngrok nếu bị timeout

---

## 📚 Tài liệu tham khảo

- Ngrok Documentation: https://ngrok.com/docs
- VNPay Integration Guide: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
- VNPay Demo Code: https://sandbox.vnpayment.vn/apis/vnpay-demo/code-demo-tích-hợp

---

## ✅ Checklist

- [ ] Đã cài đặt ngrok
- [ ] Đã đăng ký và xác thực ngrok
- [ ] Đã chạy ngrok: `ngrok http 3000`
- [ ] Đã copy URL ngrok
- [ ] Đã cập nhật `.env` với ngrok URL
- [ ] Đã restart server
- [ ] Đã chạy `node test_vnpay_config.js` và tất cả đều ✅
- [ ] Đã test thanh toán VNPay thành công

---

**Sau khi setup xong, VNPay sandbox sẽ có thể callback về server của bạn!** 🎉

