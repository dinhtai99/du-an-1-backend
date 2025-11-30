# 📍 Hướng dẫn Format Địa chỉ từ Geolocation

## Vấn đề: Địa chỉ từ geolocation không đúng chuẩn

Khi lấy địa chỉ từ geolocation (Google Maps, GPS), địa chỉ có thể có:
- Khoảng trắng thừa
- Dấu phẩy, dấu chấm không cần thiết
- Tiền tố không chuẩn ("Phường", "Quận", "Tỉnh", "Thành phố")
- Phone number không đúng format
- Địa chỉ quá ngắn hoặc thiếu thông tin

## ✅ Giải pháp: Backend tự động normalize

Backend đã được cập nhật để **tự động normalize và validate** địa chỉ từ geolocation.

### 1. Normalization Rules

#### FullName (Họ tên)
- ✅ Loại bỏ khoảng trắng thừa
- ✅ Loại bỏ số ở đầu (nếu có)
- ✅ Tối thiểu 2 ký tự

**Ví dụ:**
- Input: `"  Nguyễn  Văn  A  "` → Output: `"Nguyễn Văn A"`
- Input: `"123 Nguyễn Văn A"` → Output: `"Nguyễn Văn A"`

#### Phone (Số điện thoại)
- ✅ Loại bỏ tất cả ký tự không phải số
- ✅ Chuyển `84xxx` thành `0xxx`
- ✅ Validate độ dài: 10-11 số

**Ví dụ:**
- Input: `"+84 912 345 678"` → Output: `"0912345678"`
- Input: `"84-912-345-678"` → Output: `"0912345678"`
- Input: `"0912.345.678"` → Output: `"0912345678"`

#### Address (Địa chỉ chi tiết)
- ✅ Loại bỏ khoảng trắng thừa
- ✅ Loại bỏ dấu phẩy không cần thiết ở đầu/cuối
- ✅ Tối thiểu 5 ký tự

**Ví dụ:**
- Input: `"123,  Đường ABC,  "` → Output: `"123, Đường ABC"`
- Input: `"  123 Đường ABC  "` → Output: `"123 Đường ABC"`

#### Ward/District (Phường/Xã, Quận/Huyện)
- ✅ Loại bỏ tiền tố "Phường", "Xã", "P." ở đầu
- ✅ Loại bỏ tiền tố "Quận", "Huyện", "Q.", "H." ở đầu
- ✅ Loại bỏ khoảng trắng thừa

**Ví dụ:**
- Input: `"Phường 1"` → Output: `"1"`
- Input: `"Quận 1"` → Output: `"1"`
- Input: `"P. 1"` → Output: `"1"`

#### City (Tỉnh/Thành phố)
- ✅ Loại bỏ tiền tố "Tỉnh", "Thành phố", "TP." ở đầu
- ✅ Loại bỏ khoảng trắng thừa

**Ví dụ:**
- Input: `"TP. Hồ Chí Minh"` → Output: `"Hồ Chí Minh"`
- Input: `"Tỉnh Bình Dương"` → Output: `"Bình Dương"`

### 2. Validation Rules

Backend sẽ validate và trả về lỗi nếu:

| Trường | Rule | Lỗi |
|--------|------|-----|
| `fullName` | Tối thiểu 2 ký tự | "Họ tên phải có ít nhất 2 ký tự" |
| `phone` | 10-11 số | "Số điện thoại không hợp lệ (cần ít nhất 10 số)" |
| `address` | Tối thiểu 5 ký tự | "Địa chỉ chi tiết phải có ít nhất 5 ký tự" |
| `city` | Nếu có, tối thiểu 2 ký tự | "Tên tỉnh/thành phố không hợp lệ" |

### 3. Response Format

#### ✅ Success Response
```json
{
  "success": true,
  "message": "Tạo đơn hàng thành công!",
  "data": {
    "shippingAddress": {
      "fullName": "Nguyễn Văn A",
      "phone": "0912345678",
      "address": "123 Đường ABC",
      "ward": "1",
      "district": "1",
      "city": "Hồ Chí Minh"
    }
  }
}
```

#### ❌ Error Response
```json
{
  "success": false,
  "message": "Địa chỉ không hợp lệ!",
  "errors": [
    "Họ tên phải có ít nhất 2 ký tự",
    "Số điện thoại không hợp lệ (cần ít nhất 10 số)"
  ],
  "details": [
    "Họ tên phải có ít nhất 2 ký tự",
    "Số điện thoại không hợp lệ (cần ít nhất 10 số)"
  ]
}
```

## 📱 Hướng dẫn cho Android Developer

### 1. Xử lý địa chỉ từ Google Places API

