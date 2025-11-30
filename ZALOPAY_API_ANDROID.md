# 💳 API Thanh toán ZaloPay cho Android App

## Tổng quan

API thanh toán ZaloPay cho phép khách hàng thanh toán đơn hàng qua ZaloPay. Quy trình gồm các bước:
1. **Tạo đơn hàng thanh toán** - Gọi API để tạo đơn hàng và nhận `zp_trans_token`
2. **Mở ZaloPay SDK** - Sử dụng `zp_trans_token` để mở ZaloPay app và thanh toán
3. **Kiểm tra trạng thái** - Polling hoặc nhận callback để kiểm tra kết quả thanh toán

---

## 📍 Bước 1: Tạo đơn hàng thanh toán ZaloPay

### Endpoint

```
POST /api/payment/zalopay/create
Authorization: Bearer <customer_token>
Content-Type: application/json
```

### Request Body

```json
{
  "shippingAddress": {
    "fullName": "Nguyễn Văn A",
    "phone": "0987654321",
    "address": "123 Đường ABC",
    "ward": "Phường 1",
    "district": "Quận 1",
    "city": "Hồ Chí Minh"
  },
  "addressId": "60f1b2b3c4d5e6f7g8h9i0j1",  // Hoặc dùng addressId thay vì shippingAddress
  "items": [
    {
      "product": "60f1b2b3c4d5e6f7g8h9i0j1",
      "quantity": 2,
      "color": "Đỏ",
      "size": "L",
      "price": 500000
    }
  ],
  "voucherCode": "GIAM50",  // Optional
  "notes": "Giao hàng vào buổi sáng"  // Optional
}
```

**Lưu ý:**
- Có thể dùng `addressId` (ID địa chỉ đã lưu) hoặc `shippingAddress` (object địa chỉ mới)
- `items` là mảng sản phẩm từ giỏ hàng
- Nếu không có `items`, hệ thống sẽ lấy từ giỏ hàng trong database (web app)

### Response Thành công

```json
{
  "success": true,
  "message": "Tạo đơn hàng thanh toán ZaloPay thành công!",
  "zp_trans_token": "abc123xyz...",
  "order_url": "https://zalopay.vn/pay/...",
  "order_token": "token123...",
  "orderId": "60f1b2b3c4d5e6f7g8h9i0j1",
  "orderNumber": "ORD-20241123-143025-1234"
}
```

### Error Responses

#### 1. Thiếu địa chỉ

```json
{
  "message": "Vui lòng cung cấp địa chỉ giao hàng! (addressId hoặc shippingAddress object)"
}
```
**Status Code:** 400

#### 2. Giỏ hàng trống

```json
{
  "message": "Giỏ hàng trống!"
}
```
**Status Code:** 400

#### 3. Sản phẩm hết hàng

```json
{
  "message": "Sản phẩm Áo thun chỉ còn 5 sản phẩm trong kho!"
}
```
**Status Code:** 400

#### 4. Voucher không hợp lệ

```json
{
  "message": "Mã voucher không tồn tại!"
}
```
**Status Code:** 400

#### 5. Không thể tạo đơn thanh toán ZaloPay

```json
{
  "message": "Không thể tạo đơn hàng thanh toán ZaloPay!",
  "error": "Lỗi từ ZaloPay API",
  "return_code": -1
}
```
**Status Code:** 400

---

## 📍 Bước 2: Mở ZaloPay SDK để thanh toán

Sau khi nhận được `zp_trans_token`, sử dụng ZaloPay SDK để mở app và thanh toán.

### Cài đặt ZaloPay SDK

Thêm vào `build.gradle` (Module: app):

```gradle
dependencies {
    implementation 'com.zalopay.sdk:zalopay-sdk:1.0.0'
}
```

### Sử dụng ZaloPay SDK

```kotlin
import com.zalopay.sdk.ZaloPaySDK
import com.zalopay.sdk.enums.ZaloPayEnvironment

class ZaloPayActivity : AppCompatActivity() {
    private lateinit var binding: ActivityZalopayBinding
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityZalopayBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        // Khởi tạo ZaloPay SDK
        ZaloPaySDK.init(
            appId = "YOUR_APP_ID", // Lấy từ backend hoặc config
            environment = ZaloPayEnvironment.SANDBOX // hoặc PRODUCTION
        )
        
        // Lắng nghe kết quả thanh toán
        ZaloPaySDK.getInstance().setPaymentListener(object : ZaloPayPaymentListener {
            override fun onPaymentSuccess(transactionId: String, transToken: String) {
                // Thanh toán thành công
                checkPaymentStatus(orderId)
            }
            
            override fun onPaymentError(zpTransToken: String, errorCode: Int, errorMessage: String) {
                // Thanh toán thất bại
                Toast.makeText(this@ZaloPayActivity, "Thanh toán thất bại: $errorMessage", Toast.LENGTH_SHORT).show()
            }
            
            override fun onPaymentCancel(zpTransToken: String) {
                // User hủy thanh toán
                Toast.makeText(this@ZaloPayActivity, "Đã hủy thanh toán", Toast.LENGTH_SHORT).show()
            }
        })
    }
    
    private fun payWithZaloPay(zpTransToken: String) {
        // Mở ZaloPay app để thanh toán
        ZaloPaySDK.getInstance().payOrder(this, zpTransToken)
    }
}
```

