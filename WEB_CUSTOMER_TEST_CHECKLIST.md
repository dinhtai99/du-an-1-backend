# 📋 Checklist Test Chức Năng Khách Hàng Trên Web

## 🌐 Truy cập Web

**URL:** `http://localhost:3000` hoặc `http://localhost:3000/index.html`

**Yêu cầu:**
- ✅ Server đang chạy (`npm start`)
- ✅ Port 3000 không bị chiếm
- ✅ MongoDB đã kết nối

---

## 🔐 1. Đăng nhập / Đăng ký

### 1.1 Đăng nhập
- [ ] Mở trang web
- [ ] Click "Đăng nhập"
- [ ] Nhập username và password
- [ ] Kiểm tra đăng nhập thành công
- [ ] Kiểm tra hiển thị tên người dùng
- [ ] Kiểm tra menu khách hàng hiển thị (Giỏ hàng, Đơn hàng)

### 1.2 Đăng xuất
- [ ] Click "Đăng xuất"
- [ ] Kiểm tra quay về trang đăng nhập
- [ ] Kiểm tra token đã bị xóa

### 1.3 Đăng ký (nếu có)
- [ ] Tìm form đăng ký
- [ ] Điền thông tin
- [ ] Submit form
- [ ] Kiểm tra tài khoản mới được tạo

---

## 🏠 2. Trang chủ

### 2.1 Hiển thị danh mục
- [ ] Xem danh sách danh mục sản phẩm
- [ ] Click vào danh mục để lọc sản phẩm
- [ ] Kiểm tra sản phẩm được lọc đúng

### 2.2 Hiển thị sản phẩm
- [ ] Xem danh sách "Tất cả sản phẩm"
- [ ] Xem danh sách "Sản phẩm nổi bật"
- [ ] Xem danh sách "Sản phẩm khuyến mãi"
- [ ] Kiểm tra hình ảnh sản phẩm hiển thị
- [ ] Kiểm tra giá sản phẩm hiển thị đúng
- [ ] Kiểm tra rating và số đánh giá

---

## 📦 3. Sản phẩm

### 3.1 Xem danh sách sản phẩm
- [ ] Click "Sản phẩm" trong menu
- [ ] Xem danh sách sản phẩm
- [ ] Kiểm tra pagination (nếu có)

### 3.2 Tìm kiếm sản phẩm
- [ ] Nhập từ khóa tìm kiếm
- [ ] Kiểm tra kết quả tìm kiếm
- [ ] Xóa từ khóa và kiểm tra hiển thị lại tất cả

### 3.3 Lọc theo danh mục
- [ ] Click vào danh mục để lọc
- [ ] Kiểm tra chỉ hiển thị sản phẩm trong danh mục đó
- [ ] Click "Tất cả" để bỏ lọc

### 3.4 Thêm vào giỏ hàng
- [ ] Click "Thêm vào giỏ" trên sản phẩm
- [ ] Kiểm tra thông báo thành công
- [ ] Kiểm tra sản phẩm đã được thêm vào giỏ hàng

---

## 🛒 4. Giỏ hàng

### 4.1 Xem giỏ hàng
- [ ] Click "Giỏ hàng" trong menu
- [ ] Kiểm tra hiển thị danh sách sản phẩm
- [ ] Kiểm tra số lượng, giá, tổng tiền

### 4.2 Cập nhật giỏ hàng
- [ ] Thay đổi số lượng sản phẩm (nếu có)
- [ ] Xóa sản phẩm khỏi giỏ hàng
- [ ] Kiểm tra tổng tiền cập nhật đúng

### 4.3 Thanh toán
- [ ] Click "Thanh toán"
- [ ] Kiểm tra form thanh toán hiển thị
- [ ] Điền thông tin địa chỉ giao hàng
- [ ] Chọn phương thức thanh toán
- [ ] Submit đơn hàng
- [ ] Kiểm tra đơn hàng được tạo thành công

---

## 📋 5. Đơn hàng

### 5.1 Xem danh sách đơn hàng
- [ ] Click "Đơn hàng" trong menu
- [ ] Kiểm tra hiển thị danh sách đơn hàng
- [ ] Kiểm tra thông tin: Mã đơn, Ngày đặt, Tổng tiền, Trạng thái

