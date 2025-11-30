# Hướng dẫn Test ZaloPay Sandbox - Không cần CCCD thật

## ⚠️ Vấn đề: ZaloPay Sandbox yêu cầu CCCD khi chọn ngân hàng

Khi test thanh toán ZaloPay trong môi trường **sandbox**, nếu bạn chọn phương thức thanh toán qua **ngân hàng**, ZaloPay sẽ yêu cầu nhập **CCCD (Căn cước công dân)** để xác thực. Đây là quy trình mô phỏng giống như môi trường production.

---

## ✅ Giải pháp: Các cách test ZaloPay Sandbox

### **Cách 1: Sử dụng Ví ZaloPay (Khuyến nghị) ⭐**

**Ưu điểm:** Không cần CCCD ngân hàng, nhưng vẫn cần xác thực tài khoản ZaloPay

**Cách làm:**
1. Khi màn hình ZaloPay hiển thị, **KHÔNG chọn ngân hàng**
2. Chọn **"Ví ZaloPay"** hoặc **"ZaloPay Wallet"**
3. **Nhấn nút "Xác thực"** nếu tài khoản chưa được xác thực
4. Xác thực tài khoản ZaloPay (có thể yêu cầu số điện thoại, email, hoặc thông tin cơ bản)
5. Sau khi xác thực, đăng nhập bằng tài khoản ZaloPay
6. Thanh toán trực tiếp từ ví (trong sandbox, có thể dùng số tiền test)

**Lưu ý:**
- **Ví ZaloPay vẫn yêu cầu xác thực tài khoản** (không phải CCCD ngân hàng, nhưng vẫn cần xác thực ZaloPay account)
- Trong sandbox, ZaloPay có thể cho phép thanh toán với số tiền test mà không cần nạp tiền thật
- Nếu cần nạp tiền test, liên hệ ZaloPay support để được cấp số tiền test
- Xác thực ZaloPay thường đơn giản hơn xác thực ngân hàng (chỉ cần số điện thoại/email, không cần CCCD)

---

### **Cách 2: Sử dụng Test Account với CCCD Test**

**Cách làm:**
1. Đăng ký tài khoản ZaloPay sandbox test
2. Liên hệ ZaloPay Developer Support để được cấp:
   - Test account
   - Số CCCD test (ví dụ: `001234567890`)
   - Thông tin ngân hàng test
3. Sử dụng thông tin test này để xác thực khi chọn ngân hàng

**Liên hệ ZaloPay:**
- Email: support@zalopay.vn
- Developer Portal: https://developers.zalopay.vn/
- Hotline: 1900-xxxx (kiểm tra trên website ZaloPay)

---

### **Cách 3: Bỏ qua bước thanh toán thật (Chỉ test flow)**

**Cách làm:**
1. Test flow tạo đơn hàng ZaloPay (gọi API `/zalopay/create`)
2. Kiểm tra response có `zp_trans_token` và `order_url`
3. **KHÔNG** mở ZaloPay SDK/URL để thanh toán thật
4. Test callback bằng cách gọi trực tiếp API callback endpoint

**Ví dụ test callback thủ công:**

```bash
# Test callback endpoint
curl -X POST http://localhost:3000/api/payment/zalopay/callback \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "app_id": "your_app_id",
      "app_trans_id": "test_trans_id",
      "pmcid": "test_pmcid",
      "bankcode": "test_bank",
      "amount": 100000,
      "discount_amount": 0,
      "status": 1
    },
    "mac": "test_mac_signature"
  }'
```

**Lưu ý:** Cần tính đúng MAC signature với `key2` để callback được xác thực.

---

### **Cách 4: Sử dụng ZaloPay Test Cards (Nếu có)**

Một số môi trường sandbox cung cấp test cards để test thanh toán ngân hàng mà không cần CCCD. Kiểm tra trong ZaloPay Developer Portal xem có cung cấp test cards không.

---

## 🔧 Cấu hình Sandbox

### Kiểm tra cấu hình hiện tại

File `.env` của bạn nên có:

```env
# ZaloPay Sandbox Configuration
ZALOPAY_APP_ID=your_sandbox_app_id
ZALOPAY_KEY1=your_sandbox_key1
ZALOPAY_KEY2=your_sandbox_key2
ZALOPAY_ENDPOINT=https://sb-openapi.zalopay.vn/v2/create
ZALOPAY_CALLBACK_URL=http://localhost:3000/api/payment/zalopay/callback
ZALOPAY_ENV=sandbox
```

**Lưu ý:**
- Endpoint sandbox: `https://sb-openapi.zalopay.vn/v2/create`
- Endpoint production: `https://openapi.zalopay.vn/v2/create`
- Callback URL trong sandbox có thể dùng `http://localhost` (không cần HTTPS)

---

## 📱 Hướng dẫn cho Android App

### Option 1: Chỉ test với Ví ZaloPay

Trong Android app, khi mở ZaloPay SDK, hướng dẫn user:
1. Chọn **"Ví ZaloPay"** thay vì chọn ngân hàng
2. **Nhấn nút "Xác thực"** nếu tài khoản chưa được xác thực (sẽ thấy thông báo "Cần xác thực")
3. Hoàn tất xác thực tài khoản ZaloPay (số điện thoại/email)
4. Đăng nhập bằng tài khoản ZaloPay đã xác thực
5. Thanh toán từ ví

**Lưu ý:** Xác thực Ví ZaloPay đơn giản hơn xác thực ngân hàng (không cần CCCD, chỉ cần số điện thoại/email)

**Code example:**

