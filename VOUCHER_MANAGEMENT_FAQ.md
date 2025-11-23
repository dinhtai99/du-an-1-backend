# ❓ Câu hỏi về Quản lý Voucher

## 1️⃣ **Quản lý voucher có cho phép ai được sử dụng không?**

✅ **CÓ!** Hệ thống hỗ trợ giới hạn người dùng được sử dụng voucher.

### Cách hoạt động:

1. **Trong form thêm/sửa voucher**, có trường:
   ```
   "Người dùng áp dụng (để trống = tất cả user đều dùng được)"
   ```

2. **Nếu để trống** (không nhập gì):
   - ✅ Tất cả khách hàng đều có thể sử dụng voucher này
   - `applicableUsers = []` (mảng rỗng)

3. **Nếu nhập ID user** (cách nhau bởi dấu phẩy):
   - ✅ Chỉ những user có ID trong danh sách mới được sử dụng
   - Ví dụ: `507f1f77bcf86cd799439011, 507f1f77bcf86cd799439012`
   - `applicableUsers = [ObjectId1, ObjectId2, ...]`

### Logic kiểm tra khi user sử dụng voucher:

```javascript
// Trong routes/vouchers.js và routes/orders.js
if (voucher.applicableUsers.length > 0) {
  // Nếu có giới hạn user
  const isApplicable = voucher.applicableUsers.some(
    id => id.toString() === req.user.userId.toString()
  );
  if (!isApplicable) {
    return res.status(400).json({ 
      message: "Bạn không được sử dụng voucher này!" 
    });
  }
}
// Nếu applicableUsers = [] (rỗng) → tất cả user đều dùng được
```

### Hiển thị trong Admin Panel:

- **Bảng voucher**: Có cột "Người dùng áp dụng" hiển thị:
  - `"Tất cả"` nếu không giới hạn
  - `"1 user (...)"` hoặc `"N users"` nếu có giới hạn

- **Chi tiết voucher**: Hiển thị đầy đủ danh sách ID user được phép sử dụng

---

## 2️⃣ **Thay đổi voucher thì có áp dụng ngay không?**

✅ **CÓ!** Thay đổi voucher sẽ áp dụng ngay lập tức.

### Cách hoạt động:

1. **Khi admin sửa voucher** (PUT `/api/vouchers/:id`):
   - Dữ liệu được lưu ngay vào database
   - `updatedAt` được tự động cập nhật

2. **Khi user validate/check voucher**:
   - Hệ thống query từ database mới nhất
   - Áp dụng ngay các thay đổi (status, thời gian, số lượng, applicableUsers, ...)

3. **Không cần restart server**:
   - Thay đổi có hiệu lực ngay cho các request mới
   - User đang checkout sẽ thấy thay đổi ngay khi validate lại voucher

### Ví dụ:

```
10:00 AM - Admin sửa voucher: status = 0 (dừng hoạt động)
10:01 AM - User A validate voucher → ❌ "Voucher đã bị vô hiệu hóa!"

10:05 AM - Admin sửa lại: status = 1 (hoạt động)
10:06 AM - User B validate voucher → ✅ "Voucher hợp lệ!"
```

---

## 3️⃣ **Dừng hoạt động, sửa xong đủ điều kiện thì có được sử dụng tiếp không?**

✅ **CÓ!** Voucher sẽ hoạt động lại ngay khi đủ điều kiện.

### Các điều kiện để voucher hợp lệ:

1. ✅ `status = 1` (đang hiển thị, không bị dừng)
2. ✅ `quantity > usedCount` (còn số lượng)
3. ✅ `now >= startDate` (đã đến ngày bắt đầu)
4. ✅ `now <= endDate` (chưa quá ngày kết thúc)

### Quy trình khôi phục voucher:

```
Bước 1: Voucher đang "Dừng hoạt động" (status = 0)
        → User không thể sử dụng

Bước 2: Admin sửa voucher:
        - Đổi status = 1 (Hoạt động)
        - Kiểm tra: quantity > usedCount
        - Kiểm tra: startDate <= now <= endDate

Bước 3: Lưu voucher → Áp dụng ngay!

Bước 4: User validate voucher → ✅ "Voucher hợp lệ!"
```

### Logic kiểm tra trong code:

