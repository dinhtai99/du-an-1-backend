# 🔧 Hướng dẫn Debug và Khắc phục lỗi VNPay

## ❌ Lỗi thường gặp: "Có lỗi xảy ra trong quá trình xử lý"

Lỗi này có thể do nhiều nguyên nhân. Hãy kiểm tra từng bước sau:

---

## 🔴 Các lỗi đã được sửa (v1.1)

### 1. ✅ Format vnp_CreateDate sai
**Vấn đề:** URL có `vnp_CreateDate=20251128T06014900` (có chữ "T" và "00")
**Đã sửa:** 
- Tự động loại bỏ chữ "T" và các ký tự không hợp lệ
- Sử dụng UTC time để tránh timezone issues
- Format đúng: `yyyyMMddHHmmss` (14 ký tự số)

### 2. ✅ IP Address bị encode sai
**Vấn đề:** URL có `vnp_IpAddr=%3A%3Affff%3A172.20.10.4` (IPv6-mapped IPv4)
**Đã sửa:**
- Tự động extract IP thật từ IPv6-mapped address
- Loại bỏ prefix `::ffff:`
- Chỉ giữ IPv4 thuần túy

### 3. ✅ vnp_OrderInfo có ký tự đặc biệt
**Đã sửa:**
- Tự động sanitize, loại bỏ ký tự đặc biệt
- Giới hạn 255 ký tự
- Chỉ giữ chữ, số, khoảng trắng, dấu tiếng Việt

### 4. ✅ Validate vnp_Amount
**Đã sửa:**
- Đảm bảo là số nguyên
- Kiểm tra > 0

### 5. ✅ Logging chi tiết
**Đã thêm:**
- Log params trước khi tạo signature
- Log querystring để verify
- Log SecureHash (20 ký tự đầu)
- Log payment URL đã tạo

---

## ✅ Checklist khắc phục

### 1. Kiểm tra cấu hình `.env`

```env
VNPAY_TMN_CODE=SY7OSRWP
VNPAY_HASH_SECRET=W3Z2UI7K934HIODNKU3OIE5ZR5A3WE9O
VNPAY_ENDPOINT=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_IPN_URL=http://localhost:3000/api/payment/vnpay/callback
VNPAY_RETURN_URL=http://172.20.10.3:3000/api/payment/vnpay/return
VNPAY_ENV=sandbox
```

**⚠️ Vấn đề quan trọng:**
- `VNPAY_IPN_URL` và `VNPAY_RETURN_URL` đang dùng `localhost` hoặc IP local
- **VNPay sandbox KHÔNG THỂ truy cập localhost/IP local từ bên ngoài**
- Cần sử dụng **public URL** (ngrok, hoặc server có public IP)

---

### 2. Sử dụng ngrok để test local

#### Cài đặt ngrok:
```bash
# macOS
brew install ngrok

# Hoặc download từ https://ngrok.com/download
```

#### Chạy ngrok:
```bash
ngrok http 3000
```

#### Cập nhật `.env`:
```env
VNPAY_IPN_URL=https://your-ngrok-url.ngrok.io/api/payment/vnpay/callback
VNPAY_RETURN_URL=https://your-ngrok-url.ngrok.io/api/payment/vnpay/return
```

**Lưu ý:** Mỗi lần restart ngrok, URL sẽ thay đổi. Cần cập nhật lại `.env`.

---

### 3. Kiểm tra TMN Code và Hash Secret

**VNPay Sandbox:**
- Đăng nhập: https://sandbox.vnpayment.vn/
- Kiểm tra **Terminal Code (TMN Code)** và **Hash Secret** trong dashboard
- Đảm bảo copy đúng, không có khoảng trắng thừa

**Test credentials (nếu có):**
- TMN Code: `SY7OSRWP` (kiểm tra lại trong dashboard)
- Hash Secret: `W3Z2UI7K934HIODNKU3OIE5ZR5A3WE9O` (kiểm tra lại trong dashboard)

---

### 4. Kiểm tra format dữ liệu

#### vnp_CreateDate
- **Format:** `yyyyMMddHHmmss` (14 ký tự số)
- **Ví dụ:** `20241128123045` (28/11/2024 12:30:45)
- ✅ Đã được sửa trong code

#### vnp_Amount
- **Format:** Số nguyên (tính bằng xu, x100)
- **Ví dụ:** 100000 VND = `10000000` (10 triệu xu)
- ✅ Đã được validate trong code

#### vnp_OrderInfo
- **Giới hạn:** Tối đa 255 ký tự
- **Ký tự:** Chỉ chữ, số, khoảng trắng, dấu tiếng Việt
- ✅ Đã được sanitize trong code

#### vnp_TxnRef
- **Format:** `timestamp_orderId`
- **Ví dụ:** `1700723325000_69194c91153af09b0d1bbbc7`
- ✅ Đã được generate đúng format

---

### 5. Kiểm tra Signature (vnp_SecureHash)

Signature được tạo từ:
1. Sắp xếp params theo thứ tự alphabet
2. Tạo query string: `vnp_Amount=10000000&vnp_Command=pay&...`
3. Hash bằng HMAC-SHA512 với Hash Secret

**Log để debug:**
```javascript
console.log("🔐 VNPay querystring for signature:", querystring);
console.log("🔐 VNPay SecureHash (first 20 chars):", vnp_SecureHash.substring(0, 20) + "...");
```

