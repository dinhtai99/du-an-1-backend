# 🔍 So sánh Implementation VNPay với Thư viện Chính thức

## 📋 Tổng quan

So sánh implementation hiện tại (`services/vnpayService.js`) với thư viện VNPay chính thức từ npm (`vnpay`).

---

## 🔑 Điểm khác biệt chính

### 1. **vnp_CreateDate Format**

#### ❌ Implementation hiện tại (CÓ VẤN ĐỀ):
```javascript
generateCreateDate() {
  const now = new Date();
  // Sử dụng UTC
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const hours = String(now.getUTCHours()).padStart(2, "0");
  const minutes = String(now.getUTCMinutes()).padStart(2, "0");
  const seconds = String(now.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}
```

**Vấn đề:** 
- Sử dụng UTC time có thể gây lệch múi giờ
- VNPay có thể yêu cầu local time (GMT+7 cho Việt Nam)

#### ✅ Thư viện chính thức (ĐÚNG):
```javascript
// Thư viện vnpay sử dụng local time (GMT+7)
const date = new Date();
const year = date.getFullYear();
const month = String(date.getMonth() + 1).padStart(2, "0");
const day = String(date.getDate()).padStart(2, "0");
const hours = String(date.getHours()).padStart(2, "0");
const minutes = String(date.getMinutes()).padStart(2, "0");
const seconds = String(date.getSeconds()).padStart(2, "0");
return `${year}${month}${day}${hours}${minutes}${seconds}`;
```

**Khuyến nghị:** Đổi sang local time (GMT+7) thay vì UTC.

---

### 2. **Query String cho Signature**

#### ✅ Implementation hiện tại (ĐÚNG):
```javascript
// Tạo query string cho signature - KHÔNG encode (raw values)
const querystring = Object.keys(sortedParams)
  .sort()
  .map(key => `${key}=${sortedParams[key]}`)
  .join("&");
```

**Đúng:** VNPay yêu cầu signature được tạo từ raw values, không encode.

#### ✅ Thư viện chính thức:
```javascript
// Tương tự - không encode cho signature
const querystring = Object.keys(sortedParams)
  .sort()
  .map(key => `${key}=${sortedParams[key]}`)
  .join("&");
```

**Kết luận:** Implementation đúng.

---

### 3. **Payment URL Encoding**

#### ✅ Implementation hiện tại (ĐÚNG):
```javascript
// Encode từng giá trị cho payment URL
const finalQuerystring = Object.keys(sortedParams)
  .sort()
  .map(key => {
    const value = sortedParams[key];
    return `${key}=${encodeURIComponent(value)}`;
  })
  .join("&");
```

**Đúng:** Payment URL cần encode để URL hợp lệ.

#### ✅ Thư viện chính thức:
```javascript
// Tương tự - encode cho payment URL
const url = new URL(endpoint);
Object.keys(sortedParams).forEach(key => {
  url.searchParams.append(key, sortedParams[key]);
});
```

**Kết luận:** Implementation đúng.

---

### 4. **IP Address Handling**

#### ✅ Implementation hiện tại (TỐT):
```javascript
extractIpAddress(ip) {
  if (!ip) return "127.0.0.1";
  
  // Loại bỏ IPv6 prefix "::ffff:"
  if (ip.includes("::ffff:")) {
    ip = ip.replace("::ffff:", "");
  }
  
  // Loại bỏ IPv6 brackets
  ip = ip.replace(/^\[|\]$/g, "");
  
  // Validate IPv4 format
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(ip)) {
    return ip;
  }
  
  return "127.0.0.1";
}
```

**Tốt:** Xử lý IPv6-mapped IPv4 addresses.

#### ⚠️ Thư viện chính thức:
```javascript
// Thư viện có thể không xử lý IPv6 prefix
// Cần kiểm tra
```

**Kết luận:** Implementation hiện tại tốt hơn.

---

### 5. **OrderInfo Sanitization**

#### ✅ Implementation hiện tại (TỐT):
```javascript
sanitizeOrderInfo(orderInfo) {
  if (!orderInfo) return "";
  let cleaned = orderInfo
    .replace(/[^\w\s\u00C0-\u1EF9]/g, "") // Loại bỏ ký tự đặc biệt
    .trim()
    .substring(0, 255); // Giới hạn 255 ký tự
  return cleaned || "Thanh toan don hang";
}
```

