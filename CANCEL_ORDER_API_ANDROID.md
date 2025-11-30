# ❌ API Hủy Đơn Hàng cho Android App

## Tổng quan

API cho phép khách hàng hủy đơn hàng của mình với lý do cụ thể. API sẽ tự động:
- ✅ Hoàn lại tồn kho (nếu đơn đã ở trạng thái "processing")
- ✅ Hoàn lại voucher (giảm usedCount)
- ✅ Cập nhật paymentStatus nếu đã thanh toán online
- ✅ Lưu lý do hủy và thời gian hủy
- ✅ Thêm vào timeline

---

## 📍 Endpoint

```
PUT /api/orders/:id/cancel
Headers: 
  Authorization: Bearer {token}
  Content-Type: application/json
```

---

## 📝 Request Body

```json
{
  "reason": "Lý do hủy đơn hàng (bắt buộc, ít nhất 3 ký tự, tối đa 500 ký tự)"
}
```

### Ví dụ:

```json
{
  "reason": "Thay đổi ý định, không muốn mua nữa"
}
```

```json
{
  "reason": "Đặt nhầm sản phẩm, muốn đặt lại"
}
```

```json
{
  "reason": "Không còn nhu cầu sử dụng"
}
```

---

## ✅ Response Thành công

### Trường hợp 1: Đơn hàng chưa thanh toán (COD) hoặc thanh toán thất bại

```json
{
  "success": true,
  "message": "Hủy đơn hàng thành công!",
  "data": {
    "order": {
      "_id": "order_id",
      "orderNumber": "DH20251123-120845-828-48",
      "status": "cancelled",
      "cancelledAt": "2024-11-23T12:30:00.000Z",
      "cancelledReason": "Thay đổi ý định, không muốn mua nữa",
      "paymentStatus": "pending",
      "paymentMethod": "COD",
      ...
    },
    "refundInfo": null
  }
}
```

### Trường hợp 2: Đơn hàng đã thanh toán online (ZaloPay/MoMo)

```json
{
  "success": true,
  "message": "Hủy đơn hàng thành công! Tiền sẽ được hoàn lại trong vòng 3-5 ngày làm việc.",
  "data": {
    "order": {
      "_id": "order_id",
      "orderNumber": "DH20251123-120845-828-48",
      "status": "cancelled",
      "cancelledAt": "2024-11-23T12:30:00.000Z",
      "cancelledReason": "Thay đổi ý định, không muốn mua nữa",
      "paymentStatus": "cancelled",
      "paymentMethod": "zalopay",
      ...
    },
    "refundInfo": {
      "needsRefund": true,
      "amount": 930000,
      "paymentMethod": "zalopay",
      "message": "Tiền sẽ được hoàn lại trong vòng 3-5 ngày làm việc"
    }
  }
}
```

---

## ❌ Error Responses

### 1. Không tìm thấy đơn hàng

```json
{
  "success": false,
  "message": "Không tìm thấy đơn hàng!"
}
```
**Status Code:** 404

---

### 2. Không có quyền hủy đơn hàng

```json
{
  "success": false,
  "message": "Không có quyền hủy đơn hàng này!"
}
```
**Status Code:** 403

**Nguyên nhân:** Đơn hàng không thuộc về user hiện tại

---

### 3. Không thể hủy đơn hàng đang giao hoặc đã hoàn thành

```json
{
  "success": false,
  "message": "Không thể hủy đơn hàng đang giao hoặc đã hoàn thành!"
}
```
**Status Code:** 400

**Nguyên nhân:** 
- Đơn hàng đang ở trạng thái "shipping" (đang giao)
- Đơn hàng đã ở trạng thái "completed" (đã hoàn thành)

**Lưu ý:** Chỉ có thể hủy đơn hàng ở trạng thái:
- ✅ "new" (mới tạo)
- ✅ "processing" (đang xử lý)

---

### 4. Đơn hàng đã bị hủy

