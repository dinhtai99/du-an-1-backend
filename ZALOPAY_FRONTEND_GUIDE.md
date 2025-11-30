# Hướng dẫn tích hợp ZaloPay - Frontend (Android/Web)

## 📋 Mục lục
1. [API Endpoint](#api-endpoint)
2. [Request Format](#request-format)
3. [Response Format](#response-format)
4. [Ví dụ code Android (Kotlin)](#ví-dụ-code-android-kotlin)
5. [Ví dụ code Android (Java)](#ví-dụ-code-android-java)
6. [Ví dụ code JavaScript/Web](#ví-dụ-code-javascriptweb)
7. [Error Handling](#error-handling)
8. [Flow thanh toán](#flow-thanh-toán)

---

## 🔗 API Endpoint

```
POST /api/payment/zalopay/create
```

**Base URL:** `http://your-server.com` (hoặc `http://localhost:3000` cho development)

**Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

---

## 📤 Request Format

### Request Body

```json
{
  "shippingAddress": {
    "fullName": "Nguyễn Văn A",
    "phone": "0123456789",
    "address": "123 Đường ABC",
    "ward": "Phường XYZ",
    "district": "Quận 1",
    "city": "Hồ Chí Minh"
  },
  "addressId": "optional_address_id_string",
  "items": [
    {
      "product": "product_id_1",
      "quantity": 2,
      "price": 100000,
      "color": "Đỏ",
      "size": "M"
    }
  ],
  "voucherCode": "VOUCHER123",
  "notes": "Giao hàng vào buổi sáng",
  "orderId": "optional_existing_order_id"
}
```

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `shippingAddress` | Object | Yes* | Địa chỉ giao hàng (nếu không có `addressId`) |
| `shippingAddress.fullName` | String | Yes | Tên người nhận |
| `shippingAddress.phone` | String | Yes | Số điện thoại |
| `shippingAddress.address` | String | Yes | Địa chỉ chi tiết |
| `shippingAddress.ward` | String | No | Phường/Xã |
| `shippingAddress.district` | String | No | Quận/Huyện |
| `shippingAddress.city` | String | No | Tỉnh/Thành phố |
| `addressId` | String | Yes* | ID địa chỉ đã lưu (nếu không có `shippingAddress`) |
| `items` | Array | Yes* | Danh sách sản phẩm (cho mobile app) |
| `items[].product` | String | Yes | ID sản phẩm |
| `items[].quantity` | Number | Yes | Số lượng |
| `items[].price` | Number | Yes | Giá sản phẩm |
| `items[].color` | String | No | Màu sắc |
| `items[].size` | String | No | Kích thước |
| `voucherCode` | String | No | Mã giảm giá |
| `notes` | String | No | Ghi chú đơn hàng |
| `orderId` | String | No | ID đơn hàng đã tạo trước (nếu có) |

**Lưu ý:**
- Phải có **một trong hai**: `shippingAddress` HOẶC `addressId`
- `items` chỉ cần cho mobile app (web app sẽ lấy từ giỏ hàng trong database)

---

## 📥 Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Tạo đơn hàng thanh toán ZaloPay thành công!",
  "zp_trans_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "order_url": "https://zalopay.vn/pay/...",
  "order_token": "order_token_string",
  "orderId": "507f1f77bcf86cd799439011",
  "orderNumber": "ORD-20250123-143022-1234"
}
```

### Error Response (400 Bad Request)

```json
{
  "success": false,
  "message": "Không thể tạo đơn hàng thanh toán ZaloPay!",
  "error": "Giao dịch thất bại",
  "return_code": 2,
  "sub_return_code": -401,
  "debug": {
    "app_trans_id": "251123_143022123_507f1f77bcf86cd799439011",
    "amount": 150000,
    "orderId": "507f1f77bcf86cd799439011"
  }
}
```

### Error Response (500 Internal Server Error)

```json
{
  "message": "Lỗi server!",
  "error": "Error message details"
}
```

---

## 📱 Ví dụ code Android (Kotlin)

### 1. Data Classes

```kotlin
// ShippingAddress.kt
data class ShippingAddress(
    val fullName: String,
    val phone: String,
    val address: String,
    val ward: String? = null,
    val district: String? = null,
    val city: String? = null
)

// OrderItem.kt
data class OrderItem(
    val product: String,
    val quantity: Int,
    val price: Long,
    val color: String? = null,
    val size: String? = null
)

// ZaloPayCreateRequest.kt
data class ZaloPayCreateRequest(
    val shippingAddress: ShippingAddress? = null,
    val addressId: String? = null,
    val items: List<OrderItem>? = null,
    val voucherCode: String? = null,
    val notes: String? = null,
    val orderId: String? = null
)

// ZaloPayCreateResponse.kt
data class ZaloPayCreateResponse(
    val success: Boolean,
    val message: String? = null,
    val zp_trans_token: String? = null,
    val order_url: String? = null,
    val order_token: String? = null,
    val orderId: String? = null,
    val orderNumber: String? = null,
    val error: String? = null,
    val return_code: Int? = null,
    val sub_return_code: Int? = null
)
```

### 2. API Service (Retrofit)

```kotlin
// ZaloPayApiService.kt
import retrofit2.Call
import retrofit2.http.*

interface ZaloPayApiService {
    @POST("/api/payment/zalopay/create")
    @Headers("Content-Type: application/json")
    fun createZaloPayOrder(
        @Header("Authorization") token: String,
        @Body request: ZaloPayCreateRequest
    ): Call<ZaloPayCreateResponse>
}
```

### 3. Usage Example

```kotlin
// ZaloPayPaymentActivity.kt
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import android.util.Log

class ZaloPayPaymentActivity : AppCompatActivity() {
    private val TAG = "ZaloPayPayment"
    private val BASE_URL = "http://your-server.com" // Thay bằng server URL của bạn
    
    private val retrofit = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
    
    private val apiService = retrofit.create(ZaloPayApiService::class.java)
    
    private fun createZaloPayOrder() {
        // Lấy access token từ SharedPreferences hoặc từ login response
        val accessToken = getAccessToken() // Implement hàm này
        
        // Tạo request
        val shippingAddress = ShippingAddress(
            fullName = "Nguyễn Văn A",
            phone = "0123456789",
            address = "123 Đường ABC",
            ward = "Phường XYZ",
            district = "Quận 1",
            city = "Hồ Chí Minh"
        )
        
        val items = listOf(
            OrderItem(
                product = "product_id_1",
                quantity = 2,
                price = 100000L,
                color = "Đỏ",
                size = "M"
            )
        )
        
        val request = ZaloPayCreateRequest(
            shippingAddress = shippingAddress,
            items = items,
            voucherCode = "VOUCHER123", // Optional
            notes = "Giao hàng vào buổi sáng" // Optional
        )
        
        // Gọi API
        val call = apiService.createZaloPayOrder("Bearer $accessToken", request)
        
        call.enqueue(object : retrofit2.Callback<ZaloPayCreateResponse> {
            override fun onResponse(
                call: Call<ZaloPayCreateResponse>,
                response: retrofit2.Response<ZaloPayCreateResponse>
            ) {
                if (response.isSuccessful && response.body() != null) {
                    val result = response.body()!!
                    
                    if (result.success && result.zp_trans_token != null) {
                        // Thành công - mở ZaloPay SDK để thanh toán
                        Log.d(TAG, "ZaloPay order created: ${result.orderNumber}")
                        openZaloPaySDK(result.zp_trans_token!!)
                    } else {
                        // Lỗi từ ZaloPay
                        Log.e(TAG, "ZaloPay error: ${result.error}")
                        Log.e(TAG, "Return code: ${result.return_code}, Sub code: ${result.sub_return_code}")
                        showError("Không thể tạo đơn hàng: ${result.error}")
                    }
                } else {
                    // HTTP error
                    val errorBody = response.errorBody()?.string()
                    Log.e(TAG, "HTTP error: ${response.code()} - $errorBody")
                    showError("Lỗi kết nối: ${response.code()}")
                }
            }
            
            override fun onFailure(call: Call<ZaloPayCreateResponse>, t: Throwable) {
                Log.e(TAG, "Network error", t)
                showError("Lỗi kết nối: ${t.message}")
            }
        })
    }
    
    private fun openZaloPaySDK(zpTransToken: String) {
        // TODO: Implement ZaloPay SDK để mở màn hình thanh toán
        // Ví dụ:
        // ZaloPaySDK.getInstance().payOrder(this, zpTransToken, ...)
    }
    
    private fun showError(message: String) {
        // Hiển thị lỗi cho user
        runOnUiThread {
            Toast.makeText(this, message, Toast.LENGTH_LONG).show()
        }
    }
    
    private fun getAccessToken(): String {
        // Lấy token từ SharedPreferences
        val prefs = getSharedPreferences("app_prefs", MODE_PRIVATE)
        return prefs.getString("access_token", "") ?: ""
    }
}
```

---

## ☕ Ví dụ code Android (Java)

### 1. Data Classes

```java
// ShippingAddress.java
public class ShippingAddress {
    private String fullName;
    private String phone;
    private String address;
    private String ward;
    private String district;
    private String city;
    
    // Constructors, getters, setters
    public ShippingAddress(String fullName, String phone, String address) {
        this.fullName = fullName;
        this.phone = phone;
        this.address = address;
    }
    
    // Getters and setters...
}

// OrderItem.java
public class OrderItem {
    private String product;
    private int quantity;
    private long price;
    private String color;
    private String size;
    
    // Constructors, getters, setters...
}

// ZaloPayCreateRequest.java
public class ZaloPayCreateRequest {
    private ShippingAddress shippingAddress;
    private String addressId;
    private List<OrderItem> items;
    private String voucherCode;
    private String notes;
    private String orderId;
    
    // Constructors, getters, setters...
}

// ZaloPayCreateResponse.java
public class ZaloPayCreateResponse {
    private boolean success;
    private String message;
    private String zp_trans_token;
    private String order_url;
    private String order_token;
    private String orderId;
    private String orderNumber;
    private String error;
    private Integer return_code;
    private Integer sub_return_code;
    
    // Getters, setters...
}
```

### 2. API Service (Retrofit)

```java
// ZaloPayApiService.java
import retrofit2.Call;
import retrofit2.http.*;

public interface ZaloPayApiService {
    @POST("/api/payment/zalopay/create")
    @Headers("Content-Type: application/json")
    Call<ZaloPayCreateResponse> createZaloPayOrder(
        @Header("Authorization") String token,
        @Body ZaloPayCreateRequest request
    );
}
```

### 3. Usage Example

```java
// ZaloPayPaymentActivity.java
import retrofit2.*;
import retrofit2.converter.gson.GsonConverterFactory;
import android.util.Log;

public class ZaloPayPaymentActivity extends AppCompatActivity {
    private static final String TAG = "ZaloPayPayment";
    private static final String BASE_URL = "http://your-server.com";
    
    private ZaloPayApiService apiService;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        Retrofit retrofit = new Retrofit.Builder()
            .baseUrl(BASE_URL)
            .addConverterFactory(GsonConverterFactory.create())
            .build();
        
        apiService = retrofit.create(ZaloPayApiService.class);
    }
    
    private void createZaloPayOrder() {
        String accessToken = getAccessToken();
        
        ShippingAddress shippingAddress = new ShippingAddress(
            "Nguyễn Văn A",
            "0123456789",
            "123 Đường ABC"
        );
        shippingAddress.setWard("Phường XYZ");
        shippingAddress.setDistrict("Quận 1");
        shippingAddress.setCity("Hồ Chí Minh");
        
        List<OrderItem> items = new ArrayList<>();
        items.add(new OrderItem("product_id_1", 2, 100000L, "Đỏ", "M"));
        
        ZaloPayCreateRequest request = new ZaloPayCreateRequest();
        request.setShippingAddress(shippingAddress);
        request.setItems(items);
        request.setVoucherCode("VOUCHER123");
        request.setNotes("Giao hàng vào buổi sáng");
        
        Call<ZaloPayCreateResponse> call = apiService.createZaloPayOrder(
            "Bearer " + accessToken,
            request
        );
        
        call.enqueue(new Callback<ZaloPayCreateResponse>() {
            @Override
            public void onResponse(Call<ZaloPayCreateResponse> call, 
                                  Response<ZaloPayCreateResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    ZaloPayCreateResponse result = response.body();
                    
                    if (result.isSuccess() && result.getZp_trans_token() != null) {
                        Log.d(TAG, "ZaloPay order created: " + result.getOrderNumber());
                        openZaloPaySDK(result.getZp_trans_token());
                    } else {
                        Log.e(TAG, "ZaloPay error: " + result.getError());
                        showError("Không thể tạo đơn hàng: " + result.getError());
                    }
                } else {
                    Log.e(TAG, "HTTP error: " + response.code());
                    showError("Lỗi kết nối: " + response.code());
                }
            }
            
            @Override
            public void onFailure(Call<ZaloPayCreateResponse> call, Throwable t) {
                Log.e(TAG, "Network error", t);
                showError("Lỗi kết nối: " + t.getMessage());
            }
        });
    }
    
    private void openZaloPaySDK(String zpTransToken) {
        // TODO: Implement ZaloPay SDK
    }
    
    private void showError(String message) {
        runOnUiThread(() -> {
            Toast.makeText(this, message, Toast.LENGTH_LONG).show();
        });
    }
    
    private String getAccessToken() {
        SharedPreferences prefs = getSharedPreferences("app_prefs", MODE_PRIVATE);
        return prefs.getString("access_token", "");
    }
}
```

---

## 🌐 Ví dụ code JavaScript/Web

### 1. Using Fetch API

```javascript
async function createZaloPayOrder() {
    const accessToken = localStorage.getItem('access_token');
    
    const requestData = {
        shippingAddress: {
            fullName: "Nguyễn Văn A",
            phone: "0123456789",
            address: "123 Đường ABC",
            ward: "Phường XYZ",
            district: "Quận 1",
            city: "Hồ Chí Minh"
        },
        // items: [...] // Không cần cho web, sẽ lấy từ cart
        voucherCode: "VOUCHER123", // Optional
        notes: "Giao hàng vào buổi sáng" // Optional
    };
    
    try {
        const response = await fetch('http://your-server.com/api/payment/zalopay/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(requestData)
        });
        
        const result = await response.json();
        
        if (result.success && result.zp_trans_token) {
            console.log('ZaloPay order created:', result.orderNumber);
            // Mở ZaloPay payment URL
            window.location.href = result.order_url;
        } else {
            console.error('ZaloPay error:', result.error);
            alert(`Không thể tạo đơn hàng: ${result.error}`);
        }
    } catch (error) {
        console.error('Network error:', error);
        alert('Lỗi kết nối: ' + error.message);
    }
}
```

### 2. Using Axios

```javascript
import axios from 'axios';

async function createZaloPayOrder() {
    const accessToken = localStorage.getItem('access_token');
    
    const requestData = {
        shippingAddress: {
            fullName: "Nguyễn Văn A",
            phone: "0123456789",
            address: "123 Đường ABC",
            ward: "Phường XYZ",
            district: "Quận 1",
            city: "Hồ Chí Minh"
        },
        voucherCode: "VOUCHER123",
        notes: "Giao hàng vào buổi sáng"
    };
    
    try {
        const response = await axios.post(
            'http://your-server.com/api/payment/zalopay/create',
            requestData,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );
        
        if (response.data.success && response.data.zp_trans_token) {
            console.log('ZaloPay order created:', response.data.orderNumber);
            window.location.href = response.data.order_url;
        } else {
            console.error('ZaloPay error:', response.data.error);
            alert(`Không thể tạo đơn hàng: ${response.data.error}`);
        }
    } catch (error) {
        if (error.response) {
            // Server trả về error
            console.error('Server error:', error.response.data);
            alert(`Lỗi: ${error.response.data.message || error.response.data.error}`);
        } else {
            // Network error
            console.error('Network error:', error.message);
            alert('Lỗi kết nối: ' + error.message);
        }
    }
}
```

---

## ⚠️ Error Handling

### Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `return_code: 2` | Giao dịch thất bại | Kiểm tra `sub_return_code` để biết lỗi cụ thể |
| `sub_return_code: -401` | Dữ liệu yêu cầu không hợp lệ | Kiểm tra format request |
| `sub_return_code: -402` | Chữ ký không hợp lệ | Lỗi server (MAC signature) |
| `sub_return_code: -3` | Ứng dụng không hợp lệ | Kiểm tra ZALOPAY_APP_ID |
| `sub_return_code: -5` | Số tiền không hợp lệ | Kiểm tra amount > 0 |
| `sub_return_code: -68` | Mã giao dịch bị trùng | app_trans_id đã được sử dụng |

### Error Handling Example (Kotlin)

```kotlin
private fun handleZaloPayError(result: ZaloPayCreateResponse) {
    when (result.return_code) {
        2 -> {
            when (result.sub_return_code) {
                -401 -> showError("Dữ liệu không hợp lệ. Vui lòng thử lại.")
                -402 -> showError("Lỗi xác thực. Vui lòng liên hệ hỗ trợ.")
                -3 -> showError("Lỗi cấu hình. Vui lòng liên hệ hỗ trợ.")
                -5 -> showError("Số tiền không hợp lệ.")
                -68 -> showError("Mã giao dịch bị trùng. Vui lòng thử lại.")
                else -> showError("Lỗi thanh toán: ${result.error}")
            }
        }
        else -> showError("Lỗi không xác định: ${result.error}")
    }
}
```

---

## 🔄 Flow thanh toán

```
1. User chọn sản phẩm và điền thông tin
   ↓
2. Frontend gọi POST /api/payment/zalopay/create
   ↓
3. Server tạo order và gọi ZaloPay API
   ↓
4. Server trả về zp_trans_token
   ↓
5. Frontend mở ZaloPay SDK/URL với zp_trans_token
   ↓
6. User thanh toán trên ZaloPay
   ↓
7. ZaloPay gọi callback về server
   ↓
8. Server cập nhật order status
   ↓
9. Frontend query order status để hiển thị kết quả
```

---

## 📝 Lưu ý quan trọng

1. **Authentication**: Luôn gửi `Authorization: Bearer {token}` header
2. **Address**: Phải có `shippingAddress` HOẶC `addressId`
3. **Items**: Chỉ cần cho mobile app, web app sẽ lấy từ cart
4. **Error Handling**: Luôn kiểm tra `success` và `sub_return_code` để xử lý lỗi chi tiết
5. **Timeout**: API có thể mất 20-30 giây, cần set timeout phù hợp
6. **ZaloPay SDK**: Sau khi có `zp_trans_token`, cần integrate ZaloPay SDK để mở màn hình thanh toán
7. **ZaloPay Sandbox**: Khi test trong sandbox, nếu chọn thanh toán qua ngân hàng, ZaloPay sẽ yêu cầu CCCD. **Giải pháp:** Sử dụng **Ví ZaloPay** thay vì chọn ngân hàng để test nhanh hơn. Xem chi tiết trong file `ZALOPAY_SANDBOX_TESTING.md`

---

## 🔗 Tài liệu tham khảo

- ZaloPay SDK Documentation: https://developers.zalopay.vn/
- ZaloPay API Reference: https://developers.zalopay.vn/docs/api/
- ZaloPay Sandbox Testing Guide: `ZALOPAY_SANDBOX_TESTING.md` (trong project này)

