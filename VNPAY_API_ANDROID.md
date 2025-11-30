# 💳 API Thanh toán VNPay cho Android App

## Tổng quan

VNPay là cổng thanh toán trực tuyến phổ biến tại Việt Nam, hỗ trợ thanh toán qua thẻ ngân hàng, ví điện tử, và các phương thức khác.

---

## 📋 Cấu hình

### 1. Thêm biến môi trường vào `.env`

```env
# VNPay Payment Configuration
VNPAY_TMN_CODE=your_tmn_code
VNPAY_HASH_SECRET=your_hash_secret
VNPAY_ENDPOINT=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_IPN_URL=http://localhost:3000/api/payment/vnpay/callback
VNPAY_RETURN_URL=http://localhost:3000/api/payment/vnpay/return
VNPAY_ENV=sandbox
```

**Lưu ý:**
- `VNPAY_TMN_CODE`: Terminal Code từ VNPay
- `VNPAY_HASH_SECRET`: Secret key từ VNPay
- Đối với production, đổi:
  - `VNPAY_ENDPOINT=https://www.vnpayment.vn/paymentv2/vpcpay.html`
  - `VNPAY_ENV=production`
  - `VNPAY_IPN_URL` và `VNPAY_RETURN_URL` phải là HTTPS

---

## 🔌 API Endpoints

### 1. Tạo đơn hàng thanh toán VNPay

```
POST /api/payment/vnpay/create
Headers: 
  Authorization: Bearer {token}
  Content-Type: application/json
```

**Request Body:**
```json
{
  "shippingAddress": {
    "fullName": "Nguyễn Văn A",
    "phone": "0912345678",
    "address": "123 Đường ABC",
    "ward": "Phường 1",
    "district": "Quận 1",
    "city": "Hồ Chí Minh"
  },
  "addressId": "optional_address_id",
  "items": [
    {
      "product": "product_id",
      "quantity": 1,
      "price": 100000,
      "color": "Đỏ",
      "size": "L"
    }
  ],
  "voucherCode": "SALE10",
  "notes": "Giao hàng buổi sáng"
}
```

**Response Success:**
```json
{
  "success": true,
  "message": "Tạo đơn hàng thanh toán VNPay thành công!",
  "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...",
  "orderId": "order_id",
  "orderNumber": "ORD-20241123-120845-1234",
  "vnp_TxnRef": "1700723325000_order_id"
}
```

**Response Error:**
```json
{
  "success": false,
  "message": "Không thể tạo đơn hàng thanh toán VNPay!",
  "error": "VNPay chưa được cấu hình đầy đủ!"
}
```

---

### 2. Kiểm tra trạng thái thanh toán

```
GET /api/payment/vnpay/status/:orderId
Headers: Authorization: Bearer {token}
```

**Response:**
```json
{
  "orderId": "order_id",
  "orderNumber": "ORD-20241123-120845-1234",
  "paymentMethod": "vnpay",
  "paymentStatus": "processing",
  "status": "new",
  "total": 100000,
  "vnpayTxnRef": "1700723325000_order_id",
  "vnpayTransactionNo": "12345678"
}
```

---

## 📱 Hướng dẫn tích hợp Android

### 1. Tạo đơn hàng và mở VNPay

```kotlin
// Tạo request
data class VNPayCreateRequest(
    val shippingAddress: ShippingAddress? = null,
    val addressId: String? = null,
    val items: List<CartItem>,
    val voucherCode: String? = null,
    val notes: String? = null
)

// Gọi API
suspend fun createVNPayOrder(request: VNPayCreateRequest): Result<VNPayResponse> {
    return try {
        val response = apiService.createVNPayOrder(
            token = "Bearer $token",
            request = request
        )
        if (response.success) {
            Result.success(response)
        } else {
            Result.failure(Exception(response.message))
        }
    } catch (e: Exception) {
        Result.failure(e)
    }
}

// Sử dụng
val request = VNPayCreateRequest(
    shippingAddress = shippingAddress,
    items = cartItems,
    voucherCode = voucherCode
)

when (val result = createVNPayOrder(request)) {
    is Result.Success -> {
        val paymentUrl = result.data.paymentUrl
        // Mở WebView hoặc Browser để thanh toán
        openPaymentUrl(paymentUrl)
    }
    is Result.Failure -> {
        // Xử lý lỗi
        showError(result.exception.message)
    }
}
```