### 5.2 Xem chi tiết đơn hàng
- [ ] Click "Xem" trên một đơn hàng
- [ ] Kiểm tra hiển thị đầy đủ thông tin:
  - [ ] Thông tin khách hàng
  - [ ] Địa chỉ giao hàng
  - [ ] Danh sách sản phẩm
  - [ ] Tổng tiền
  - [ ] Trạng thái đơn hàng
  - [ ] Phương thức thanh toán

### 5.3 Hủy đơn hàng (nếu có)
- [ ] Tìm nút hủy đơn hàng
- [ ] Click hủy đơn hàng
- [ ] Nhập lý do hủy
- [ ] Kiểm tra đơn hàng đã được hủy
- [ ] Kiểm tra trạng thái cập nhật thành "cancelled"

---

## 💳 6. Thanh toán

### 6.1 Thanh toán COD
- [ ] Tạo đơn hàng với phương thức COD
- [ ] Kiểm tra đơn hàng được tạo
- [ ] Kiểm tra trạng thái thanh toán

### 6.2 Thanh toán ZaloPay
- [ ] Tạo đơn hàng với phương thức ZaloPay
- [ ] Kiểm tra redirect đến ZaloPay
- [ ] Test thanh toán (sandbox)
- [ ] Kiểm tra callback và cập nhật đơn hàng

### 6.3 Thanh toán MoMo
- [ ] Tạo đơn hàng với phương thức MoMo
- [ ] Kiểm tra redirect đến MoMo
- [ ] Test thanh toán (sandbox)
- [ ] Kiểm tra callback và cập nhật đơn hàng

### 6.4 Thanh toán VNPay
- [ ] Tạo đơn hàng với phương thức VNPay
- [ ] Kiểm tra redirect đến VNPay
- [ ] Test thanh toán (sandbox)
- [ ] Kiểm tra callback và cập nhật đơn hàng

---

## 📍 7. Địa chỉ giao hàng

### 7.1 Quản lý địa chỉ (nếu có)
- [ ] Xem danh sách địa chỉ đã lưu
- [ ] Thêm địa chỉ mới
- [ ] Sửa địa chỉ
- [ ] Xóa địa chỉ
- [ ] Đặt địa chỉ mặc định

### 7.2 Nhập địa chỉ khi thanh toán
- [ ] Điền thông tin địa chỉ:
  - [ ] Họ và tên
  - [ ] Số điện thoại
  - [ ] Địa chỉ chi tiết
  - [ ] Phường/Xã
  - [ ] Quận/Huyện
  - [ ] Tỉnh/Thành phố
- [ ] Kiểm tra validation
- [ ] Submit và kiểm tra lưu đúng

---

## ❤️ 8. Sản phẩm yêu thích (nếu có)

### 8.1 Thêm vào yêu thích
- [ ] Click nút yêu thích trên sản phẩm
- [ ] Kiểm tra sản phẩm đã được thêm

### 8.2 Xem danh sách yêu thích
- [ ] Truy cập trang yêu thích
- [ ] Kiểm tra hiển thị danh sách
- [ ] Xóa khỏi yêu thích

---

## 💬 9. Chat / Hỗ trợ (nếu có)

### 9.1 Gửi tin nhắn
- [ ] Mở chat/hỗ trợ
- [ ] Gửi tin nhắn
- [ ] Kiểm tra tin nhắn được gửi

### 9.2 Xem lịch sử chat
- [ ] Xem tin nhắn cũ
- [ ] Kiểm tra hiển thị đúng thứ tự

---

## 🔔 10. Thông báo (nếu có)

### 10.1 Xem thông báo
- [ ] Click icon thông báo
- [ ] Xem danh sách thông báo
- [ ] Đánh dấu đã đọc

---

## ⭐ 11. Đánh giá sản phẩm (nếu có)

### 11.1 Xem đánh giá
- [ ] Xem đánh giá trên trang sản phẩm
- [ ] Kiểm tra rating trung bình

