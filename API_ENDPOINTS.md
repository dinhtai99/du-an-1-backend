# 📋 API Endpoints - Shop THB

## 🔐 Authentication (`/api/auth`)

### POST `/api/auth/login`
Đăng nhập
- **Body**: `{ username, password, rememberMe? }`
- **Response**: `{ message, token, user }`

### POST `/api/auth/logout`
Đăng xuất (cần token)
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ message }`

### PUT `/api/auth/change-password`
Đổi mật khẩu (cần token)
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ oldPassword, newPassword, confirmPassword }`
- **Response**: `{ message }`

### GET `/api/auth/me`
Lấy thông tin user hiện tại (cần token)
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ user }`

---

## 👥 Users (`/api/users`) - Admin only

### GET `/api/users`
Lấy danh sách nhân viên
- **Query**: `?search=&role=&page=1&limit=10`
- **Response**: `{ users, total, page, limit, totalPages }`

### GET `/api/users/:id`
Lấy chi tiết nhân viên
- **Response**: `{ user }`

### POST `/api/users`
Thêm nhân viên mới
- **Body**: `{ username, password, fullName, gender?, dateOfBirth?, phone?, role?, avatar? }`
- **Response**: `{ message, user }`

### PUT `/api/users/:id`
Cập nhật nhân viên
- **Body**: `{ fullName?, gender?, dateOfBirth?, phone?, role?, avatar?, password? }`
- **Response**: `{ message, user }`

### DELETE `/api/users/:id`
Xóa nhân viên
- **Response**: `{ message }`

---

## 🗂️ Categories (`/api/categories`)

### GET `/api/categories`
Lấy danh sách loại sản phẩm
- **Query**: `?search=&status=&page=1&limit=10`
- **Response**: `{ categories, total, page, limit, totalPages }`

### GET `/api/categories/all`
Lấy tất cả loại sản phẩm (không phân trang)
- **Response**: `[categories]`

### GET `/api/categories/:id`
Lấy chi tiết loại sản phẩm
- **Response**: `{ category }`

### POST `/api/categories`
Thêm loại sản phẩm (cần token)
- **Body**: `{ name, description? }`
- **Response**: `{ message, category }`

### PUT `/api/categories/:id`
Cập nhật loại sản phẩm (cần token)
- **Body**: `{ name?, description?, status? }`
- **Response**: `{ message, category }`

### DELETE `/api/categories/:id`
Xóa loại sản phẩm (cần token)
- **Response**: `{ message }`

### GET `/api/categories/:id/products`
Lấy danh sách sản phẩm theo loại
- **Response**: `[products]`

---

## 📦 Products (`/api/products`)

### GET `/api/products`
Lấy danh sách sản phẩm
- **Query**: `?search=&category=&minPrice=&maxPrice=&status=&lowStock=&page=1&limit=10`
- **Response**: `{ products, total, page, limit, totalPages }`

### GET `/api/products/:id`
Lấy chi tiết sản phẩm
- **Response**: `{ product }`

### POST `/api/products`
Thêm sản phẩm mới (cần token)
- **Body**: `{ name, category, importPrice, price, stock?, minStock?, description?, images?, image? }`
- **Response**: `{ message, product }`

### PUT `/api/products/:id`
Cập nhật sản phẩm (cần token)
- **Body**: `{ name?, category?, importPrice?, price?, stock?, minStock?, description?, images?, image?, status? }`
- **Response**: `{ message, product }`

### DELETE `/api/products/:id`
Xóa/Ẩn sản phẩm (cần token)
- **Query**: `?hardDelete=true` (để xóa vĩnh viễn)
- **Response**: `{ message }`

### GET `/api/products/low-stock/all`
Lấy sản phẩm tồn kho thấp (cần token)
- **Response**: `[products]`

### GET `/api/products/export/excel`
Export Excel (cần token)
- **Response**: `{ message, data, total }`

---

## 🧑‍💼 Customers (`/api/customers`)

### GET `/api/customers`
Lấy danh sách khách hàng
- **Query**: `?search=&type=&active=&page=1&limit=10`
- **Response**: `{ customers, total, page, limit, totalPages }`

### GET `/api/customers/:id`
Lấy chi tiết khách hàng (kèm thống kê)
- **Response**: `{ customer, statistics: { totalOrders, totalSpent } }`

### POST `/api/customers`
Thêm khách hàng mới (cần token)
- **Body**: `{ name, phone?, address?, type? }`
- **Response**: `{ message, customer }`

### PUT `/api/customers/:id`
Cập nhật khách hàng (cần token)
- **Body**: `{ name?, phone?, address?, type?, active? }`
- **Response**: `{ message, customer }`

### PATCH `/api/customers/:id/active`
Active/Deactive khách hàng (cần token)
- **Body**: `{ active: true/false }`
- **Response**: `{ message, customer }`

### DELETE `/api/customers/:id`
Xóa khách hàng (cần token)
- **Response**: `{ message }`

### GET `/api/customers/:id/statistics`
Thống kê khách hàng (cần token)
- **Query**: `?startDate=&endDate=`
- **Response**: `{ totalOrders, totalSpent, averageOrderValue, invoices }`

---

## 🧾 Invoices (`/api/invoices`)

### GET `/api/invoices`
Lấy danh sách hóa đơn (cần token)
- **Query**: `?search=&customer=&staff=&status=&paymentMethod=&startDate=&endDate=&page=1&limit=10`
- **Response**: `{ invoices, total, page, limit, totalPages }`

### GET `/api/invoices/:id`
Lấy chi tiết hóa đơn (cần token)
- **Response**: `{ invoice }`

### POST `/api/invoices`
Tạo hóa đơn mới (cần token)
- **Body**: `{ customer, items: [{ product, quantity, price?, discount? }], discount?, paymentMethod?, notes? }`
- **Response**: `{ message, invoice }`

### PUT `/api/invoices/:id`
Cập nhật hóa đơn (cần token)
- **Body**: `{ items?, discount?, paymentMethod?, status?, notes? }`
- **Response**: `{ message, invoice }`

### PATCH `/api/invoices/:id/status`
Cập nhật trạng thái hóa đơn (cần token)
- **Body**: `{ status: "pending" | "completed" | "cancelled" }`
- **Response**: `{ message, invoice }`

### DELETE `/api/invoices/:id`
Xóa hóa đơn (cần token, chỉ xóa pending/cancelled)
- **Response**: `{ message }`

### GET `/api/invoices/:id/pdf`
Xuất PDF hóa đơn (cần token)
- **Response**: `{ message, invoice }`

---

## 📊 Statistics (`/api/statistics`)

### GET `/api/statistics/overview`
Tổng hợp thống kê tổng quan (cần token)
- **Query**: `?startDate=&endDate=`
- **Response**: `{ totalInvoices, totalRevenue, totalProfit, totalProducts, totalCustomers, lowStockProducts }`

### GET `/api/statistics/top-products/quantity`
Top sản phẩm bán chạy theo số lượng (cần token)
- **Query**: `?limit=5&startDate=&endDate=`
- **Response**: `[{ product, quantity, revenue }]`

### GET `/api/statistics/top-products/revenue`
Top sản phẩm bán chạy theo doanh thu (cần token)
- **Query**: `?limit=5&startDate=&endDate=`
- **Response**: `[{ product, quantity, revenue }]`

### GET `/api/statistics/revenue/daily`
Doanh thu theo ngày (cần token)
- **Query**: `?startDate=&endDate=`
- **Response**: `[{ date, revenue, count }]`

### GET `/api/statistics/revenue/monthly`
Doanh thu theo tháng (cần token)
- **Query**: `?year=2024`
- **Response**: `[{ month, revenue, count }]`

### GET `/api/statistics/revenue/yearly`
Doanh thu theo năm (cần token)
- **Response**: `[{ year, revenue, count }]`

### GET `/api/statistics/low-stock`
Sản phẩm tồn kho thấp (cần token)
- **Response**: `[{ product, stock, minStock, warning }]`

### GET `/api/statistics/payment-methods`
Thống kê theo phương thức thanh toán (cần token)
- **Query**: `?startDate=&endDate=`
- **Response**: `{ cash: { count, revenue }, transfer: { count, revenue }, card: { count, revenue } }`

---

## 📝 Ghi chú

- Tất cả API cần token (trừ login) đều yêu cầu header: `Authorization: Bearer <token>`
- Các API Users yêu cầu quyền Admin
- Phân trang mặc định: `page=1&limit=10`
- Date format: `YYYY-MM-DD` hoặc ISO 8601
- Payment methods: `cash`, `transfer`, `card`
- Invoice status: `pending`, `completed`, `cancelled`
- User roles: `admin`, `staff`
- Customer types: `VIP`, `Normal`