```json
{
  "success": false,
  "message": "Đơn hàng đã bị hủy!"
}
```
**Status Code:** 400

---

### 5. Lý do hủy không hợp lệ

```json
{
  "success": false,
  "message": "Vui lòng nhập lý do hủy đơn (ít nhất 3 ký tự)!"
}
```
**Status Code:** 400

**Hoặc:**

```json
{
  "success": false,
  "message": "Lý do hủy đơn không được vượt quá 500 ký tự!"
}
```
**Status Code:** 400

---

## 📱 Ví dụ sử dụng trong Android (Kotlin)

### 1. Hàm hủy đơn hàng

```kotlin
suspend fun cancelOrder(orderId: String, reason: String): Result<CancelOrderResponse> {
    return try {
        val requestBody = jsonObjectOf(
            "reason" to reason
        )
        
        val response = httpClient.put("${API_BASE}/orders/$orderId/cancel") {
            headers {
                append("Authorization", "Bearer $token")
                append("Content-Type", "application/json")
            }
            setBody(requestBody.toString())
        }
        
        if (response.status.isSuccess()) {
            val result = json.decodeFromString<CancelOrderResponse>(response.bodyAsText())
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

### 2. Data Classes

```kotlin
data class CancelOrderResponse(
    val success: Boolean,
    val message: String,
    val data: CancelOrderData?
)

data class CancelOrderData(
    val order: Order,
    val refundInfo: RefundInfo?
)

data class RefundInfo(
    val needsRefund: Boolean,
    val amount: Long,
    val paymentMethod: String,
    val message: String
)

