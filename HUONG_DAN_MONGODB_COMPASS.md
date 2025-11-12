# Hướng dẫn kết nối MongoDB Compass với MongoDB Atlas

## Cách 1: Sử dụng Connection String (Đơn giản nhất)

### Bước 1: Mở MongoDB Compass
- Mở ứng dụng MongoDB Compass trên máy của bạn

### Bước 2: Nhập Connection String
1. Trong MongoDB Compass, bạn sẽ thấy ô "New Connection"
2. Dán connection string sau vào:

  ```
  mongodb+srv://dinhtai1999t_db_user:2G129QuNkriGMgFs@shopthb.5hg5nbe.mongodb.net/ShopTHB?retryWrites=true&w=majority
  ```

3. Click nút **"Connect"**

### Bước 3: Kết nối thành công
- Nếu kết nối thành công, bạn sẽ thấy database `ShopTHB` và các collections

---

## Cách 2: Kết nối từng bước (Fill form)

### Bước 1: Mở MongoDB Compass
- Mở ứng dụng MongoDB Compass

### Bước 2: Chọn "Fill in connection fields individually"

### Bước 3: Điền thông tin:
- **Connection Name:** ShopTHB (tên tùy chọn)
- **Hostname:** shopthb.5hg5nbe.mongodb.net
- **Port:** (để trống - MongoDB Atlas tự động)
- **Authentication:** Username / Password
  - **Username:** dinhtai1999t_db_user
  - **Password:** 2G129QuNkriGMgFs
- **Authentication Database:** admin (hoặc để mặc định)
- **Replica Set Name:** (để trống)
- **Read Preference:** Primary
- **SSL:** Require (bật)

### Bước 4: Click "Connect"

---

## Cách 3: Lấy Connection String từ MongoDB Atlas

Nếu bạn muốn lấy connection string mới từ MongoDB Atlas:

1. Truy cập: https://cloud.mongodb.com/
2. Đăng nhập vào tài khoản của bạn
3. Chọn cluster của bạn
4. Click nút **"Connect"**
5. Chọn **"Connect using MongoDB Compass"**
6. Copy connection string
7. Thay `<password>` bằng mật khẩu thực tế
8. Dán vào MongoDB Compass và click "Connect"

---

## Lưu ý quan trọng:

### 1. IP Whitelist (Nếu không kết nối được)
- Truy cập MongoDB Atlas → Network Access
- Đảm bảo IP của bạn đã được thêm vào whitelist
- Hoặc thêm `0.0.0.0/0` để cho phép tất cả IP (chỉ dùng cho development)

### Bước thêm IP:
1. Vào MongoDB Atlas → **Network Access**
2. Click **"Add IP Address"**
3. Click **"Allow Access from Anywhere"** (cho development)
   - Hoặc thêm IP cụ thể của bạn
4. Click **"Confirm"**

### 2. Database User
- Đảm bảo user `dinhtai1999t_db_user` có quyền truy cập database `ShopTHB`

### 3. SSL/TLS
- MongoDB Atlas yêu cầu SSL, MongoDB Compass sẽ tự động xử lý

---

## Sau khi kết nối thành công:

Bạn sẽ thấy:
- Database: `ShopTHB`
- Các collections như: `users`, `products`, `categories`, `customers`, `invoices`, v.v.

Bạn có thể:
- Xem dữ liệu trong các collections
- Thêm, sửa, xóa documents
- Chạy queries
- Xem indexes

---

## Troubleshooting:

### Lỗi: "Authentication failed"
- Kiểm tra lại username và password
- Đảm bảo user có quyền truy cập database

### Lỗi: "Cannot connect to server"
- Kiểm tra IP whitelist trong MongoDB Atlas
- Kiểm tra kết nối internet
- Thử thêm IP của bạn vào Network Access

### Lỗi: "SSL handshake failed"
- Đảm bảo SSL được bật trong MongoDB Compass
- Kiểm tra firewall/antivirus có chặn kết nối không

