# Trạng thái ZaloPay Integration

## ✅ Đã kiểm tra

### 1. Cấu hình
- ✅ App ID: Đã cấu hình (4 ký tự)
- ✅ Key1: Đã cấu hình (32 ký tự)
- ✅ Key2: Đã cấu hình (32 ký tự)
- ✅ Endpoint: `https://sb-openapi.zalopay.vn/v2/create` (Sandbox)
- ✅ Callback URL: `http://localhost:3000/api/payment/zalopay/callback`
- ✅ Environment: `sandbox`

### 2. Code Implementation
- ✅ MAC signature generation: Hoạt động đúng
- ✅ Format dữ liệu: Đã đúng theo tài liệu ZaloPay
- ✅ Validation: Đã có đầy đủ (amount, app_trans_id, etc.)
- ✅ Error handling: Đã có logging chi tiết

### 3. Vấn đề hiện tại

**Lỗi từ ZaloPay API:**
```
return_code: 2
sub_return_code: -401
return_message: "Giao dịch thất bại"
sub_return_message: "Dữ liệu yêu cầu không hợp lệ"
```

**Nguyên nhân có thể:**
1. **Format dữ liệu không đúng**: Một số field có thể thiếu hoặc sai format
2. **MAC signature**: Có thể MAC string không khớp với dữ liệu gửi lên
3. **Encoding**: Form data encoding có thể không đúng

## 🔧 Đã sửa

1. ✅ Đảm bảo MAC string dùng giá trị gốc (số nguyên cho amount và app_time)
2. ✅ Form data convert tất cả sang string trước khi gửi
3. ✅ Thêm logging chi tiết để debug
4. ✅ Thêm error message chi tiết cho sub_return_code -401

## 📋 Checklist để kiểm tra

### Kiểm tra từ Server Logs
Khi có request từ Android app, kiểm tra logs có:
1. `📤 ZaloPay API request:` - Xem các giá trị gửi lên
2. `🔐 ZaloPay MAC string:` - Xem MAC string được tạo
3. `📥 ZaloPay API response (full):` - Xem response đầy đủ từ ZaloPay

### Kiểm tra từ Android App
1. Request có đầy đủ thông tin không?
2. Response có `sub_return_code` không? (quan trọng để biết lỗi cụ thể)
3. Có log được request/response từ server không?

## 🚀 Cách test

### Test từ server:
```bash
node test_zalopay.js
```

### Test từ Android app:
1. Tạo order với payment method = "zalopay"
2. Xem logs trên server
3. Kiểm tra response có `sub_return_code` để biết lỗi cụ thể

## 📝 Lưu ý

1. **Sandbox vs Production**: Hiện đang dùng sandbox endpoint
2. **Timeout**: Có thể bị timeout từ local, nhưng server production có thể kết nối được
3. **MAC String Format**: Phải đúng thứ tự: `app_id|app_trans_id|app_user|amount|app_time|embed_data|item`
4. **Amount**: Phải là số nguyên > 0 (VNĐ)

## 🔍 Debug Steps

Nếu vẫn gặp lỗi -401:

1. **Kiểm tra MAC string**: So sánh MAC string trong logs với format chuẩn
2. **Kiểm tra form data**: Xem form body có đầy đủ field không
3. **Kiểm tra encoding**: Đảm bảo URL encoding đúng
4. **Kiểm tra ZaloPay dashboard**: Xem có thông báo gì từ ZaloPay không

## 📞 Support

Nếu vẫn không giải quyết được, cần:
1. Lấy full logs từ server khi có request
2. Lấy response đầy đủ từ ZaloPay (có sub_return_code)
3. Kiểm tra ZaloPay dashboard xem có thông báo gì không

