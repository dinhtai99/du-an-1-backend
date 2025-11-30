# 🔧 Sửa lỗi VNPay - IP Address Private

## ❌ Vấn đề

VNPay vẫn báo "Sai chữ ký" mặc dù:
- ✅ Signature generation: **ĐÚNG**
- ✅ Return URL: **Ngrok URL**
- ✅ Querystring format: **ĐÚNG**

**Nguyên nhân có thể:** IP address `192.168.1.1` là **private IP**, VNPay có thể không chấp nhận.

## 🔍 Phân tích

### IP Address hiện tại:
- `192.168.1.1` - Private IP (RFC 1918)
- VNPay có thể yêu cầu **public IP** hoặc không yêu cầu IP address

### Các giải pháp:

#### Option 1: Loại bỏ vnp_IpAddr khỏi signature (nếu VNPay cho phép)

**Kiểm tra:** VNPay có yêu cầu `vnp_IpAddr` trong signature không?

**Nếu không yêu cầu:**
- Loại bỏ `vnp_IpAddr` khỏi params khi tạo signature
- Chỉ thêm vào URL cuối cùng (không dùng cho signature)

#### Option 2: Dùng IP public

**Nếu VNPay yêu cầu IP address:**
- Dùng IP public (ví dụ: `8.8.8.8` hoặc IP thật của server)
- Không dùng private IP (`192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`)

#### Option 3: Lấy IP từ ngrok

**Khi dùng ngrok:**
- Ngrok có thể cung cấp IP thật trong headers
- Kiểm tra `x-forwarded-for` hoặc `x-real-ip`

---

## 🔧 Cách sửa

### Thử Option 1: Loại bỏ vnp_IpAddr khỏi signature

**Kiểm tra VNPay documentation:**
- `vnp_IpAddr` có bắt buộc trong signature không?
- Có thể chỉ cần trong URL, không cần trong signature?

**Nếu không bắt buộc:**
1. Tạo signature **KHÔNG có** `vnp_IpAddr`
2. Thêm `vnp_IpAddr` vào URL cuối cùng (sau khi tạo signature)

### Thử Option 2: Dùng IP public

**Sửa code:**
```javascript
// Thay vì 192.168.1.1, dùng IP public
const clientIp = "8.8.8.8"; // Hoặc IP thật của server
```

---

## 📋 Test

### Test 1: Loại bỏ vnp_IpAddr

1. Sửa code để loại bỏ `vnp_IpAddr` khỏi signature
2. Test lại thanh toán VNPay
3. Kiểm tra có còn lỗi "Sai chữ ký" không

### Test 2: Dùng IP public

1. Sửa code để dùng IP public (`8.8.8.8`)
2. Test lại thanh toán VNPay
3. Kiểm tra có còn lỗi "Sai chữ ký" không

---

## 💡 Khuyến nghị

**Vì signature generation đã đúng, vấn đề có thể là:**

1. **VNPay không chấp nhận private IP** → Dùng IP public
2. **VNPay không yêu cầu IP trong signature** → Loại bỏ khỏi signature
3. **VNPay sandbox có vấn đề** → Liên hệ VNPay support

**Bước tiếp theo:**
1. Kiểm tra VNPay documentation về `vnp_IpAddr`
2. Thử loại bỏ `vnp_IpAddr` khỏi signature
3. Hoặc dùng IP public
4. Liên hệ VNPay support nếu vẫn lỗi

---

## 📞 Liên hệ VNPay Support

**Thông tin cần cung cấp:**
- TMN Code: SY7OSRWP
- HashSecret: W3Z2UI7K934HIODNKU3OIE5ZR5A3WE9O
- Querystring: `vnp_Amount=902000000&vnp_Command=pay&vnp_CreateDate=20251128220229&vnp_CurrCode=VND&vnp_IpAddr=192.168.1.1&vnp_Locale=vn&vnp_OrderInfo=Thanh toan don hang ORD202511282202295178&vnp_OrderType=other&vnp_ReturnUrl=https://johnie-breakless-dimensionally.ngrok-free.dev/api/payment/vnpay/return&vnp_TmnCode=SY7OSRWP&vnp_TxnRef=1764342149681_6929b98571ebe56c034a9beb&vnp_Version=2.1.0`
- Signature: `3341ad3f4162cb8ca70cbaddef76a6f9b13bb17c5e0a9a6d70989b25a0436192e923fdfd71cc349664e38d4deaae66aa93571ee8a0a04aeda22630e3e51f2c34`
- Error: "Sai chữ ký"
- IP address: `192.168.1.1` (private IP)

**Câu hỏi:**
- VNPay có yêu cầu `vnp_IpAddr` trong signature không?
- VNPay có chấp nhận private IP (`192.168.1.1`) không?
- Có thể loại bỏ `vnp_IpAddr` khỏi signature không?

