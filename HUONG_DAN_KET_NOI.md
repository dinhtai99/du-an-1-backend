# Hướng dẫn kết nối với GitHub

## Cách 1: Sử dụng SSH (Khuyến nghị)

### Bước 1: Thêm SSH key vào GitHub

1. Copy SSH key của bạn:
```bash
cat ~/.ssh/id_rsa.pub
```

2. Truy cập: https://github.com/settings/keys
3. Click "New SSH key"
4. Đặt tên (ví dụ: "MacBook")
5. Paste SSH key vào ô "Key"
6. Click "Add SSH key"

### Bước 2: Cấu hình git user

```bash
git config --global user.name "Tên của bạn"
git config --global user.email "dinhtai1999t@gmail.com"
```

### Bước 3: Clone repository

```bash
cd /Users/trantai/Desktop
git clone git@github.com:dinhtai99/Du_an_1.git
```

### Bước 4: Kiểm tra kết nối

```bash
ssh -T git@github.com
```

Nếu thấy "Hi dinhtai99! You've successfully authenticated..." là thành công!

---

## Cách 2: Sử dụng HTTPS

### Bước 1: Tạo Personal Access Token

1. Truy cập: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Đặt tên token (ví dụ: "Shop_THB")
4. Chọn quyền: `repo` (full control)
5. Click "Generate token"
6. **Copy token ngay** (chỉ hiện 1 lần!)

### Bước 2: Clone repository

```bash
cd /Users/trantai/Desktop
git clone https://github.com/dinhtai99/Du_an_1.git
```

Khi được hỏi username: nhập `dinhtai99`
Khi được hỏi password: **paste token** (không phải mật khẩu GitHub!)

---

## Sau khi kết nối thành công

Chạy script để đẩy code backend:

```bash
cd /Users/trantai/Desktop/Shop_THB
./push_to_github.sh
```

Hoặc làm thủ công:

```bash
cd /Users/trantai/Desktop/Du_an_1
git pull origin main

# Copy code backend
cp -r /Users/trantai/Desktop/Shop_THB/controllers backend/
cp -r /Users/trantai/Desktop/Shop_THB/middleware backend/
cp -r /Users/trantai/Desktop/Shop_THB/models backend/
cp -r /Users/trantai/Desktop/Shop_THB/routes backend/
cp /Users/trantai/Desktop/Shop_THB/server.js backend/
cp /Users/trantai/Desktop/Shop_THB/package.json backend/
cp /Users/trantai/Desktop/Shop_THB/seed.js backend/
cp /Users/trantai/Desktop/Shop_THB/API_ENDPOINTS.md backend/
cp /Users/trantai/Desktop/Shop_THB/.gitignore backend/

# Commit và push
git add backend/
git commit -m "Add backend code to backend folder"
git push origin main
```

