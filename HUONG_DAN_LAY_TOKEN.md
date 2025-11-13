# Hướng dẫn lấy Token

## 🔐 Cách lấy Token

### **Bước 1: Đăng nhập để lấy Token**

**Endpoint:**
```
POST http://localhost:3000/api/auth/login
```

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123",
  "rememberMe": false
}
```

**Response (Thành công):**
```json
{
  "message": "Đăng nhập thành công!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzBmODk4NzEyMzQ1Njc4OTAxMjM0NTYiLCJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzEwMjM0NTY3LCJleHAiOjE3MTAzMjA5Njd9.abc123xyz...",
  "user": {
    "id": "670f89871234567890123456",
    "username": "admin",
    "fullName": "Trần Đình Tài (Admin)",
    "role": "admin",
    "avatar": "",
    "phone": "0987654321"
  }
}
```

**Lưu token từ response:**
- Copy giá trị trong trường `token`
- Token này sẽ dùng để xác thực các request tiếp theo

---

## 📝 Cách sử dụng Token

### **1. Sử dụng trong Header (Khuyến nghị)**

Thêm token vào header `Authorization`:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Ví dụ với cURL:**
```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Ví dụ với JavaScript (fetch):**
```javascript
fetch('http://localhost:3000/api/users', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
```

**Ví dụ với Axios:**
```javascript
axios.get('http://localhost:3000/api/users', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

---

## 🔑 Tài khoản mẫu để test

### **Admin:**
- **Username:** `admin`
- **Password:** `admin123`

### **Nhân viên:**
- **Username:** `nhanvien1`
- **Password:** `staff123`

### **Customer (cần đăng ký trước):**
- Đăng ký qua: `POST /api/auth/register`

---

## 📋 Ví dụ đầy đủ

### **1. Đăng nhập và lấy token:**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123",
    "rememberMe": false
  }'
```

**Response:**
```json
{
  "message": "Đăng nhập thành công!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

### **2. Sử dụng token để gọi API:**

```bash
# Lấy danh sách users (cần token admin)
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Lấy thông tin user hiện tại
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Lấy danh sách sản phẩm (không cần token)
curl -X GET http://localhost:3000/api/products
```

---

## ⏰ Thời hạn Token

- **Không chọn "Lưu mật khẩu":** Token có hiệu lực **1 ngày**
- **Chọn "Lưu mật khẩu" (rememberMe: true):** Token có hiệu lực **30 ngày**

---

## 🔄 Đăng ký tài khoản mới (Customer)

**Endpoint:**
```
POST http://localhost:3000/api/auth/register
```

**Request Body:**
```json
{
  "username": "customer1",
  "password": "123456",
  "email": "customer1@example.com",
  "fullName": "Nguyễn Văn A",
  "phone": "0912345678"
}
```

**Response:**
```json
{
  "message": "Đăng ký thành công!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

Token sẽ được trả về ngay sau khi đăng ký thành công.

---

## ⚠️ Lưu ý

1. **Lưu token an toàn:** Không lưu token trong code hoặc commit lên Git
2. **Token hết hạn:** Nếu token hết hạn, cần đăng nhập lại để lấy token mới
3. **Format header:** Phải có từ khóa `Bearer` trước token (có khoảng trắng)
4. **Bảo mật:** Token chứa thông tin user, không chia sẻ token với người khác

---

## 🧪 Test với Postman

1. **Tạo request mới:** `POST http://localhost:3000/api/auth/login`
2. **Body (raw JSON):**
   ```json
   {
     "username": "admin",
     "password": "admin123"
   }
   ```
3. **Send request** → Copy token từ response
4. **Tạo request mới** → Vào tab **Authorization**
5. **Chọn Type:** `Bearer Token`
6. **Paste token** vào ô Token
7. **Send request**

---

## 🧪 Test với cURL (Terminal)

```bash
# 1. Đăng nhập và lấy token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# 2. In token ra màn hình
echo "Token: $TOKEN"

# 3. Sử dụng token
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📱 Test với JavaScript

```javascript
// 1. Đăng nhập và lấy token
async function login() {
  const response = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: 'admin',
      password: 'admin123',
      rememberMe: false
    })
  });
  
  const data = await response.json();
  const token = data.token;
  
  // Lưu token vào localStorage
  localStorage.setItem('token', token);
  
  return token;
}

// 2. Sử dụng token
async function getUsers() {
  const token = localStorage.getItem('token');
  
  const response = await fetch('http://localhost:3000/api/users', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  return data;
}
```

