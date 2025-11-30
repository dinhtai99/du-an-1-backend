# ✅ Sửa lỗi VNPay "Sai chữ ký" từ Web

## ✅ Đã kiểm tra

1. **Ngrok đang chạy:** ✅
   - URL: `https://johnie-breakless-dimensionally.ngrok-free.dev`
   - Forwarding: `-> http://localhost:3000`

2. **.env đã cấu hình:** ✅
   ```
   VNPAY_IPN_URL=https://johnie-breakless-dimensionally.ngrok-free.dev/api/payment/vnpay/callback
   VNPAY_RETURN_URL=https://johnie-breakless-dimensionally.ngrok-free.dev/api/payment/vnpay/return
   ```

## 🔧 Các bước tiếp theo

### 1. Đảm bảo server đã restart

**Nếu server chưa restart sau khi cập nhật .env:**

```bash
# Dừng server (Ctrl+C trong terminal chạy server)
# Sau đó chạy lại:
npm start
```

**Kiểm tra:**
- Server đang chạy trên port 3000
- Logs hiển thị: `✅ Connected to MongoDB Atlas`

### 2. Test lại thanh toán VNPay

1. **Mở trang web:**
   ```
   http://localhost:3000
   ```

2. **Đăng nhập** với tài khoản customer

3. **Thêm sản phẩm vào giỏ hàng**

4. **Click "Thanh toán"**

5. **Điền thông tin:**
   - Họ và tên: (ví dụ: Nguyễn Văn A)
   - Số điện thoại: (ví dụ: 0912345678)
   - Địa chỉ: (ví dụ: 123 Đường ABC)
   - Tỉnh/Thành phố: (ví dụ: Hà Nội)

6. **Chọn "VNPay"** làm phương thức thanh toán

7. **Click "Xác nhận thanh toán"**

8. **Kiểm tra:**
   - Redirect đến VNPay sandbox
   - Không còn lỗi "Sai chữ ký"

### 3. Kiểm tra logs backend

Khi test, xem logs backend:

```
📤 VNPay create payment params: { ... }
🔐 VNPay querystring for signature (raw, no encode): ...
🔐 VNPay SecureHash (full): ...
🔗 VNPay payment URL (FULL): ...
🔗 VNPay payment URL has vnp_SecureHash: ✅ YES
```

**Kiểm tra:**
- ✅ Return URL trong URL phải là ngrok URL (không phải localhost)
- ✅ Signature được tạo đúng
- ✅ URL đầy đủ và có vnp_SecureHash

---

## 🐛 Nếu vẫn lỗi "Sai chữ ký"

### 1. Kiểm tra ngrok có đang chạy không

```bash
# Kiểm tra ngrok status
# Mở: http://127.0.0.1:4040
# Hoặc xem terminal ngrok
```

**Đảm bảo:**
- ✅ Ngrok đang chạy
- ✅ URL không thay đổi
- ✅ Forwarding đến `http://localhost:3000`

### 2. Kiểm tra server có đang chạy không

```bash
# Kiểm tra port 3000
lsof -i :3000
```

**Đảm bảo:**
- ✅ Server đang chạy trên port 3000
- ✅ Server đã load .env mới

### 3. Test Return URL

```bash
# Test Return URL trên browser
curl https://johnie-breakless-dimensionally.ngrok-free.dev/api/payment/vnpay/return

# Hoặc mở trên browser:
# https://johnie-breakless-dimensionally.ngrok-free.dev/api/payment/vnpay/return
```

**Kết quả mong đợi:**
- ✅ Trả về response (không phải 404)
- ✅ Server đang chạy

### 4. Xem logs backend chi tiết

Khi test, copy logs backend và kiểm tra:
- Querystring cho signature
- SecureHash đầy đủ
- Return URL trong payment URL
- IP address

---

## 📋 Checklist

- [x] Ngrok đang chạy
- [x] .env đã cấu hình ngrok URL
- [ ] Server đã restart sau khi cập nhật .env
- [ ] Test Return URL accessible
- [ ] Test thanh toán VNPay từ web
- [ ] Kiểm tra logs backend
- [ ] Không còn lỗi "Sai chữ ký"

---

## ✅ Kết luận

**Đã có:**
- ✅ Ngrok đang chạy
- ✅ .env đã cấu hình ngrok URL

**Cần làm:**
1. Đảm bảo server đã restart
2. Test lại thanh toán VNPay từ web
3. Kiểm tra logs backend

**Nếu vẫn lỗi:**
- Gửi logs backend khi test
- Kiểm tra Return URL có accessible không
- Kiểm tra IP address trong logs