### 2. Mở WebView để thanh toán

```kotlin
// Activity/Fragment
private fun openPaymentUrl(url: String) {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
    startActivity(intent)
    
    // Hoặc sử dụng WebView trong app
    val webView = WebView(context)
    webView.settings.javaScriptEnabled = true
    webView.webViewClient = object : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
            // Kiểm tra nếu URL là return URL của VNPay
            if (url?.contains("/api/payment/vnpay/return") == true) {
                // Parse kết quả thanh toán
                handlePaymentResult(url)
                return true
            }
            return false
        }
    }
    webView.loadUrl(url)
}

private fun handlePaymentResult(returnUrl: String) {
    val uri = Uri.parse(returnUrl)
    val vnp_ResponseCode = uri.getQueryParameter("vnp_ResponseCode")
    val vnp_TransactionStatus = uri.getQueryParameter("vnp_TransactionStatus")
    val vnp_TxnRef = uri.getQueryParameter("vnp_TxnRef")
    
    if (vnp_ResponseCode == "00" && vnp_TransactionStatus == "00") {
        // Thanh toán thành công
        showSuccess("Thanh toán thành công!")
        // Kiểm tra lại trạng thái đơn hàng
        checkOrderStatus(orderId)
    } else {
        // Thanh toán thất bại
        showError("Thanh toán thất bại. Mã lỗi: $vnp_ResponseCode")
    }
}
```

### 3. Polling để kiểm tra trạng thái

```kotlin
// Kiểm tra trạng thái đơn hàng sau khi thanh toán
suspend fun checkOrderStatus(orderId: String): OrderStatus {
    return try {
        val response = apiService.getVNPayOrderStatus(
            token = "Bearer $token",
            orderId = orderId
        )
        response
    } catch (e: Exception) {
        // Xử lý lỗi
        null
    }
}

// Polling mỗi 2 giây, tối đa 30 giây
fun pollOrderStatus(orderId: String) {
    var attempts = 0
    val maxAttempts = 15
    
    val handler = Handler(Looper.getMainLooper())
    val runnable = object : Runnable {
        override fun run() {
            if (attempts >= maxAttempts) {
                // Timeout
                showError("Hết thời gian chờ thanh toán")
                return
            }
            
            lifecycleScope.launch {
                val status = checkOrderStatus(orderId)
                when (status?.paymentStatus) {
                    "success" -> {
                        // Thanh toán thành công
                        showSuccess("Thanh toán thành công!")
                        // Dừng polling
                        handler.removeCallbacks(this@Runnable)
                    }
                    "failed" -> {
                        // Thanh toán thất bại
                        showError("Thanh toán thất bại")
                        handler.removeCallbacks(this@Runnable)
                    }
                    else -> {
                        // Tiếp tục polling
                        attempts++
                        handler.postDelayed(this@Runnable, 2000)
                    }
                }
            }
        }
    }
    
    handler.postDelayed(runnable, 2000)
}
```

---

## 🔄 Flow thanh toán

1. **Client gọi API** `/api/payment/vnpay/create`
2. **Server tạo order** và trả về `paymentUrl`
3. **Client mở WebView/Browser** với `paymentUrl`
4. **User thanh toán** trên trang VNPay
5. **VNPay redirect** về `VNPAY_RETURN_URL` (web) hoặc gọi callback (mobile)
6. **Client kiểm tra kết quả** từ return URL hoặc polling status
7. **VNPay gọi IPN** `/api/payment/vnpay/callback` để xác nhận (server tự xử lý)

---

## ⚠️ Lưu ý quan trọng