```kotlin
// Lấy địa chỉ từ Google Places API
fun getAddressFromPlace(place: Place, userFullName: String, userPhone: String): ShippingAddress {
    // Lấy địa chỉ chi tiết
    val streetAddress = place.address ?: ""
    
    // Parse address components
    var ward: String? = null
    var district: String? = null
    var city: String? = null
    
    place.addressComponents?.forEach { component ->
        component.types.forEach { type ->
            when (type) {
                "sublocality_level_1", "ward" -> {
                    ward = component.longName
                }
                "administrative_area_level_2" -> {
                    district = component.longName
                }
                "administrative_area_level_1", "locality" -> {
                    city = component.longName
                }
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

// Normalize phone number
fun normalizePhone(phone: String): String {
    var normalized = phone.replace(Regex("[^0-9]"), "")
    if (normalized.startsWith("84")) {
        normalized = "0" + normalized.substring(2)
    }
    if (normalized.length < 10 || normalized.length > 11) {
        throw IllegalArgumentException("Số điện thoại không hợp lệ")
    }
    return normalized
}
```

### 2. Xử lý địa chỉ từ Geocoder

```kotlin
// Lấy địa chỉ từ Geocoder (lat/lng)
fun getAddressFromGeocoder(
    geocoder: Geocoder,
    latitude: Double,
    longitude: Double,
    userFullName: String,
    userPhone: String
): ShippingAddress? {
    try {
        val addresses = geocoder.getFromLocation(latitude, longitude, 1)
        if (addresses.isNotEmpty()) {
            val address = addresses[0]
            
            return ShippingAddress(
                fullName = userFullName.trim(),
                phone = normalizePhone(userPhone),
                address = address.getAddressLine(0)?.trim() ?: "",
                ward = address.subLocality?.trim(),
                district = address.subAdminArea?.trim(),
                city = address.adminArea?.trim()
            )
        }
    } catch (e: Exception) {
        Log.e("Geocoder", "Error getting address: ${e.message}")
    }
    return null
}
```

### 3. Gửi request với địa chỉ đã normalize

```kotlin
// Gửi request tạo đơn hàng
fun createOrder(shippingAddress: ShippingAddress) {
    val requestBody = jsonObjectOf(
        "shippingAddress" to jsonObjectOf(
            "fullName" to shippingAddress.fullName,
            "phone" to shippingAddress.phone,
            "address" to shippingAddress.address,
            "ward" to (shippingAddress.ward ?: ""),
            "district" to (shippingAddress.district ?: ""),
            "city" to (shippingAddress.city ?: "")
        ),
        "items" to items,
        "paymentMethod" to "COD"
    )
    
    // Gửi request
    // Backend sẽ tự động normalize và validate
    // Nếu có lỗi, response sẽ có field "errors" với danh sách lỗi cụ thể
}
```

## 🔍 Debug

### Log trên Server

Khi gửi địa chỉ từ geolocation, server sẽ log:

```
📍 Sử dụng địa chỉ từ request body
✅ Địa chỉ đã được normalize: {
  fullName: "Nguyễn Văn A",
  phone: "0912345678",
  address: "123 Đường ABC",
  ward: "1",
  district: "1",
  city: "Hồ Chí Minh"
}
```

Nếu có lỗi:
```
❌ Địa chỉ không hợp lệ: {
  original: { ... },
  errors: [ "Họ tên phải có ít nhất 2 ký tự" ]
}
```

### Kiểm tra trên Android

1. **Kiểm tra request body trước khi gửi:**
   ```kotlin
   Log.d("Address", "FullName: ${shippingAddress.fullName}")
   Log.d("Address", "Phone: ${shippingAddress.phone}")
   Log.d("Address", "Address: ${shippingAddress.address}")
   ```

2. **Xử lý error response:**
   ```kotlin
   if (!response.success) {
       response.errors?.forEach { error ->
           Log.e("Address", "Error: $error")
       }
   }
   ```

## 📝 Checklist

Trước khi gửi địa chỉ từ geolocation, đảm bảo:

- [ ] `fullName` có ít nhất 2 ký tự (backend sẽ tự normalize)
- [ ] `phone` có 10-11 số (backend sẽ tự normalize format)
- [ ] `address` có ít nhất 5 ký tự (backend sẽ tự normalize)
- [ ] `ward`, `district`, `city` có thể null hoặc rỗng (optional)
- [ ] Đã trim() tất cả các trường (backend cũng sẽ trim lại)
- [ ] Đã xử lý error response với field `errors`

## 🎯 Best Practices

1. **Luôn trim() trước khi gửi** - Mặc dù backend sẽ trim lại, nhưng nên trim sớm để tránh lỗi
2. **Normalize phone number** - Chuyển `84xxx` thành `0xxx` trước khi gửi
3. **Xử lý error response** - Luôn kiểm tra field `errors` trong response để hiển thị lỗi cho user
4. **Validate trên client** - Validate cơ bản trên client trước khi gửi để UX tốt hơn
5. **Log địa chỉ trước khi gửi** - Để dễ debug nếu có vấn đề