**Tốt:** Xử lý ký tự đặc biệt và giới hạn độ dài.

#### ⚠️ Thư viện chính thức:
```javascript
// Có thể không sanitize, để user tự xử lý
```

**Kết luận:** Implementation hiện tại tốt hơn.

---

### 6. **Verify Callback**

#### ⚠️ Implementation hiện tại (CÓ VẤN ĐỀ):
```javascript
verifyCallback(queryParams) {
  const paramsForVerify = { ...queryParams };
  delete paramsForVerify["vnp_SecureHash"];
  delete paramsForVerify["vnp_SecureHashType"];

  const sortedParams = this.sortObject(paramsForVerify);
  const querystring = new URLSearchParams(sortedParams).toString(); // ❌ SAI!

  const calculatedHash = crypto
    .createHmac("sha512", this.hashSecret)
    .update(querystring)
    .digest("hex");

  return calculatedHash === vnp_SecureHash;
}
```

**Vấn đề:** 
- Dùng `URLSearchParams.toString()` sẽ encode values
- Signature phải được tạo từ raw values, không encode

#### ✅ Thư viện chính thức (ĐÚNG):
```javascript
verifyCallback(queryParams) {
  const paramsForVerify = { ...queryParams };
  delete paramsForVerify["vnp_SecureHash"];
  delete paramsForVerify["vnp_SecureHashType"];

  const sortedParams = this.sortObject(paramsForVerify);
  const querystring = Object.keys(sortedParams)
    .sort()
    .map(key => `${key}=${sortedParams[key]}`) // ✅ KHÔNG encode
    .join("&");

  const calculatedHash = crypto
    .createHmac("sha512", this.hashSecret)
    .update(querystring)
    .digest("hex");

  return calculatedHash === vnp_SecureHash;
}
```

**Khuyến nghị:** Sửa `verifyCallback` để không encode querystring.

---

## 🔧 Các vấn đề cần sửa

### 1. **vnp_CreateDate - Đổi từ UTC sang Local Time**

```javascript
// ❌ SAI - Dùng UTC
generateCreateDate() {
  const now = new Date();
  const year = now.getUTCFullYear();
  // ...
}

// ✅ ĐÚNG - Dùng Local Time (GMT+7)
generateCreateDate() {
  const now = new Date();
  const year = now.getFullYear(); // Không dùng getUTCFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}
```

### 2. **verifyCallback - Không encode querystring**

```javascript
// ❌ SAI - Dùng URLSearchParams (sẽ encode)
const querystring = new URLSearchParams(sortedParams).toString();

// ✅ ĐÚNG - Không encode
const querystring = Object.keys(sortedParams)
  .sort()
  .map(key => `${key}=${sortedParams[key]}`)
  .join("&");
```

---

## ✅ Điểm mạnh của Implementation hiện tại

1. **IP Address Handling:** Xử lý tốt IPv6-mapped IPv4 addresses
2. **OrderInfo Sanitization:** Tự động loại bỏ ký tự đặc biệt
3. **Logging:** Logging chi tiết để debug
4. **Validation:** Validate đầy đủ các fields
5. **Error Handling:** Xử lý lỗi tốt

---

## 📝 Tóm tắt

| Tính năng | Implementation hiện tại | Thư viện chính thức | Ghi chú |
|-----------|------------------------|---------------------|---------|
| **vnp_CreateDate** | UTC time | Local time (GMT+7) | ❌ Cần sửa |
| **Signature querystring** | Raw values (không encode) | Raw values (không encode) | ✅ Đúng |
| **Payment URL** | Encode values | Encode values | ✅ Đúng |
| **IP Address** | Xử lý IPv6 prefix | Có thể không | ✅ Tốt hơn |
| **OrderInfo** | Sanitize tự động | Có thể không | ✅ Tốt hơn |
| **Verify callback** | Encode querystring | Raw values | ❌ Cần sửa |

---

## 🚀 Khuyến nghị

1. **Sửa `generateCreateDate()`:** Đổi từ UTC sang Local time
2. **Sửa `verifyCallback()`:** Không encode querystring khi verify
3. **Giữ nguyên:** IP address handling, OrderInfo sanitization, logging

---

## 📚 Tham khảo

- VNPay Official Docs: https://sandbox.vnpayment.vn/apis/
- VNPay npm package: https://www.npmjs.com/package/vnpay
- VNPay.js.org: https://vnpay.js.org/

