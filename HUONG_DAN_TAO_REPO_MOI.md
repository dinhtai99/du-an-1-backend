# Hướng dẫn tạo repository mới "dự án 1 backend"

## 📋 Các bước thực hiện:

### Bước 1: Tạo repository trên GitHub

1. Truy cập: https://github.com/new
2. **Repository name:** `du-an-1-backend`
3. **Description:** `Backend code for Shop THB project`
4. Chọn **Public** hoặc **Private** (tùy bạn)
5. **KHÔNG** tích "Add a README file"
6. **KHÔNG** tích "Add .gitignore"
7. **KHÔNG** tích "Choose a license"
8. Click **"Create repository"**

### Bước 2: Đẩy code lên GitHub

Sau khi tạo repository, chạy các lệnh sau:

```bash
cd /Users/trantai/Desktop/Shop_THB

# Kết nối với repository mới
git remote add origin https://github.com/dinhtai99/du-an-1-backend.git

# Đổi tên branch thành main
git branch -M main

# Đẩy code lên GitHub
git push -u origin main
```

### Hoặc chạy script tự động:

```bash
cd /Users/trantai/Desktop/Shop_THB
./push_to_new_repo.sh
```

---

## ✅ Đã hoàn thành:

- ✅ Cấu hình git user: `dinhtai99 <dinhtai1999t@gmail.com>`
- ✅ Khởi tạo git repository mới
- ✅ Commit code với email (để tránh lỗi graph)
- ✅ Sẵn sàng push lên GitHub

---

## 🔗 URL repository sau khi tạo:

https://github.com/dinhtai99/du-an-1-backend

---

## 📝 Lưu ý:

- Đảm bảo đã tạo repository trên GitHub trước khi push
- Repository name: `du-an-1-backend` (GitHub sẽ tự động chuyển thành lowercase)
- Code đã được commit với email để GitHub có thể render graph