### 11.2 Viết đánh giá
- [ ] Mua sản phẩm
- [ ] Viết đánh giá
- [ ] Chọn số sao
- [ ] Submit đánh giá
- [ ] Kiểm tra đánh giá hiển thị

---

## 🎫 12. Voucher / Mã giảm giá (nếu có)

### 12.1 Áp dụng voucher
- [ ] Nhập mã voucher khi thanh toán
- [ ] Kiểm tra giảm giá được áp dụng
- [ ] Kiểm tra tổng tiền cập nhật đúng

---

## 🔍 13. Tìm kiếm nâng cao

### 13.1 Tìm kiếm theo giá
- [ ] Lọc sản phẩm theo khoảng giá
- [ ] Kiểm tra kết quả đúng

### 13.2 Sắp xếp sản phẩm
- [ ] Sắp xếp theo giá tăng dần
- [ ] Sắp xếp theo giá giảm dần
- [ ] Sắp xếp theo tên
- [ ] Sắp xếp theo rating

---

## 📱 14. Responsive Design

### 14.1 Mobile
- [ ] Test trên mobile (hoặc resize browser)
- [ ] Kiểm tra menu hiển thị đúng
- [ ] Kiểm tra sản phẩm hiển thị đúng
- [ ] Kiểm tra form nhập liệu dễ dùng

### 14.2 Tablet
- [ ] Test trên tablet
- [ ] Kiểm tra layout phù hợp

---

## 🐛 15. Xử lý lỗi

### 15.1 Lỗi kết nối
- [ ] Tắt server
- [ ] Kiểm tra hiển thị thông báo lỗi
- [ ] Bật lại server và kiểm tra hoạt động lại

### 15.2 Lỗi validation
- [ ] Submit form với dữ liệu sai
- [ ] Kiểm tra hiển thị thông báo lỗi
- [ ] Sửa và submit lại

### 15.3 Lỗi 404
- [ ] Truy cập URL không tồn tại
- [ ] Kiểm tra hiển thị trang 404

---

## ✅ 16. Performance

### 16.1 Tốc độ tải
- [ ] Kiểm tra thời gian tải trang chủ
- [ ] Kiểm tra thời gian tải danh sách sản phẩm
- [ ] Kiểm tra thời gian tải giỏ hàng

### 16.2 Tối ưu hình ảnh
- [ ] Kiểm tra hình ảnh load nhanh
- [ ] Kiểm tra lazy loading (nếu có)

---

## 🔒 17. Bảo mật

### 17.1 Authentication
- [ ] Kiểm tra không thể truy cập trang cần đăng nhập khi chưa login
- [ ] Kiểm tra token được lưu an toàn
- [ ] Kiểm tra token hết hạn xử lý đúng

### 17.2 Authorization
- [ ] Kiểm tra customer không thể truy cập trang admin
- [ ] Kiểm tra customer chỉ xem được đơn hàng của mình

---

## 📝 18. Ghi chú khi test

### Tài khoản test:
- **Customer:**
  - Username: `customer1` (hoặc tài khoản customer bất kỳ)
  - Password: (mật khẩu của tài khoản)

- **Admin:**
  - Username: `admin`
  - Password: `admin123`

### Các bước test nhanh:
1. ✅ Đăng nhập với tài khoản customer
2. ✅ Xem trang chủ và sản phẩm
3. ✅ Thêm sản phẩm vào giỏ hàng
4. ✅ Xem giỏ hàng
5. ✅ Tạo đơn hàng
6. ✅ Xem đơn hàng
7. ✅ Test thanh toán (COD, ZaloPay, MoMo, VNPay)

---

## 🎯 Kết quả test

Sau khi test xong, ghi lại:
- [ ] Số chức năng đã test: ___ / ___
- [ ] Số chức năng hoạt động đúng: ___ / ___
- [ ] Số lỗi phát hiện: ___
- [ ] Danh sách lỗi:
  1. 
  2. 
  3. 

---

## 📞 Hỗ trợ

Nếu gặp lỗi:
1. Kiểm tra console browser (F12)
2. Kiểm tra logs server
3. Kiểm tra kết nối API
4. Kiểm tra database

**Chúc bạn test thành công!** 🎉