**Kiểm tra:**
- Hash Secret có đúng không?
- Params có được sắp xếp đúng thứ tự không?
- Query string có đúng format không?

---

### 6. Kiểm tra logs backend

Khi tạo payment URL, backend sẽ log:

```
📤 VNPay create payment params: {
  vnp_TmnCode: 'SY7OSRWP',
  vnp_Amount: '10000000',
  vnp_TxnRef: '1700723325000_orderId',
  vnp_OrderInfo: 'Thanh toan don hang ORD-20241128-123045-1234',
  vnp_CreateDate: '20241128123045',
  vnp_IpAddr: '127.0.0.1',
  vnp_ReturnUrl: 'http://localhost:3000/api/payment/vnpay/return'
}
🔐 VNPay querystring for signature: vnp_Amount=10000000&vnp_Command=pay&...
🔐 VNPay SecureHash (first 20 chars): abc123def456...
✅ VNPay payment URL created: {
  endpoint: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  urlLength: 1234,
  hasSecureHash: true
}
```

**Kiểm tra:**
- Tất cả params có giá trị hợp lệ không?
- SecureHash có được tạo không?
- Payment URL có được tạo thành công không?

---

### 7. Kiểm tra callback từ VNPay

Khi VNPay gọi callback, backend sẽ log:

```
📥 VNPay IPN callback received: {
  method: 'GET',
  params: {
    vnp_TxnRef: '1700723325000_orderId',
    vnp_Amount: '10000000',
    vnp_ResponseCode: '00',
    vnp_TransactionStatus: '00',
    ...
  }
}
```

**Nếu không thấy log:**
- VNPay không thể gọi được callback URL
- Kiểm tra IPN URL có public không
- Kiểm tra firewall/network

---

### 8. Mã lỗi VNPay phổ biến

| Mã lỗi | Ý nghĩa | Cách khắc phục |
|--------|---------|----------------|
| **97** | Checksum không hợp lệ | Kiểm tra Hash Secret, format params |
| **91** | Không tìm thấy giao dịch | Kiểm tra vnp_TxnRef |
| **07** | Giao dịch bị nghi ngờ | Liên hệ VNPay support |
| **09** | Thẻ chưa đăng ký InternetBanking | Dùng thẻ test khác |
| **10** | Xác thực sai quá 3 lần | Đợi 15 phút hoặc dùng thẻ khác |
| **11** | Hết hạn chờ thanh toán | Tạo lại đơn hàng |
| **12** | Thẻ/Tài khoản bị khóa | Dùng thẻ test khác |
| **24** | Khách hàng hủy giao dịch | Bình thường, không phải lỗi |

---

## 🔍 Debug Step-by-Step

### Bước 1: Kiểm tra cấu hình
```bash
# Kiểm tra .env
cat .env | grep VNPAY
```

### Bước 2: Test tạo payment URL
```bash
# Gọi API tạo payment
curl -X POST http://localhost:3000/api/payment/vnpay/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"product": "product_id", "quantity": 1, "price": 100000}],
    "shippingAddress": {
      "fullName": "Test",
      "phone": "0912345678",
      "address": "123 Test"
    }
  }'
```

### Bước 3: Kiểm tra payment URL
- Copy `paymentUrl` từ response
- Mở trong browser
- Kiểm tra có lỗi gì không

### Bước 4: Kiểm tra logs
```bash
# Xem logs backend
tail -f logs/app.log
# Hoặc nếu dùng console.log
# Xem terminal chạy server
```

### Bước 5: Test callback
- Sử dụng ngrok để có public URL
- Cập nhật `.env` với ngrok URL
- Restart server
- Thử lại thanh toán

---

## 🚀 Giải pháp nhanh

### Nếu đang test local:

1. **Cài ngrok:**
   ```bash
   brew install ngrok
   ```

2. **Chạy ngrok:**
   ```bash
   ngrok http 3000
   ```

3. **Cập nhật `.env`:**
   ```env
   VNPAY_IPN_URL=https://abc123.ngrok.io/api/payment/vnpay/callback
   VNPAY_RETURN_URL=https://abc123.ngrok.io/api/payment/vnpay/return
   ```

4. **Restart server:**
   ```bash
   npm start
   ```

5. **Test lại thanh toán**

### Nếu đã deploy lên server:

1. **Cập nhật `.env` với domain thật:**
   ```env
   VNPAY_IPN_URL=https://yourdomain.com/api/payment/vnpay/callback
   VNPAY_RETURN_URL=https://yourdomain.com/api/payment/vnpay/return
   ```

2. **Đảm bảo HTTPS:**
   - VNPay production yêu cầu HTTPS
   - SSL certificate hợp lệ

3. **Whitelist IP (nếu cần):**
   - VNPay sẽ gọi callback từ IP của họ
   - Kiểm tra firewall rules

---

## 📞 Liên hệ hỗ trợ

- **VNPay Support:** 1900 55 55 77
- **VNPay Sandbox:** https://sandbox.vnpayment.vn/
- **VNPay Docs:** https://sandbox.vnpayment.vn/apis/docs/

---

## ✅ Sau khi sửa

Sau khi sửa các vấn đề trên, thử lại thanh toán. Nếu vẫn lỗi:

1. Kiểm tra logs backend chi tiết
2. Kiểm tra response từ VNPay (nếu có)
3. Liên hệ VNPay support với:
   - TMN Code
   - vnp_TxnRef
   - Thời gian giao dịch
   - Mã lỗi (nếu có)