### Alternative: Mở ZaloPay qua Intent (nếu không có SDK)

```kotlin
private fun openZaloPayApp(zpTransToken: String) {
    try {
        // Thử mở ZaloPay app
        val intent = packageManager.getLaunchIntentForPackage("com.zing.zalo")
        if (intent != null) {
            intent.putExtra("zp_trans_token", zpTransToken)
            startActivity(intent)
        } else {
            // Nếu không có app, mở web
            val orderUrl = "https://zalopay.vn/pay?token=$zpTransToken"
            val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(orderUrl))
            startActivity(browserIntent)
        }
    } catch (e: Exception) {
        // Fallback: mở web
        val orderUrl = "https://zalopay.vn/pay?token=$zpTransToken"
        val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(orderUrl))
        startActivity(browserIntent)
    }
}
```

---

## 📍 Bước 3: Kiểm tra trạng thái thanh toán

### Endpoint

```
GET /api/payment/zalopay/status/:orderId
Authorization: Bearer <customer_token>
```

### Response

```json
{
  "orderId": "60f1b2b3c4d5e6f7g8h9i0j1",
  "orderNumber": "ORD-20241123-143025-1234",
  "paymentMethod": "zalopay",
  "paymentStatus": "success",  // pending, processing, success, failed
  "status": "processing",  // new, processing, shipped, delivered, cancelled
  "total": 500000,
  "zalopayTransToken": "abc123xyz..."
}
```

### Payment Status Values

- `pending`: Chưa thanh toán
- `processing`: Đang xử lý thanh toán
- `success`: Thanh toán thành công
- `failed`: Thanh toán thất bại

---

## 📱 Ví dụ sử dụng trong Android (Kotlin)

### 1. Data Classes

```kotlin
data class ZaloPayCreateRequest(
    val shippingAddress: ShippingAddress? = null,
    val addressId: String? = null,
    val items: List<CartItem>? = null,
    val voucherCode: String? = null,
    val notes: String? = null
)

data class ShippingAddress(
    val fullName: String,
    val phone: String,
    val address: String,
    val ward: String? = null,
    val district: String? = null,
    val city: String
)

data class CartItem(
    val product: String,  // Product ID
    val quantity: Int,
    val color: String? = null,
    val size: String? = null,
    val price: Double
)

data class ZaloPayCreateResponse(
    val success: Boolean,
    val message: String,
    val zp_trans_token: String,
    val order_url: String? = null,
    val order_token: String? = null,
    val orderId: String,
    val orderNumber: String
)

data class ZaloPayStatusResponse(
    val orderId: String,
    val orderNumber: String,
    val paymentMethod: String,
    val paymentStatus: String,
    val status: String,
    val total: Double,
    val zalopayTransToken: String? = null
)
```

### 2. API Service

```kotlin
suspend fun createZaloPayOrder(
    request: ZaloPayCreateRequest
): Result<ZaloPayCreateResponse> {
    return try {
        val response = httpClient.post("${API_BASE}/payment/zalopay/create") {
            headers {
                append("Authorization", "Bearer ${getToken()}")
                append("Content-Type", "application/json")
            }
            setBody(json.encodeToString(ZaloPayCreateRequest.serializer(), request))
        }
        
        if (response.status.isSuccess()) {
            val result = json.decodeFromString<ZaloPayCreateResponse>(response.bodyAsText())
            Result.success(result)
        } else {
            val error = json.decodeFromString<ErrorResponse>(response.bodyAsText())
            Result.failure(Exception(error.message))
        }
    } catch (e: Exception) {
        Result.failure(e)
    }
}

suspend fun checkZaloPayStatus(orderId: String): Result<ZaloPayStatusResponse> {
    return try {
        val response = httpClient.get("${API_BASE}/payment/zalopay/status/$orderId") {
            headers {
                append("Authorization", "Bearer ${getToken()}")
            }
        }
        
        if (response.status.isSuccess()) {
            val result = json.decodeFromString<ZaloPayStatusResponse>(response.bodyAsText())
            Result.success(result)
        } else {
            val error = json.decodeFromString<ErrorResponse>(response.bodyAsText())
            Result.failure(Exception(error.message))
        }
    } catch (e: Exception) {
        Result.failure(e)
    }
}
```

