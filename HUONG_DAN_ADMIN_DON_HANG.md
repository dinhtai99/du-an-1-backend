# 📋 HƯỚNG DẪN ADMIN QUẢN LÝ ĐƠN HÀNG

## ✅ XÁC NHẬN: Admin SẼ THẤY ĐƠN HÀNG TỪ ANDROID

Khi khách hàng mua hàng từ **Android Studio**, đơn hàng sẽ:
1. ✅ Được tạo và lưu vào database
2. ✅ **Admin sẽ thấy ngay** trong trang quản lý đơn hàng
3. ✅ Hiển thị đầy đủ thông tin: Mã đơn, Khách hàng, Ngày đặt, Tổng tiền, Trạng thái

## 🔍 CÁCH XEM ĐƠN HÀNG

### 1. Truy cập trang quản lý đơn hàng
- Đăng nhập với tài khoản **Admin**
- Click vào tab **"📋 Đơn hàng"** trong trang quản trị

### 2. Tính năng quản lý đơn hàng

#### 🔄 Làm mới danh sách
- Click nút **"🔄 Làm mới"** để cập nhật danh sách đơn hàng mới nhất
- Hoặc bật **"Tự động làm mới"** để tự động cập nhật mỗi 30 giây

#### 🔍 Lọc theo trạng thái
- Chọn trạng thái từ dropdown:
  - **Tất cả trạng thái**: Xem tất cả đơn hàng
  - **Mới**: Đơn hàng vừa được tạo
  - **Đang xử lý**: Đơn hàng đang được xử lý
  - **Đang giao**: Đơn hàng đang được giao
  - **Hoàn thành**: Đơn hàng đã hoàn thành
  - **Đã hủy**: Đơn hàng đã bị hủy

#### 👁️ Xem chi tiết đơn hàng
- Click nút **"Xem"** để xem thông tin chi tiết:
  - Thông tin khách hàng
  - Địa chỉ giao hàng
  - Danh sách sản phẩm
  - Tổng tiền
  - Trạng thái và phương thức thanh toán

#### ✏️ Cập nhật trạng thái
- Click nút **"Cập nhật"** để thay đổi trạng thái đơn hàng
- Nhập trạng thái mới: `new`, `processing`, `shipping`, `completed`, `cancelled`

## 📊 DASHBOARD TỔNG QUAN

Trang **"📊 Tổng quan"** cũng hiển thị:
- **Đơn hàng mới**: Số đơn hàng có trạng thái "Mới" trong ngày/tuần/tháng
- **Doanh thu**: Tổng doanh thu từ các đơn hàng đã hoàn thành

## ⚙️ CẤU HÌNH API

### API lấy danh sách đơn hàng
```
GET /api/orders?limit=50&status=new
Headers: Authorization: Bearer <token>
```

**Lưu ý:**
- Admin/Staff: Xem **TẤT CẢ** đơn hàng (từ tất cả khách hàng)
- Customer: Chỉ xem đơn hàng của chính mình

### API tạo đơn hàng (từ Android)
```
POST /api/orders
Headers: Authorization: Bearer <token>
Body: {
  shippingAddress: {...},
  paymentMethod: "COD",
  notes: "..."
}
```

## 🔄 TỰ ĐỘNG LÀM MỚI

### Bật tự động làm mới
1. Vào tab **"📋 Đơn hàng"**
2. Tích vào checkbox **"Tự động làm mới"**
3. Danh sách sẽ tự động cập nhật mỗi **30 giây**

### Tắt tự động làm mới
- Bỏ tích checkbox **"Tự động làm mới"**
- Hoặc chuyển sang tab khác (tự động tắt)

## ✅ KẾT LUẬN

**Admin hoàn toàn có thể:**
- ✅ Xem tất cả đơn hàng từ Android
- ✅ Xem chi tiết từng đơn hàng
- ✅ Cập nhật trạng thái đơn hàng
- ✅ Lọc theo trạng thái
- ✅ Tự động cập nhật danh sách

**Không cần lo lắng:** Đơn hàng từ Android sẽ tự động hiển thị trong trang quản trị!