data class ErrorResponse(
    val success: Boolean,
    val message: String
)
```

### 3. UI Dialog hủy đơn hàng

```kotlin
fun showCancelOrderDialog(orderId: String, onCancelSuccess: () -> Unit) {
    val dialog = AlertDialog.Builder(context)
        .setTitle("Hủy đơn hàng")
        .setMessage("Vui lòng nhập lý do hủy đơn hàng:")
        .setView(EditText(context).apply {
            hint = "Lý do hủy đơn (ít nhất 3 ký tự)"
            minLines = 3
            maxLines = 5
        })
        .setPositiveButton("Xác nhận hủy") { dialog, _ ->
            val reason = (dialog as AlertDialog).findViewById<EditText>(R.id.cancel_reason)?.text?.toString() ?: ""
            
            if (reason.length < 3) {
                Toast.makeText(context, "Vui lòng nhập lý do hủy đơn (ít nhất 3 ký tự)", Toast.LENGTH_SHORT).show()
                return@setPositiveButton
            }
            
            if (reason.length > 500) {
                Toast.makeText(context, "Lý do hủy đơn không được vượt quá 500 ký tự", Toast.LENGTH_SHORT).show()
                return@setPositiveButton
            }
            
            // Gọi API hủy đơn
            lifecycleScope.launch {
                when (val result = cancelOrder(orderId, reason)) {
                    is Result.Success -> {
                        val response = result.getOrNull()
                        if (response?.success == true) {
                            // Hiển thị thông báo
                            val message = if (response.data?.refundInfo?.needsRefund == true) {
                                "${response.message}\n${response.data.refundInfo.message}"
                            } else {
                                response.message
                            }
                            
                            AlertDialog.Builder(context)
                                .setTitle("Thành công")
                                .setMessage(message)
                                .setPositiveButton("OK") { _, _ ->
                                    onCancelSuccess()
                                }
                                .show()
                        } else {
                            Toast.makeText(context, response?.message ?: "Lỗi không xác định", Toast.LENGTH_SHORT).show()
                        }
                    }
                    is Result.Failure -> {
                        Toast.makeText(context, result.exception.message ?: "Lỗi kết nối", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }
        .setNegativeButton("Hủy", null)
        .create()
    
    dialog.show()
}
```

### 4. Sử dụng trong Activity/Fragment

```kotlin
// Trong OrderDetailActivity
private fun setupCancelButton() {
    btnCancelOrder.setOnClickListener {
        if (order.status == "shipping" || order.status == "completed") {
            Toast.makeText(this, "Không thể hủy đơn hàng đang giao hoặc đã hoàn thành!", Toast.LENGTH_SHORT).show()
            return@setOnClickListener
        }
        
        if (order.status == "cancelled") {
            Toast.makeText(this, "Đơn hàng đã bị hủy!", Toast.LENGTH_SHORT).show()
            return@setOnClickListener
        }
        
        showCancelOrderDialog(order._id) {
            // Reload order details
            loadOrderDetails(order._id)
        }
    }
}
```

---

## ⚠️ Lưu ý quan trọng

### 1. Điều kiện hủy đơn hàng

- ✅ Chỉ có thể hủy đơn hàng ở trạng thái:
  - "new" (mới tạo)
  - "processing" (đang xử lý)
- ❌ Không thể hủy đơn hàng:
  - "shipping" (đang giao)
  - "completed" (đã hoàn thành)
  - "cancelled" (đã hủy)

### 2. Lý do hủy đơn

- ✅ Bắt buộc phải có
- ✅ Độ dài: 3 - 500 ký tự
- ✅ Nên yêu cầu user nhập lý do cụ thể để admin có thể cải thiện dịch vụ

### 3. Hoàn tiền

- **Đơn hàng COD/Cash:** Không cần hoàn tiền (chưa thanh toán)
- **Đơn hàng đã thanh toán online (ZaloPay/MoMo):**
  - API sẽ tự động cập nhật `paymentStatus = "cancelled"`
  - Thông báo cho user: "Tiền sẽ được hoàn lại trong vòng 3-5 ngày làm việc"
  - Admin cần xử lý hoàn tiền thủ công (gọi API hoàn tiền từ ZaloPay/MoMo)

### 4. Hoàn lại tồn kho

- Tự động hoàn lại tồn kho nếu đơn hàng đã ở trạng thái "processing" (đã trừ tồn kho)

### 5. Hoàn lại voucher

- Tự động giảm `usedCount` của voucher nếu đơn hàng đã sử dụng voucher
- Voucher sẽ có thể sử dụng lại

### 6. Timeline

- Tự động thêm entry vào timeline với:
  - Status: "cancelled"
  - Message: "Đơn hàng đã bị hủy. Lý do: {reason}"
  - UpdatedBy: User ID của khách hàng
  - CreatedAt: Thời gian hủy

---

## 🔍 Debug

### Kiểm tra request

```kotlin
Log.d("CancelOrder", "Order ID: $orderId")
Log.d("CancelOrder", "Reason: $reason")
Log.d("CancelOrder", "Reason length: ${reason.length}")
```

### Kiểm tra response

```kotlin
Log.d("CancelOrder", "Response: ${response.bodyAsText()}")
Log.d("CancelOrder", "Success: ${response.success}")
Log.d("CancelOrder", "Refund needed: ${response.data?.refundInfo?.needsRefund}")
```

### Lỗi thường gặp

1. **"Vui lòng nhập lý do hủy đơn (ít nhất 3 ký tự)!"**
   - Kiểm tra: `reason.length >= 3`

2. **"Không thể hủy đơn hàng đang giao hoặc đã hoàn thành!"**
   - Kiểm tra: `order.status` phải là "new" hoặc "processing"

3. **"Không có quyền hủy đơn hàng này!"**
   - Kiểm tra: Token có đúng user không
   - Kiểm tra: Order có thuộc về user không

---

## 📞 Hỗ trợ

Nếu gặp vấn đề, vui lòng kiểm tra:
1. Order status có cho phép hủy không
2. Lý do hủy có đủ độ dài không (3-500 ký tự)
3. Token authentication có hợp lệ không
4. Log trên server để xem chi tiết lỗi