### 3. Checkout Activity

```kotlin
class CheckoutActivity : AppCompatActivity() {
    private lateinit var binding: ActivityCheckoutBinding
    private var selectedAddress: Address? = null
    private var cartItems: List<CartItem> = emptyList()
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCheckoutBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        loadCartItems()
        setupViews()
    }
    
    private fun setupViews() {
        binding.btnPayZaloPay.setOnClickListener {
            payWithZaloPay()
        }
    }
    
    private fun payWithZaloPay() {
        if (selectedAddress == null) {
            Toast.makeText(this, "Vui lòng chọn địa chỉ giao hàng!", Toast.LENGTH_SHORT).show()
            return
        }
        
        if (cartItems.isEmpty()) {
            Toast.makeText(this, "Giỏ hàng trống!", Toast.LENGTH_SHORT).show()
            return
        }
        
        // Show loading
        binding.progressBar.visibility = View.VISIBLE
        binding.btnPayZaloPay.isEnabled = false
        
        lifecycleScope.launch {
            val request = ZaloPayCreateRequest(
                addressId = selectedAddress!!.id,
                items = cartItems,
                voucherCode = binding.etVoucherCode.text.toString().takeIf { it.isNotEmpty() }
            )
            
            when (val result = createZaloPayOrder(request)) {
                is Result.Success -> {
                    val response = result.getOrNull()
                    if (response?.success == true) {
                        // Mở ZaloPay để thanh toán
                        openZaloPayPayment(response.zp_trans_token, response.orderId)
                    } else {
                        Toast.makeText(this@CheckoutActivity, response?.message ?: "Lỗi không xác định", Toast.LENGTH_SHORT).show()
                    }
                }
                is Result.Failure -> {
                    Toast.makeText(this@CheckoutActivity, result.exception.message ?: "Lỗi kết nối", Toast.LENGTH_SHORT).show()
                }
            }
            
            binding.progressBar.visibility = View.GONE
            binding.btnPayZaloPay.isEnabled = true
        }
    }
    
    private fun openZaloPayPayment(zpTransToken: String, orderId: String) {
        try {
            // Sử dụng ZaloPay SDK
            ZaloPaySDK.getInstance().payOrder(this, zpTransToken)
            
            // Hoặc mở qua Intent
            // openZaloPayApp(zpTransToken)
            
            // Bắt đầu polling để kiểm tra trạng thái
            startPaymentStatusPolling(orderId)
        } catch (e: Exception) {
            Toast.makeText(this, "Không thể mở ZaloPay: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }
    
    private fun startPaymentStatusPolling(orderId: String) {
        lifecycleScope.launch {
            var attempts = 0
            val maxAttempts = 60 // 5 phút (mỗi 5 giây check 1 lần)
            
            while (attempts < maxAttempts) {
                delay(5000) // Đợi 5 giây
                
                when (val result = checkZaloPayStatus(orderId)) {
                    is Result.Success -> {
                        val status = result.getOrNull()
                        when (status?.paymentStatus) {
                            "success" -> {
                                // Thanh toán thành công
                                showPaymentSuccess(status.orderNumber)
                                break
                            }
                            "failed" -> {
                                // Thanh toán thất bại
                                showPaymentFailed()
                                break
                            }
                            else -> {
                                // Vẫn đang xử lý, tiếp tục polling
                                attempts++
                            }
                        }
                    }
                    is Result.Failure -> {
                        // Lỗi khi check status, tiếp tục thử
                        attempts++
                    }
                }
            }
            
            if (attempts >= maxAttempts) {
                // Timeout - hướng dẫn user kiểm tra thủ công
                showPaymentTimeout()
            }
        }
    }
    
    private fun showPaymentSuccess(orderNumber: String) {
        AlertDialog.Builder(this)
            .setTitle("Thanh toán thành công!")
            .setMessage("Đơn hàng $orderNumber đã được thanh toán thành công.")
            .setPositiveButton("Xem đơn hàng") { _, _ ->
                // Navigate to order detail
                val intent = Intent(this, OrderDetailActivity::class.java)
                intent.putExtra("orderId", orderId)
                startActivity(intent)
                finish()
            }
            .setCancelable(false)
            .show()
    }
    
    private fun showPaymentFailed() {
        AlertDialog.Builder(this)
            .setTitle("Thanh toán thất bại")
            .setMessage("Thanh toán không thành công. Vui lòng thử lại.")
            .setPositiveButton("Thử lại") { _, _ ->
                // Retry payment
            }
            .setNegativeButton("Hủy", null)
            .show()
    }
    
    private fun showPaymentTimeout() {
        AlertDialog.Builder(this)
            .setTitle("Đang xử lý")
            .setMessage("Thanh toán đang được xử lý. Vui lòng kiểm tra lại sau hoặc liên hệ hỗ trợ.")
            .setPositiveButton("OK", null)
            .show()
    }
}
```

