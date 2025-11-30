# 📍 API Địa chỉ và Thanh toán cho Android App

## Tổng quan

API hỗ trợ 2 cách cung cấp địa chỉ giao hàng:
1. **Sử dụng địa chỉ đã lưu** (từ API `/api/addresses`) - Gửi `addressId`
2. **Gửi địa chỉ trực tiếp** - Gửi object `shippingAddress`

---

## 📍 API Quản lý Địa chỉ

### 1. Lấy danh sách địa chỉ
```
GET /api/addresses
Headers: Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "_id": "address_id",
    "fullName": "Nguyễn Văn A",
    "phone": "0123456789",
    "address": "123 Đường ABC",
    "ward": "Phường 1",
    "district": "Quận 1",
    "city": "Hồ Chí Minh",
    "isDefault": true
  }
]
```

### 2. Lấy địa chỉ mặc định
```
GET /api/addresses/default
Headers: Authorization: Bearer {token}
```

### 3. Thêm địa chỉ mới
```
POST /api/addresses
Headers: Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "fullName": "Nguyễn Văn A",
  "phone": "0123456789",
  "address": "123 Đường ABC",
  "ward": "Phường 1",        // Optional
  "district": "Quận 1",      // Optional
  "city": "Hồ Chí Minh",     // Required
  "isDefault": true           // Optional
}
```

### 4. Cập nhật địa chỉ
```
PUT /api/addresses/:id
Headers: Authorization: Bearer {token}
Content-Type: application/json

Body: (tương tự POST)
```

### 5. Xóa địa chỉ
```
DELETE /api/addresses/:id
Headers: Authorization: Bearer {token}
```

---

## 💳 API Thanh toán

### Cách 1: Sử dụng địa chỉ đã lưu (Khuyến nghị)

#### Tạo đơn hàng COD/Cash
```
POST /api/invoices
Headers: 
  Authorization: Bearer {token}
  Content-Type: application/json

Body:
{
  "addressId": "address_id_đã_lưu",
  "items": [
    {
      "product": "product_id",
      "quantity": 1,
      "price": 100000,
      "color": "Đỏ",      // Optional
      "size": "L"         // Optional
    }
  ],
  "paymentMethod": "COD",  // hoặc "cash"
  "voucherCode": "SALE10", // Optional
  "notes": "Giao hàng buổi sáng" // Optional
}
```

#### Thanh toán ZaloPay
```
POST /api/payment/zalopay/create
Headers: 
  Authorization: Bearer {token}
  Content-Type: application/json

Body:
{
  "addressId": "address_id_đã_lưu",
  "items": [...],
  "voucherCode": "SALE10", // Optional
  "notes": "..."            // Optional
}
```

#### Thanh toán MoMo
```
POST /api/payment/momo/create
Headers: 
  Authorization: Bearer {token}
  Content-Type: application/json

Body:
{
  "addressId": "address_id_đã_lưu",
  "items": [...],
  "voucherCode": "SALE10", // Optional
  "notes": "..."            // Optional
}
```

---

### Cách 2: Gửi địa chỉ trực tiếp (Từ định vị)

#### Tạo đơn hàng COD/Cash
```
POST /api/invoices
Headers: 
  Authorization: Bearer {token}
  Content-Type: application/json

Body:
{
  "shippingAddress": {
    "fullName": "Nguyễn Văn A",
    "phone": "0123456789",
    "address": "123 Đường ABC",
    "ward": "Phường 1",        // Optional
    "district": "Quận 1",      // Optional
    "city": "Hồ Chí Minh"      // Required
  },
  "items": [
    {
      "product": "product_id",
      "quantity": 1,
      "price": 100000,
      "color": "Đỏ",      // Optional
      "size": "L"         // Optional
    }
  ],
  "paymentMethod": "COD",
  "voucherCode": "SALE10", // Optional
  "notes": "Giao hàng buổi sáng" // Optional
}
```

#### Thanh toán ZaloPay/MoMo
```
POST /api/payment/zalopay/create
POST /api/payment/momo/create

Body:
{
  "shippingAddress": {
    "fullName": "Nguyễn Văn A",
    "phone": "0123456789",
    "address": "123 Đường ABC",
    "ward": "Phường 1",        // Optional
    "district": "Quận 1",      // Optional
    "city": "Hồ Chí Minh"      // Required
  },
  "items": [...],
  "voucherCode": "SALE10", // Optional
  "notes": "..."            // Optional
}
```

---

## ⚠️ Lưu ý quan trọng

### 1. Format địa chỉ từ định vị (Geolocation)

Khi sử dụng định vị, đảm bảo map đúng các trường:

```kotlin
// Ví dụ Android (Kotlin)
data class ShippingAddress(
    val fullName: String,    // Tên người nhận (tối thiểu 2 ký tự)
    val phone: String,       // SĐT (10-11 số, format: 0xxxxxxxxx)
    val address: String,     // Địa chỉ chi tiết (số nhà, tên đường, tối thiểu 5 ký tự)
    val ward: String? = null,      // Phường/Xã (Optional)
    val district: String? = null,  // Quận/Huyện (Optional)
    val city: String? = null        // Tỉnh/Thành phố (Optional, nhưng khuyến nghị có)
)

// Khi lấy từ Geocoder/Google Places API
val shippingAddress = ShippingAddress(
    fullName = userFullName.trim(),
    phone = normalizePhone(userPhone),  // Xem hàm normalizePhone bên dưới
    address = geocoderResult.streetAddress.trim(),  // "123 Đường ABC"
    ward = geocoderResult.ward?.trim(),             // "Phường 1" hoặc null
    district = geocoderResult.district?.trim(),      // "Quận 1" hoặc null
    city = geocoderResult.city?.trim()              // "Hồ Chí Minh" hoặc null
)

// Helper function để normalize phone number
fun normalizePhone(phone: String): String {
    // Loại bỏ tất cả ký tự không phải số
    var normalized = phone.replace(Regex("[^0-9]"), "")
    
    // Nếu bắt đầu bằng 84, chuyển thành 0
    if (normalized.startsWith("84")) {
        normalized = "0" + normalized.substring(2)
    }
    
    // Validate độ dài (10-11 số)
    if (normalized.length < 10 || normalized.length > 11) {
        throw IllegalArgumentException("Số điện thoại không hợp lệ: $phone")
    }
    
    return normalized
}
```

### 2. Validation Rules (Backend tự động normalize)

API sẽ tự động normalize và validate:
- ✅ `fullName` - Bắt buộc, tối thiểu 2 ký tự (tự động loại bỏ khoảng trắng thừa, số ở đầu)
- ✅ `phone` - Bắt buộc, 10-11 số (tự động normalize: loại bỏ ký tự đặc biệt, chuyển 84xxx thành 0xxx)
- ✅ `address` - Bắt buộc, tối thiểu 5 ký tự (tự động loại bỏ khoảng trắng thừa, dấu phẩy không cần thiết)
- ⚠️ `ward` - Tùy chọn (tự động loại bỏ "Phường", "Xã", "P." ở đầu nếu có)
- ⚠️ `district` - Tùy chọn (tự động loại bỏ "Quận", "Huyện", "Q.", "H." ở đầu nếu có)
- ⚠️ `city` - Tùy chọn (tự động loại bỏ "Tỉnh", "Thành phố", "TP." ở đầu nếu có)

**Lưu ý:** Backend sẽ tự động normalize địa chỉ, nhưng bạn nên gửi địa chỉ sạch nhất có thể để tránh lỗi.

### 3. Error Messages

Nếu địa chỉ không hợp lệ, API sẽ trả về:
```json
{
  "success": false,
  "message": "Địa chỉ không hợp lệ!",
  "errors": [
    "Họ tên phải có ít nhất 2 ký tự",
    "Số điện thoại không hợp lệ (cần ít nhất 10 số)",
    "Địa chỉ chi tiết phải có ít nhất 5 ký tự"
  ],
  "details": [
    "Họ tên phải có ít nhất 2 ký tự",
    "Số điện thoại không hợp lệ (cần ít nhất 10 số)"
  ]
}
```

### 4. Ví dụ Format Đúng và Sai

**✅ ĐÚNG:**
```json
{
  "fullName": "Nguyễn Văn A",
  "phone": "0912345678",
  "address": "123 Đường Nguyễn Văn Linh",
  "ward": "Phường 1",
  "district": "Quận 1",
  "city": "Hồ Chí Minh"
}
```

**✅ ĐÚNG (có thể có khoảng trắng thừa, backend sẽ tự normalize):**
```json
{
  "fullName": "  Nguyễn  Văn  A  ",
  "phone": "+84 912 345 678",
  "address": "123, Đường Nguyễn Văn Linh, ",
  "ward": "Phường 1",
  "district": "Quận 1",
  "city": "TP. Hồ Chí Minh"
}
```

**❌ SAI (quá ngắn):**
```json
{
  "fullName": "A",  // Quá ngắn (< 2 ký tự)
  "phone": "123",   // Quá ngắn (< 10 số)
  "address": "123"  // Quá ngắn (< 5 ký tự)
}
```

### 5. Xử lý địa chỉ từ Geolocation (Google Maps/Places API)

Khi lấy địa chỉ từ geolocation, cần xử lý cẩn thận:

```kotlin
// Ví dụ với Google Places API
fun parseAddressFromGeocoder(geocoderResult: GeocoderResult): ShippingAddress {
    // Lấy địa chỉ chi tiết (số nhà + tên đường)
    val streetAddress = geocoderResult.getAddressLine(0) ?: ""
    
    // Lấy thông tin địa chỉ chi tiết
    var ward: String? = null
    var district: String? = null
    var city: String? = null
    
    // Parse từ address components
    for (component in geocoderResult.addressComponents) {
        when {
            component.types.contains("ward") || 
            component.types.contains("sublocality_level_1") -> {
                ward = component.longName
            }
            component.types.contains("administrative_area_level_2") -> {
                district = component.longName
            }
            component.types.contains("administrative_area_level_1") || 
            component.types.contains("locality") -> {
                city = component.longName
            }
        }
    }
    
    return ShippingAddress(
        fullName = userFullName.trim(),
        phone = normalizePhone(userPhone),
        address = streetAddress.trim(),
        ward = ward?.trim(),
        district = district?.trim(),
        city = city?.trim()
    )
}
```

**Lưu ý quan trọng:**
- Backend sẽ tự động normalize địa chỉ (loại bỏ khoảng trắng thừa, dấu phẩy không cần thiết)
- Backend sẽ tự động normalize phone number (loại bỏ ký tự đặc biệt, chuyển 84xxx thành 0xxx)
- Backend sẽ tự động loại bỏ tiền tố "Phường", "Quận", "Tỉnh", "Thành phố" nếu có
- Nếu địa chỉ không hợp lệ, API sẽ trả về danh sách lỗi cụ thể

### 6. Ưu tiên sử dụng `addressId`

- ✅ Nhanh hơn (không cần gửi lại địa chỉ)
- ✅ Đảm bảo địa chỉ đã được validate
- ✅ Người dùng có thể quản lý địa chỉ dễ dàng

### 7. Khi nào dùng `shippingAddress` object?

- Khi người dùng nhập địa chỉ mới lần đầu
- Khi sử dụng định vị (geolocation) để lấy địa chỉ
- Khi giao hàng đến địa chỉ khác với địa chỉ đã lưu

---

## 📝 Ví dụ Request hoàn chỉnh

### Tạo đơn hàng COD với địa chỉ từ định vị

```json
POST /api/invoices
{
  "shippingAddress": {
    "fullName": "Trần Văn B",
    "phone": "0987654321",
    "address": "456 Đường XYZ, Phường 2",
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
  "paymentMethod": "COD",
  "voucherCode": "SALE10",
  "notes": "Giao hàng trước 17h"
}
```

### Response thành công

```json
{
  "success": true,
  "message": "Tạo đơn hàng thành công!",
  "data": {
    "_id": "order_id",
    "orderNumber": "DH20251123-120845-828-48",
    "customer": "user_id",
    "shippingAddress": {
      "fullName": "Trần Văn B",
      "phone": "0987654321",
      "address": "456 Đường XYZ, Phường 2",
      "ward": "Phường 2",
      "district": "Quận 2",
      "city": "Hồ Chí Minh"
    },
    "items": [...],
    "subtotal": 1000000,
    "shippingFee": 30000,
    "voucherDiscount": 100000,
    "total": 930000,
    "paymentMethod": "COD",
    "paymentStatus": "pending",
    "status": "new"
  }
}
```

---

## 🔍 Debug

Nếu gặp lỗi, kiểm tra:

1. **Log trên server:**
   - `📍 Lấy địa chỉ từ ID:` - Khi dùng addressId
   - `📍 Sử dụng địa chỉ từ request body` - Khi dùng shippingAddress object
   - `✅ Địa chỉ từ database:` hoặc `✅ Địa chỉ từ request:` - Xác nhận địa chỉ đã được xử lý

2. **Kiểm tra request body:**
   - Đảm bảo có `addressId` HOẶC `shippingAddress` object
   - Đảm bảo `shippingAddress` có đủ: `fullName`, `phone`, `address`, `city`

3. **Lỗi thường gặp:**
   - `"Vui lòng cung cấp địa chỉ giao hàng!"` → Thiếu cả `addressId` và `shippingAddress`
   - `"Vui lòng điền đầy đủ thông tin địa chỉ giao hàng!"` → Thiếu một trong các trường bắt buộc
   - `"Không tìm thấy địa chỉ hoặc địa chỉ không thuộc về bạn!"` → `addressId` không tồn tại hoặc không thuộc về user

---

## 📞 Hỗ trợ

Nếu gặp vấn đề, vui lòng kiểm tra:
1. Request body có đúng format không
2. Token authentication có hợp lệ không
3. Log trên server để xem chi tiết lỗi


