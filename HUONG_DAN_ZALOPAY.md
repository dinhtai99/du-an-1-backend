# Hướng dẫn tích hợp thanh toán ZaloPay

## 📋 Tổng quan

Hệ thống đã được tích hợp thanh toán ZaloPay theo mô hình App-to-App. Khách hàng có thể thanh toán đơn hàng qua ZaloPay từ ứng dụng Merchant.

## 🔧 Cấu hình

### 1. Thiết lập biến môi trường

Thêm các biến sau vào file `.env`:

```env
# ZaloPay Configuration
ZALOPAY_APP_ID=your_app_id
ZALOPAY_KEY1=your_key1
ZALOPAY_KEY2=your_key2
ZALOPAY_ENDPOINT=https://sb-openapi.zalopay.vn/v2/create  # Sandbox
# ZALOPAY_ENDPOINT=https://openapi.zalopay.vn/v2/create   # Production
ZALOPAY_CALLBACK_URL=http://localhost:3000/api/payment/zalopay/callback
ZALOPAY_ENV=sandbox  # sandbox hoặc production
```

### 2. Lấy thông tin từ ZaloPay

1. Đăng ký tài khoản ZaloPay Merchant tại: https://developers.zalopay.vn/
2. Tạo App và lấy:
   - `App ID`
   - `Key1` (dùng để tạo MAC khi gọi API)
   - `Key2` (dùng để verify MAC từ callback)
3. Cấu hình Callback URL trong ZaloPay Dashboard

## 🔄 Flow thanh toán ZaloPay

### Bước 1: End-user chọn ZaloPay
- User chọn phương thức thanh toán "ZaloPay" trên app Merchant

### Bước 2: Merchant gửi yêu cầu tạo đơn thanh toán
- App gọi API: `POST /api/payment/zalopay/create`
- Server gửi request đến ZaloPay API
- ZaloPay trả về `zp_trans_token`

### Bước 3: App Merchant gọi SDK ZaloPay
- App sử dụng `zp_trans_token` để mở ZaloPay app
- SDK sẽ mở app ZaloPay/Zalo để user thanh toán
- Nếu chưa có app, SDK redirect đến App Store/Google Play

### Bước 4: ZaloPay callback
- Sau khi user thanh toán, ZaloPay gọi callback URL
- Server xác thực và cập nhật trạng thái đơn hàng
- ZaloPay app mở lại app Merchant để hiển thị kết quả

## 📡 API Endpoints

### 1. Tạo đơn hàng thanh toán ZaloPay

**Endpoint:** `POST /api/payment/zalopay/create`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "shippingAddress": {
    "fullName": "Nguyễn Văn A",
    "phone": "0987654321",
    "address": "123 Đường ABC",
    "ward": "Phường XYZ",
    "district": "Quận 1",
    "city": "Hồ Chí Minh"
  },
  "notes": "Giao hàng giờ hành chính",
  "voucherCode": "VOUCHER123" // optional
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Tạo đơn hàng thanh toán ZaloPay thành công!",
  "zp_trans_token": "abc123xyz...",
  "order_url": "https://zalopay.vn/pay/...",
  "order_token": "token123...",
  "orderId": "670f89871234567890123456",
  "orderNumber": "DH202412010001"
}
```

**Response (Error):**
```json
{
  "message": "Không thể tạo đơn hàng thanh toán ZaloPay!",
  "error": "Lỗi từ ZaloPay API"
}
```

### 2. Callback từ ZaloPay (Webhook)

**Endpoint:** `POST /api/payment/zalopay/callback`

**Note:** Endpoint này được ZaloPay gọi tự động, không cần gọi từ client.

**Request Body (từ ZaloPay):**
```json
{
  "data": {
    "app_trans_id": "241201_1234567890",
    "zp_trans_id": "230117000001",
    "amount": 450000,
    "timestamp": 1705392866000,
    "status": 1,
    "embed_data": "{\"orderId\":\"670f89871234567890123456\"}"
  },
  "mac": "abc123..."
}
```

**Response:**
```json
{
  "return_code": 1,
  "return_message": "OK"
}
```

### 3. Kiểm tra trạng thái thanh toán

**Endpoint:** `GET /api/payment/zalopay/status/:orderId`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "orderId": "670f89871234567890123456",
  "orderNumber": "DH202412010001",
  "paymentMethod": "zalopay",
  "paymentStatus": "success", // pending, processing, success, failed
  "status": "new",
  "total": 450000,
  "zalopayTransToken": "abc123xyz..."
}
```

## 📱 Tích hợp SDK ZaloPay (Mobile App)

### iOS (Swift)

```swift
import ZaloPaySDK

// Sau khi nhận zp_trans_token từ API
let transToken = response["zp_trans_token"] as! String

ZaloPaySDK.sharedInstance()?.payOrder(transToken, 
    uriScheme: "your-app-scheme",
    appBackAction: { (response) in
        // Xử lý kết quả
        if response?.returnCode == 1 {
            // Thanh toán thành công
        } else {
            // Thanh toán thất bại
        }
    })
```

