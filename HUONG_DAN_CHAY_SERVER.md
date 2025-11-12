# Hướng dẫn chạy server trên localhost

## Các bước chạy server:

### 1. Cài đặt dependencies (nếu chưa cài)
```bash
cd /Users/trantai/Desktop/Shop_THB
npm install
```

### 2. Kiểm tra file .env
Đảm bảo file `.env` có cấu hình MongoDB:
```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
PORT=3000
JWT_SECRET=your_secret_key_here
```

### 3. Chạy server

**Cách 1: Chạy production mode**
```bash
npm start
```

**Cách 2: Chạy development mode (tự động restart khi có thay đổi)**
```bash
npm run dev
```

### 4. Kiểm tra server đã chạy
Sau khi chạy, bạn sẽ thấy:
```
✅ Connected to MongoDB Atlas
🚀 Server running on port 3000
```

### 5. Truy cập server
- **URL:** http://localhost:3000
- **API Test:** http://localhost:3000/
- **API Base:** http://localhost:3000/api

### 6. Test API
Mở trình duyệt hoặc dùng curl:
```bash
curl http://localhost:3000/
```

Hoặc mở trình duyệt và truy cập: http://localhost:3000

## Các endpoint chính:

- `GET /` - Test API
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/register` - Đăng ký
- `GET /api/products` - Lấy danh sách sản phẩm
- `GET /api/categories` - Lấy danh sách danh mục
- ... (xem file API_ENDPOINTS.md để biết đầy đủ)

## Dừng server:
Nhấn `Ctrl + C` trong terminal