### 1. Địa chỉ giao hàng

- Có thể dùng `addressId` (địa chỉ đã lưu) hoặc `shippingAddress` (object địa chỉ mới)
- Backend sẽ tự động normalize và validate địa chỉ
- Xem thêm: `ADDRESS_API_ANDROID.md`

### 2. Voucher

- Có thể áp dụng voucher bằng `voucherCode`
- Voucher sẽ được validate trước khi tạo đơn hàng
- Nếu voucher không hợp lệ, API sẽ trả về lỗi

### 3. Error Handling

- Luôn kiểm tra `success` field trong response
- Xử lý các lỗi phổ biến:
  - `"VNPay chưa được cấu hình đầy đủ!"` → Kiểm tra biến môi trường
  - `"Địa chỉ không hợp lệ!"` → Kiểm tra lại thông tin địa chỉ
  - `"Giỏ hàng trống!"` → Thêm sản phẩm vào giỏ hàng

### 4. Security

- Luôn sử dụng HTTPS trong production
- Không lưu `VNPAY_HASH_SECRET` trên client
- Verify signature từ VNPay callback (server tự xử lý)

---

## 📝 Ví dụ Request hoàn chỉnh

### Tạo đơn hàng với địa chỉ mới

```json
POST /api/payment/vnpay/create
{
  "shippingAddress": {
    "fullName": "Trần Văn B",
    "phone": "0987654321",
    "address": "456 Đường XYZ",
    "ward": "Phường 2",
    "district": "Quận 2",
    "city": "Hồ Chí Minh"
  },
  "items": [
    {
      "product": "60f7b3c4e5d6a7b8c9d0e1f2",
      "quantity": 2,
      "price": 500000,
      "color": "Đen",
      "size": "M"
    }
  ],
  "voucherCode": "SALE10",
  "notes": "Giao hàng trước 17h"
}
```

### Tạo đơn hàng với địa chỉ đã lưu

```json
POST /api/payment/vnpay/create
{
  "addressId": "60f7b3c4e5d6a7b8c9d0e1f2",
  "items": [
    {
      "product": "60f7b3c4e5d6a7b8c9d0e1f2",
      "quantity": 1,
      "price": 100000
    }
  ]
}
```

---

## 🔍 Debug

### Log trên Server

- `📍 VNPay: Lấy địa chỉ từ ID:` - Khi dùng addressId
- `✅ VNPay: Địa chỉ đã được normalize:` - Khi địa chỉ đã được xử lý
- `📥 VNPay IPN callback received:` - Khi nhận callback từ VNPay
- `✅ Payment successful, processing...` - Khi thanh toán thành công

### Kiểm tra trên Android

1. **Kiểm tra paymentUrl:**
   ```kotlin
   Log.d("VNPay", "Payment URL: $paymentUrl")
   ```

2. **Kiểm tra return URL:**
   ```kotlin
   Log.d("VNPay", "Return URL: $returnUrl")
   Log.d("VNPay", "Response Code: $vnp_ResponseCode")
   Log.d("VNPay", "Transaction Status: $vnp_TransactionStatus")
   ```

3. **Kiểm tra order status:**
   ```kotlin
   Log.d("VNPay", "Payment Status: ${order.paymentStatus}")
   Log.d("VNPay", "VNPay TxnRef: ${order.vnpayTxnRef}")
   ```

---

## 📞 Hỗ trợ

Nếu gặp vấn đề, vui lòng kiểm tra:

1. **Cấu hình .env** - Đảm bảo đã cấu hình đầy đủ VNPay
2. **Token authentication** - Đảm bảo token hợp lệ
3. **Log trên server** - Xem chi tiết lỗi
4. **VNPay Sandbox** - Test trong môi trường sandbox trước

---

## 📚 Tài liệu tham khảo

- VNPay Developer Portal: https://sandbox.vnpayment.vn/apis/
- VNPay API Documentation: https://sandbox.vnpayment.vn/apis/docs/