### 4. Xử lý kết quả từ ZaloPay (Activity Result)

```kotlin
class CheckoutActivity : AppCompatActivity() {
    private val zaloPayLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val data = result.data
            val zpTransToken = data?.getStringExtra("zp_trans_token")
            val orderId = data?.getStringExtra("order_id")
            
            if (zpTransToken != null && orderId != null) {
                // Kiểm tra trạng thái thanh toán
                checkPaymentStatus(orderId)
            }
        }
    }
    
    private fun openZaloPayApp(zpTransToken: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW).apply {
                data = Uri.parse("zalopay://pay?token=$zpTransToken")
                setPackage("com.zing.zalo")
            }
            zaloPayLauncher.launch(intent)
        } catch (e: Exception) {
            // Fallback: mở web
            val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse("https://zalopay.vn/pay?token=$zpTransToken"))
            startActivity(browserIntent)
        }
    }
}
```

---

## ⚠️ Lưu ý quan trọng

### 1. Bảo mật

- ✅ Luôn sử dụng HTTPS
- ✅ Không lưu `zp_trans_token` vào SharedPreferences hoặc database
- ✅ Token chỉ dùng 1 lần và có thời hạn

### 2. Xử lý lỗi

- **Không thể mở ZaloPay app:** Fallback sang web browser
- **Thanh toán timeout:** Hướng dẫn user kiểm tra thủ công
- **Network error:** Retry với exponential backoff

### 3. Polling Strategy

- **Interval:** 5 giây
- **Max attempts:** 60 lần (5 phút)
- **Stop khi:** `paymentStatus` là `success` hoặc `failed`

### 4. User Experience

- Hiển thị loading khi đang tạo đơn hàng
- Hiển thị progress khi đang chờ thanh toán
- Thông báo rõ ràng khi thành công/thất bại
- Cho phép user kiểm tra trạng thái thủ công

### 5. Callback từ ZaloPay

Backend sẽ nhận callback tự động từ ZaloPay và cập nhật trạng thái đơn hàng. Android app chỉ cần polling để lấy trạng thái mới nhất.

---

## 🔍 Debug

### Kiểm tra request

```kotlin
Log.d("ZaloPay", "Request: ${json.encodeToString(request)}")
Log.d("ZaloPay", "Address ID: ${request.addressId}")
Log.d("ZaloPay", "Items count: ${request.items?.size}")
```

### Kiểm tra response

```kotlin
Log.d("ZaloPay", "Response: ${response.bodyAsText()}")
Log.d("ZaloPay", "zp_trans_token: ${response.zp_trans_token}")
Log.d("ZaloPay", "Order ID: ${response.orderId}")
```

### Lỗi thường gặp

1. **"Vui lòng cung cấp địa chỉ giao hàng!"**
   - Kiểm tra: `addressId` hoặc `shippingAddress` có được gửi không

2. **"Giỏ hàng trống!"**
   - Kiểm tra: `items` array có dữ liệu không

3. **"Không thể tạo đơn hàng thanh toán ZaloPay!"**
   - Kiểm tra: ZaloPay API có hoạt động không
   - Kiểm tra: Cấu hình ZaloPay trên backend

4. **Thanh toán timeout**
   - User có thể đã thanh toán nhưng app chưa nhận được callback
   - Hướng dẫn user kiểm tra thủ công hoặc liên hệ hỗ trợ

---

## 📞 Hỗ trợ

Nếu gặp vấn đề, vui lòng kiểm tra:
1. Token có hợp lệ không
2. Địa chỉ giao hàng có đầy đủ không
3. Giỏ hàng có sản phẩm không
4. ZaloPay app có được cài đặt không
5. Log trên server để xem chi tiết lỗi

---

## 🔮 Mở rộng (Tùy chọn)

### Deep Link để quay lại app sau khi thanh toán

1. Cấu hình Deep Link trong `AndroidManifest.xml`:

```xml
<activity
    android:name=".ZaloPayResultActivity"
    android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="yourapp" android:host="zalopay" />
    </intent-filter>
</activity>
```

2. Xử lý Deep Link:

```kotlin
class ZaloPayResultActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val orderId = intent.data?.getQueryParameter("orderId")
        if (orderId != null) {
            // Kiểm tra trạng thái thanh toán
            checkPaymentStatus(orderId)
        }
    }
}
```

3. Cấu hình callback URL trên ZaloPay Dashboard:
   - `yourapp://zalopay?orderId={orderId}`