```kotlin
// Mở ZaloPay SDK
ZaloPaySDK.getInstance().payOrder(
    this,
    zpTransToken,
    "demozpdk://app", // Deep link để quay lại app
    object : ZaloPayPaymentListener {
        override fun onPaymentSucceeded(transactionId: String, transToken: String) {
            // Thanh toán thành công
            Log.d(TAG, "Payment succeeded: $transactionId")
            // Query order status từ server
            checkOrderStatus(orderId)
        }
        
        override fun onPaymentCanceled(zpTransToken: String, appTransId: String) {
            // User hủy thanh toán
            Log.d(TAG, "Payment canceled")
        }
        
        override fun onPaymentError(zpTransToken: String, appTransId: String, errorCode: Int, errorMessage: String) {
            // Lỗi thanh toán
            Log.e(TAG, "Payment error: $errorCode - $errorMessage")
        }
    }
)
```

### Option 2: Test với WebView (cho development)

Thay vì mở ZaloPay SDK, có thể mở `order_url` trong WebView để test:

```kotlin
// Mở order_url trong WebView
val webView = WebView(this)
webView.settings.javaScriptEnabled = true
webView.loadUrl(orderUrl)

// Hoặc mở trong browser
val intent = Intent(Intent.ACTION_VIEW, Uri.parse(orderUrl))
startActivity(intent)
```

**Lưu ý:** Trong WebView, user vẫn sẽ gặp yêu cầu CCCD nếu chọn ngân hàng.

---

## 🧪 Test Flow Hoàn Chỉnh (Không cần thanh toán thật)

### Bước 1: Tạo đơn hàng ZaloPay

```bash
POST /api/payment/zalopay/create
Authorization: Bearer {token}
Content-Type: application/json

{
  "shippingAddress": {
    "fullName": "Test User",
    "phone": "0123456789",
    "address": "123 Test Street"
  },
  "items": [
    {
      "product": "product_id",
      "quantity": 1,
      "price": 100000
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "zp_trans_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "order_url": "https://sb-openapi.zalopay.vn/pay/...",
  "orderId": "507f1f77bcf86cd799439011",
  "orderNumber": "ORD-20250123-143022-1234"
}
```

### Bước 2: Kiểm tra Order Status (Không thanh toán)

```bash
GET /api/payment/zalopay/status/{orderId}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "orderId": "507f1f77bcf86cd799439011",
    "paymentStatus": "processing",
    "status": "new"
  }
}
```

### Bước 3: Test Callback (Thủ công)

Tạo script test callback:

```javascript
// test_zalopay_callback.js
const axios = require('axios');
const crypto = require('crypto');

const key2 = process.env.ZALOPAY_KEY2;
const appId = process.env.ZALOPAY_APP_ID;
const appTransId = 'test_trans_id_123';

// Tạo MAC signature cho callback
const macString = `${appId}|${appTransId}|test_pmcid|test_bank|100000|0|1`;
const mac = crypto.createHmac('sha256', key2).update(macString).digest('hex');

// Gọi callback endpoint
axios.post('http://localhost:3000/api/payment/zalopay/callback', {
  data: {
    app_id: appId,
    app_trans_id: appTransId,
    pmcid: 'test_pmcid',
    bankcode: 'test_bank',
    amount: 100000,
    discount_amount: 0,
    status: 1
  },
  mac: mac
}).then(response => {
  console.log('Callback success:', response.data);
}).catch(error => {
  console.error('Callback error:', error.response?.data || error.message);
});
```

Chạy script:
```bash
node test_zalopay_callback.js
```

---

## 📋 Checklist Test ZaloPay Sandbox

- [ ] Đã cấu hình `.env` với sandbox credentials
- [ ] Đã test API `/zalopay/create` và nhận được `zp_trans_token`
- [ ] Đã test mở ZaloPay SDK/URL (chọn Ví ZaloPay thay vì ngân hàng)
- [ ] Đã test callback endpoint (thủ công hoặc từ ZaloPay)
- [ ] Đã test query order status
- [ ] Đã kiểm tra order được cập nhật đúng trong database

---

## ❓ FAQ

### Q: Tại sao ZaloPay sandbox yêu cầu CCCD?

**A:** ZaloPay sandbox mô phỏng quy trình thanh toán thật, bao gồm cả bước xác thực ngân hàng. Khi chọn thanh toán qua ngân hàng, hệ thống yêu cầu CCCD để xác thực giống như production.

### Q: Có cách nào bỏ qua bước CCCD trong sandbox không?

**A:** Không có cách bỏ qua. Nhưng bạn có thể:
- Sử dụng Ví ZaloPay thay vì ngân hàng (không cần CCCD)
- Liên hệ ZaloPay để được cấp test account với CCCD test
- Chỉ test flow API mà không thanh toán thật

### Q: Khi nào cần test với ngân hàng thật?

**A:** Chỉ khi:
- Đã test đầy đủ flow với Ví ZaloPay
- Sắp deploy lên production
- Cần test integration với ngân hàng cụ thể

### Q: Sandbox có giới hạn số lần test không?

**A:** Tùy theo gói sandbox của bạn. Kiểm tra trong ZaloPay Developer Portal hoặc liên hệ support.

---

## 🔗 Tài liệu tham khảo

- ZaloPay Developer Portal: https://developers.zalopay.vn/
- ZaloPay Sandbox Documentation: https://developers.zalopay.vn/docs/sandbox
- ZaloPay Support: support@zalopay.vn

---

## 💡 Khuyến nghị

**Cho Development/Testing:**
- ✅ Sử dụng **Ví ZaloPay** để test nhanh
- ✅ Test callback thủ công để verify logic
- ✅ Chỉ test với ngân hàng khi cần thiết

**Cho Production:**
- ✅ Đảm bảo đã test đầy đủ flow
- ✅ Cấu hình đúng production credentials
- ✅ Test với số tiền nhỏ trước
- ✅ Monitor logs và callback để đảm bảo hoạt động đúng

