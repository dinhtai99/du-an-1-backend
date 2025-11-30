# 🔍 Debug VNPay Error 70 (Signature Error)

## ❌ Vấn đề

VNPay trả về **Error 70** - "Checksum failed" (Sai chữ ký).

## 🔍 Các bước debug

### 1. Kiểm tra logs backend

Khi tạo payment URL, backend sẽ log:
```
📤 VNPay create payment params: { ... }
🔐 VNPay querystring for signature (raw, no encode): ...
🔐 VNPay querystring length: ...
🔐 VNPay hashSecret length: ...
🔐 VNPay hashSecret (first 10 chars): ...
🔐 VNPay SecureHash (full): ...
🔐 VNPay SecureHash length: ...
🔐 VNPay SecureHash (first 20 chars): ...
```

**Kiểm tra:**
- ✅ `hashSecret length` phải là 32 (32 ký tự)
- ✅ `SecureHash length` phải là 128 (64 bytes hex)
- ✅ Querystring không có encode (raw values)
- ✅ Params được sort theo alphabet

### 2. So sánh với VNPay demo

**Querystring cho signature phải:**
- ✅ Không encode values (raw)
- ✅ Sort theo alphabet
- ✅ Format: `key=value&key2=value2`
- ✅ Không có params null/undefined

**Final URL phải:**
- ✅ Encode values: `key=encodeURIComponent(value)`
- ✅ Sort theo alphabet (bao gồm cả `vnp_SecureHash`)
- ✅ Format: `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?key=value&key2=value2`

### 3. Kiểm tra cấu hình

```bash
# Kiểm tra .env
cat .env | grep VNPAY

# Kết quả mong đợi:
VNPAY_TMN_CODE=SY7OSRWP
VNPAY_HASH_SECRET=W3Z2UI7K934HIODNKU3OIE5ZR5A3WE9O
VNPAY_ENDPOINT=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
```

### 4. Test signature generation

```bash
# Test signature generation
node test_vnpay_signature.js

# Test cấu hình
node test_vnpay_config.js

# Debug signature
node debug_vnpay_signature.js
```

### 5. Kiểm tra params được truyền vào

**Từ routes/payment.js:**
```javascript
const vnpayResult = vnpayService.createPaymentUrl({
  vnp_Amount: Math.round(order.total * 100), // Phải x100 (tính bằng xu)
  vnp_TxnRef: vnp_TxnRef,
  vnp_OrderInfo: `Thanh toán đơn hàng ${order.orderNumber}`,
  vnp_IpAddr: clientIp,
});
```

**Kiểm tra:**
- ✅ `vnp_Amount` phải là số nguyên (không có dấu chấm)
- ✅ `vnp_TxnRef` không được trùng
- ✅ `vnp_OrderInfo` đã được sanitize (không có ký tự đặc biệt)
- ✅ `vnp_IpAddr` là IPv4 thuần túy (không có `::ffff:`)

---

## 🐛 Các nguyên nhân thường gặp

### 1. Hash Secret sai

**Triệu chứng:**
- Signature không khớp
- Error 70 từ VNPay

**Giải pháp:**
```bash
# Kiểm tra .env
cat .env | grep VNPAY_HASH_SECRET

# Phải là: W3Z2UI7K934HIODNKU3OIE5ZR5A3WE9O
```

### 2. TMN Code sai

**Triệu chứng:**
- Error 70 hoặc Error 3

**Giải pháp:**
```bash
# Kiểm tra .env
cat .env | grep VNPAY_TMN_CODE

# Phải là: SY7OSRWP
```

### 3. Querystring bị encode khi tạo signature

**Triệu chứng:**
- Signature không khớp
- Error 70

**Giải pháp:**
- ✅ Signature phải được tạo từ **raw values** (KHÔNG encode)
- ✅ Final URL mới encode values

### 4. Params không được sort đúng

**Triệu chứng:**
- Signature không khớp
- Error 70

**Giải pháp:**
- ✅ Params phải được sort theo alphabet
- ✅ Không sort 2 lần (sortObject đã sort rồi)

### 5. Params null/undefined/rỗng

**Triệu chứng:**
- Signature không khớp
- Error 70

**Giải pháp:**
- ✅ Loại bỏ params null/undefined
- ⚠️ Giữ lại params rỗng nếu bắt buộc

### 6. vnp_Amount sai format

**Triệu chứng:**
- Error 70 hoặc Error 5

**Giải pháp:**
```javascript
// ✅ ĐÚNG: Phải x100 (tính bằng xu)
vnp_Amount: Math.round(order.total * 100)

// ❌ SAI: Không x100
vnp_Amount: order.total
```

### 7. vnp_CreateDate sai format

**Triệu chứng:**
- Error 70

**Giải pháp:**
- ✅ Format: `yyyyMMddHHmmss` (14 ký tự số)
- ❌ Không có "T" hoặc ":"
- ✅ Sử dụng local time (GMT+7), không phải UTC

### 8. vnp_IpAddr sai format

**Triệu chứng:**
- Error 70

**Giải pháp:**
- ✅ Phải là IPv4 thuần túy: `192.168.1.1`
- ❌ Không có `::ffff:` prefix
- ✅ Code đã có `extractIpAddress()` để xử lý

---

## 📋 Checklist Debug

- [ ] Hash Secret đúng (32 ký tự)
- [ ] TMN Code đúng
- [ ] Querystring cho signature KHÔNG encode (raw values)
- [ ] Params được sort theo alphabet
- [ ] vnp_Amount đúng format (x100, số nguyên)
- [ ] vnp_CreateDate đúng format (yyyyMMddHHmmss, 14 ký tự)
- [ ] vnp_IpAddr đúng format (IPv4 thuần túy)
- [ ] vnp_OrderInfo đã được sanitize
- [ ] Server đã restart sau khi sửa code
- [ ] Logs backend hiển thị đầy đủ thông tin

---

## 🔧 Cách sửa

### 1. Restart server

```bash
# Dừng server (Ctrl+C)
npm start
```

### 2. Kiểm tra logs

Khi test thanh toán, xem logs backend:
```
🔐 VNPay querystring for signature (raw, no encode): ...
🔐 VNPay SecureHash (full): ...
```

### 3. So sánh với VNPay

Copy querystring và signature từ logs, so sánh với VNPay demo code.

### 4. Test lại

Tạo đơn hàng mới và test thanh toán VNPay.

---

## 📞 Liên hệ hỗ trợ

Nếu vẫn lỗi sau khi kiểm tra tất cả:

1. **VNPay Support:**
   - Hotline: 1900 55 55 77
   - Email: hotrovnpay@vnpay.vn

2. **Cung cấp thông tin:**
   - TMN Code
   - Querystring cho signature (từ logs)
   - Signature được tạo (từ logs)
   - Error code từ VNPay
   - Logs backend đầy đủ

---

## ✅ Kết luận

**Đã sửa:**
1. ✅ Loại bỏ params null/undefined
2. ✅ Đảm bảo tất cả values là string
3. ✅ Sort params theo alphabet (chỉ 1 lần)
4. ✅ Signature từ raw values (KHÔNG encode)
5. ✅ Final URL có encode values
6. ✅ Thêm logging chi tiết

**Cần kiểm tra:**
- ✅ Logs backend khi tạo payment URL
- ✅ Hash Secret và TMN Code đúng
- ✅ Format của các params (Amount, CreateDate, IpAddr)
- ✅ Server đã restart

**Nếu vẫn lỗi:**
- Xem logs backend chi tiết
- So sánh với VNPay demo code
- Liên hệ VNPay support