### Android (Kotlin/Java)

```kotlin
import vn.zalopay.sdk.ZaloPaySDK

// Sau khi nhận zp_trans_token từ API
val transToken = response.getString("zp_trans_token")

ZaloPaySDK.getInstance().payOrder(
    activity,
    transToken,
    "your-app-scheme",
    object : ZalopayPaymentListener {
        override fun onPaymentSucceeded(transactionId: String?, transToken: String?) {
            // Thanh toán thành công
        }
        
        override fun onPaymentCanceled(zpTransToken: String?, appTransID: String?) {
            // User hủy thanh toán
        }
        
        override fun onPaymentError(zpTransToken: String?, appTransID: String?, errorCode: Int) {
            // Lỗi thanh toán
        }
    }
)
```

### React Native / Web

```javascript
// Mở ZaloPay app hoặc redirect đến ZaloPay website
const handleZaloPayPayment = async (zpTransToken) => {
  try {
    // iOS: Sử dụng Linking để mở ZaloPay app
    const url = `zalopay://pay?token=${zpTransToken}`;
    const canOpen = await Linking.canOpenURL(url);
    
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      // Fallback: Mở App Store hoặc ZaloPay web
      await Linking.openURL('https://zalopay.vn');
    }
  } catch (error) {
    console.error('Error opening ZaloPay:', error);
  }
};
```

## 📊 Trạng thái thanh toán

| paymentStatus | Mô tả |
|---------------|-------|
| `pending` | Chờ thanh toán |
| `processing` | Đang xử lý thanh toán (đã gọi ZaloPay API) |
| `success` | Thanh toán thành công |
| `failed` | Thanh toán thất bại |
| `cancelled` | Đã hủy thanh toán |

## 🔍 Xử lý kết quả thanh toán

### Sau khi user thanh toán trên ZaloPay app:

1. **ZaloPay app sẽ mở lại app Merchant** với deep link hoặc URL scheme
2. **App Merchant nên kiểm tra trạng thái** bằng cách gọi:
   ```
   GET /api/payment/zalopay/status/:orderId
   ```
3. **Hiển thị kết quả** cho user dựa trên `paymentStatus`

### Ví dụ xử lý deep link (React Native):

```javascript
// Trong App.js hoặc component chính
useEffect(() => {
  // Xử lý deep link khi app mở lại từ ZaloPay
  Linking.addEventListener('url', handleDeepLink);
  
  return () => {
    Linking.removeEventListener('url', handleDeepLink);
  };
}, []);

const handleDeepLink = async (event) => {
  const { url } = event;
  
  // Parse URL để lấy orderId
  if (url.includes('zalopay://payment')) {
    const orderId = extractOrderIdFromUrl(url);
    
    // Kiểm tra trạng thái thanh toán
    const response = await fetch(`/api/payment/zalopay/status/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const result = await response.json();
    
    if (result.paymentStatus === 'success') {
      // Hiển thị màn hình thành công
      navigate('/order-success', { orderId });
    } else {
      // Hiển thị màn hình thất bại
      navigate('/order-failed', { orderId });
    }
  }
};
```

## 🐛 Troubleshooting

### Lỗi "MAC không hợp lệ"
- Kiểm tra `ZALOPAY_KEY1` và `ZALOPAY_KEY2` trong `.env`
- Đảm bảo format MAC đúng theo ZaloPay specification

### Lỗi "Không tìm thấy đơn hàng" trong callback
- Kiểm tra `embed_data` có chứa `orderId`
- Kiểm tra `app_trans_id` format: `YYMMDD_orderId`

### Thanh toán thành công nhưng không cập nhật order
- Kiểm tra callback URL có được ZaloPay gọi đến không
- Kiểm tra logs server để xem có nhận được callback
- Verify MAC có đúng không

## 📝 Lưu ý

1. **Sandbox vs Production:**
   - Sandbox: Sử dụng test account và test cards
   - Production: Cần verify merchant account với ZaloPay

2. **Callback URL:**
   - Phải là HTTPS trong production
   - URL phải accessible từ internet (không dùng localhost)

3. **Idempotency:**
   - Callback có thể được gọi nhiều lần
   - Code đã xử lý để tránh cập nhật trùng lặp

4. **Bảo mật:**
   - Không expose `ZALOPAY_KEY1` và `ZALOPAY_KEY2` trong client code
   - Luôn verify MAC trong callback

## 🔗 Tài liệu tham khảo

- ZaloPay Developer Portal: https://developers.zalopay.vn/
- ZaloPay API Documentation: https://developers.zalopay.vn/v2/docs/
- ZaloPay SDK: https://developers.zalopay.vn/v2/docs/sdk/