```javascript
// routes/vouchers.js - Method isValid()
voucherSchema.methods.isValid = function () {
  const now = new Date();
  return (
    this.status === 1 &&                    // ✅ Đang hoạt động
    this.quantity > this.usedCount &&       // ✅ Còn số lượng
    now >= this.startDate &&                // ✅ Đã đến ngày bắt đầu
    now <= this.endDate                     // ✅ Chưa quá hạn
  );
};

// Khi validate voucher
if (voucher.status === 0) {
  return res.status(400).json({ 
    message: "Voucher đã bị vô hiệu hóa!" 
  });
}
// Nếu status = 1 và đủ điều kiện → hợp lệ!
```

### Lưu ý:

- ⚠️ Nếu voucher đã hết số lượng (`usedCount >= quantity`), dù sửa `status = 1` vẫn không dùng được
- ⚠️ Nếu voucher đã quá hạn (`endDate < now`), cần sửa `endDate` mới dùng được
- ⚠️ Nếu voucher chưa đến ngày (`startDate > now`), cần đợi đến ngày bắt đầu

---

## 📋 Tóm tắt

| Câu hỏi | Trả lời | Chi tiết |
|---------|---------|----------|
| **Có giới hạn user được sử dụng?** | ✅ Có | Nhập ID user trong trường "Người dùng áp dụng", để trống = tất cả |
| **Thay đổi có áp dụng ngay?** | ✅ Có | Lưu vào DB ngay, user validate sẽ thấy thay đổi ngay |
| **Dừng hoạt động rồi sửa lại có dùng được?** | ✅ Có | Sửa `status = 1` + đủ điều kiện → hoạt động lại ngay |

---

## 🔧 Cách sử dụng trong Admin Panel

### Thêm/Sửa voucher với giới hạn user:

1. Mở form thêm/sửa voucher
2. Tìm trường **"Người dùng áp dụng"**
3. **Để trống** = tất cả user dùng được
4. **Nhập ID user** (cách nhau bởi dấu phẩy) = chỉ user đó dùng được
   - Ví dụ: `507f1f77bcf86cd799439011, 507f1f77bcf86cd799439012`
5. Lưu → Áp dụng ngay!

### Khôi phục voucher đã dừng hoạt động:

1. Tìm voucher có trạng thái "Dừng hoạt động"
2. Click "Sửa"
3. Đổi **Trạng thái** = `1` (Hoạt động)
4. Kiểm tra:
   - Số lượng còn lại > 0
   - Ngày bắt đầu <= hôm nay
   - Ngày kết thúc >= hôm nay
5. Lưu → Voucher hoạt động lại ngay!

---

## 🧪 Test thử

### Test giới hạn user:

```bash
# 1. Tạo voucher chỉ cho user A
POST /api/vouchers
{
  "code": "TEST001",
  "applicableUsers": ["507f1f77bcf86cd799439011"]  # Chỉ user A
}

# 2. User A validate → ✅ Hợp lệ
GET /api/vouchers/validate/TEST001
Headers: Authorization: Bearer <token_user_A>

# 3. User B validate → ❌ "Bạn không được sử dụng voucher này!"
GET /api/vouchers/validate/TEST001
Headers: Authorization: Bearer <token_user_B>
```

### Test thay đổi áp dụng ngay:

```bash
# 1. Tạo voucher
POST /api/vouchers
{ "code": "TEST002", "status": 1 }

# 2. User validate → ✅ Hợp lệ
GET /api/vouchers/validate/TEST002

# 3. Admin sửa status = 0
PUT /api/vouchers/{id}
{ "status": 0 }

# 4. User validate lại → ❌ "Voucher đã bị vô hiệu hóa!"

# 5. Admin sửa lại status = 1
PUT /api/vouchers/{id}
{ "status": 1 }

# 6. User validate lại → ✅ Hợp lệ (áp dụng ngay!)
```

---

## 📝 Lưu ý quan trọng

1. **applicableUsers** là mảng ObjectId, không phải string
2. Khi nhập ID trong form, hệ thống tự động parse thành mảng
3. Nếu nhập ID không tồn tại, voucher vẫn lưu được nhưng user đó không tồn tại nên không ai dùng được
4. Nên kiểm tra ID user trước khi lưu voucher

