# 🔧 Sửa lỗi VNPay Error 70 (Sai chữ ký)

## ❌ Vấn đề

Lỗi **Error 70** (hoặc **Error 97**) từ VNPay: **"Checksum failed"** - Chữ ký không khớp.

## 🔍 Nguyên nhân

1. **Params có giá trị null/undefined/rỗng** - VNPay không chấp nhận params rỗng trong signature
2. **Sort không đúng** - Params phải được sắp xếp theo thứ tự alphabet
3. **Encode sai** - Signature phải được tạo từ **raw values** (KHÔNG encode), nhưng URL cuối cùng phải encode

## ✅ Đã sửa

### 1. Loại bỏ params null/undefined/rỗng

**Trước:**
```javascript
const sortedParams = this.sortObject(vnp_Params);
```

**Sau:**
```javascript
// Loại bỏ các params có giá trị null, undefined, hoặc rỗng
const cleanedParams = {};
Object.keys(vnp_Params).forEach(key => {
  const value = vnp_Params[key];
  if (value !== null && value !== undefined && value !== "") {
    cleanedParams[key] = String(value); // Đảm bảo tất cả values đều là string
  }
});

const sortedParams = this.sortObject(cleanedParams);
```

### 2. Đảm bảo tất cả values là string

```javascript
cleanedParams[key] = String(value); // Đảm bảo tất cả values đều là string
```

### 3. Signature generation (KHÔNG encode)

```javascript
// Tạo query string cho signature - KHÔNG encode (raw values)
const querystring = Object.keys(sortedParams)
  .sort()
  .map(key => `${key}=${sortedParams[key]}`) // Raw values, không encode
  .join("&");

// Tạo signature
const vnp_SecureHash = crypto
  .createHmac("sha512", this.hashSecret)
  .update(querystring)
  .digest("hex");
```

### 4. Final URL (CÓ encode)

```javascript
// Tạo payment URL - ENCODE values cho URL
const finalQuerystring = Object.keys(sortedParams)
  .sort()
  .map(key => `${key}=${encodeURIComponent(sortedParams[key])}`) // Encode cho URL
  .join("&");
```

---

## 📋 Checklist kiểm tra

### ✅ TMN Code và Hash Secret

```bash
# Chạy script kiểm tra
node test_vnpay_config.js
```

**Kết quả mong đợi:**
- ✅ TMN Code: `SY7OSRWP`
- ✅ Hash Secret: `W3Z2UI7K934HIODNKU3OIE5ZR5A3WE9O`

### ✅ Signature Generation

```bash
# Chạy script test signature
node test_vnpay_signature.js
```

**Kết quả mong đợi:**
- ✅ Params đã sort alphabet
- ✅ Querystring KHÔNG encode (raw values)
- ✅ Signature generation hoạt động
- ✅ Signature verify match

### ✅ Code Implementation

**File:** `services/vnpayService.js`

**Kiểm tra:**
1. ✅ Loại bỏ params null/undefined/rỗng trước khi tạo signature
2. ✅ Tất cả values đều là string
3. ✅ Params được sort theo alphabet
4. ✅ Signature được tạo từ raw values (KHÔNG encode)
5. ✅ Final URL có encode values

---

## 🧪 Test lại

### 1. Restart server

```bash
# Dừng server (Ctrl+C)
npm start
```

### 2. Test thanh toán VNPay

1. Tạo đơn hàng từ app
2. Chọn thanh toán VNPay
3. Kiểm tra logs:
   ```
   📤 VNPay create payment params: { ... }
   🔐 VNPay querystring for signature (raw, no encode): ...
   🔐 VNPay SecureHash (first 20 chars): ...
   ```

### 3. Kiểm tra lỗi

**Nếu vẫn lỗi Error 70:**

1. **Kiểm tra TMN Code và Hash Secret:**
   ```bash
   node test_vnpay_config.js
   ```

2. **Kiểm tra signature generation:**
   ```bash
   node test_vnpay_signature.js
   ```

3. **Kiểm tra logs:**
   - Xem querystring có đúng format không
   - Xem signature có được tạo đúng không
   - Xem có params null/undefined/rỗng không

4. **Kiểm tra .env:**
   ```bash
   cat .env | grep VNPAY
   ```
   
   Đảm bảo:
   ```env
   VNPAY_TMN_CODE=SY7OSRWP
   VNPAY_HASH_SECRET=W3Z2UI7K934HIODNKU3OIE5ZR5A3WE9O
   ```

---

## 🔍 Debug Tips

### 1. Log querystring cho signature

Code đã có log:
```javascript
console.log("🔐 VNPay querystring for signature (raw, no encode):", querystring);
```

**Kiểm tra:**
- Params có được sort alphabet không?
- Values có bị encode không? (KHÔNG được encode)
- Có params rỗng/null/undefined không?

### 2. Log signature

```javascript
console.log("🔐 VNPay SecureHash (first 20 chars):", vnp_SecureHash.substring(0, 20) + "...");
```

**Kiểm tra:**
- Signature có 128 ký tự (64 bytes hex) không?
- Signature có được tạo từ querystring đúng không?

### 3. So sánh với VNPay demo

Tài liệu VNPay: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html

Code demo: https://sandbox.vnpayment.vn/apis/vnpay-demo/code-demo-tích-hợp

---

## 📚 Tài liệu tham khảo

- VNPay Integration Guide: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
- VNPay Demo Code: https://sandbox.vnpayment.vn/apis/vnpay-demo/code-demo-tích-hợp
- VNPay Error Codes: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html#error-codes

---

## ✅ Kết luận

**Đã sửa:**
1. ✅ Loại bỏ params null/undefined/rỗng
2. ✅ Đảm bảo tất cả values là string
3. ✅ Sort params theo alphabet
4. ✅ Signature từ raw values (KHÔNG encode)
5. ✅ Final URL có encode values

**Cần kiểm tra:**
- ✅ TMN Code và Hash Secret đúng
- ✅ .env file đã cấu hình đúng
- ✅ Test lại thanh toán VNPay

**Nếu vẫn lỗi:**
- Kiểm tra logs chi tiết
- So sánh với VNPay demo code
- Liên hệ VNPay support: 1900 55 55 77

