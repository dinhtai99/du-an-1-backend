# 🔑 API Quên Mật Khẩu cho Android App

## Tổng quan

API quên mật khẩu cho phép khách hàng đặt lại mật khẩu khi quên. Quy trình gồm 2 bước:
1. **Yêu cầu reset mật khẩu** - Gửi email/username để nhận reset token
2. **Đặt lại mật khẩu** - Sử dụng token để đặt mật khẩu mới

---

## 📍 Bước 1: Yêu cầu Reset Mật Khẩu

### Endpoint

```
POST /api/auth/forgot-password
Content-Type: application/json
```

### Request Body

```json
{
  "email": "user@example.com"  // Hoặc
}
```

**Hoặc:**

```json
{
  "username": "username123"
}
```

**Lưu ý:** Chỉ cần gửi một trong hai: `email` hoặc `username`

### Response Thành công

#### Development Mode (trả về token để test)

```json
{
  "success": true,
  "message": "Nếu email/tên đăng nhập tồn tại, chúng tôi đã gửi link đặt lại mật khẩu!",
  "resetToken": "a1b2c3d4e5f6...",
  "expiresAt": "2024-11-23T13:30:00.000Z",
  "note": "⚠️ Development mode: Token được trả về để test. Trong production sẽ gửi qua email."
}
```

#### Production Mode (chỉ trả về message)

```json
{
  "success": true,
  "message": "Nếu email/tên đăng nhập tồn tại, chúng tôi đã gửi link đặt lại mật khẩu!"
}
```

### Error Responses

#### 1. Thiếu thông tin

```json
{
  "success": false,
  "message": "Vui lòng nhập email hoặc tên đăng nhập!"
}
```
**Status Code:** 400

#### 2. Tài khoản bị khóa

```json
{
  "success": false,
  "message": "Tài khoản đã bị khóa. Vui lòng liên hệ admin!"
}
```
**Status Code:** 403

---

## 📍 Bước 2: Đặt lại Mật Khẩu

### Endpoint

```
POST /api/auth/reset-password
Content-Type: application/json
```

### Request Body

```json
{
  "token": "a1b2c3d4e5f6...",
  "newPassword": "newpassword123",
  "confirmPassword": "newpassword123"
}
```

### Response Thành công

```json
{
  "success": true,
  "message": "Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại."
}
```

### Error Responses

#### 1. Thiếu thông tin

```json
{
  "success": false,
  "message": "Vui lòng điền đầy đủ thông tin!"
}
```
**Status Code:** 400

#### 2. Mật khẩu không khớp

```json
{
  "success": false,
  "message": "Mật khẩu mới và xác nhận mật khẩu không khớp!"
}
```
**Status Code:** 400

#### 3. Mật khẩu quá ngắn

```json
{
  "success": false,
  "message": "Mật khẩu mới phải có ít nhất 6 ký tự!"
}
```
**Status Code:** 400

#### 4. Token không hợp lệ hoặc hết hạn

```json
{
  "success": false,
  "message": "Token không hợp lệ hoặc đã hết hạn! Vui lòng yêu cầu đặt lại mật khẩu lại."
}
```
**Status Code:** 400

#### 5. Tài khoản bị khóa

```json
{
  "success": false,
  "message": "Tài khoản đã bị khóa. Vui lòng liên hệ admin!"
}
```
**Status Code:** 403

---

## 📱 Ví dụ sử dụng trong Android (Kotlin)

### 1. Data Classes

```kotlin
data class ForgotPasswordRequest(
    val email: String? = null,
    val username: String? = null
)

data class ForgotPasswordResponse(
    val success: Boolean,
    val message: String,
    val resetToken: String? = null,
    val expiresAt: String? = null,
    val note: String? = null
)

data class ResetPasswordRequest(
    val token: String,
    val newPassword: String,
    val confirmPassword: String
)

data class ResetPasswordResponse(
    val success: Boolean,
    val message: String
)

data class ErrorResponse(
    val success: Boolean,
    val message: String
)
```

### 2. Hàm yêu cầu reset mật khẩu

```kotlin
suspend fun requestPasswordReset(email: String? = null, username: String? = null): Result<ForgotPasswordResponse> {
    return try {
        if (email == null && username == null) {
            return Result.failure(Exception("Vui lòng nhập email hoặc tên đăng nhập!"))
        }
        
        val requestBody = jsonObjectOf(
            "email" to (email ?: ""),
            "username" to (username ?: "")
        ).apply {
            if (email != null) remove("username")
            else remove("email")
        }
        
        val response = httpClient.post("${API_BASE}/auth/forgot-password") {
            headers {
                append("Content-Type", "application/json")
            }
            setBody(requestBody.toString())
        }
        
        if (response.status.isSuccess()) {
            val result = json.decodeFromString<ForgotPasswordResponse>(response.bodyAsText())
            Result.success(result)
        } else {
            val error = json.decodeFromString<ErrorResponse>(response.bodyAsText())
            Result.failure(Exception(error.message))
        }
    } catch (e: Exception) {
        Result.failure(e)
    }
}
```

### 3. Hàm đặt lại mật khẩu

```kotlin
suspend fun resetPassword(token: String, newPassword: String, confirmPassword: String): Result<ResetPasswordResponse> {
    return try {
        // Validate
        if (newPassword != confirmPassword) {
            return Result.failure(Exception("Mật khẩu mới và xác nhận mật khẩu không khớp!"))
        }
        
        if (newPassword.length < 6) {
            return Result.failure(Exception("Mật khẩu mới phải có ít nhất 6 ký tự!"))
        }
        
        val requestBody = jsonObjectOf(
            "token" to token,
            "newPassword" to newPassword,
            "confirmPassword" to confirmPassword
        )
        
        val response = httpClient.post("${API_BASE}/auth/reset-password") {
            headers {
                append("Content-Type", "application/json")
            }
            setBody(requestBody.toString())
        }
        
        if (response.status.isSuccess()) {
            val result = json.decodeFromString<ResetPasswordResponse>(response.bodyAsText())
            Result.success(result)
        } else {
            val error = json.decodeFromString<ErrorResponse>(response.bodyAsText())
            Result.failure(Exception(error.message))
        }
    } catch (e: Exception) {
        Result.failure(e)
    }
}
```

### 4. UI Flow - ForgotPasswordActivity

```kotlin
class ForgotPasswordActivity : AppCompatActivity() {
    private lateinit var binding: ActivityForgotPasswordBinding
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityForgotPasswordBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        setupViews()
    }
    
    private fun setupViews() {
        binding.btnRequestReset.setOnClickListener {
            requestPasswordReset()
        }
    }
    
    private fun requestPasswordReset() {
        val email = binding.etEmail.text.toString().trim()
        val username = binding.etUsername.text.toString().trim()
        
        if (email.isEmpty() && username.isEmpty()) {
            Toast.makeText(this, "Vui lòng nhập email hoặc tên đăng nhập!", Toast.LENGTH_SHORT).show()
            return
        }
        
        // Show loading
        binding.progressBar.visibility = View.VISIBLE
        binding.btnRequestReset.isEnabled = false
        
        lifecycleScope.launch {
            when (val result = requestPasswordReset(
                email = if (email.isNotEmpty()) email else null,
                username = if (username.isNotEmpty()) username else null
            )) {
                is Result.Success -> {
                    val response = result.getOrNull()
                    if (response?.success == true) {
                        // Lưu token nếu có (development mode)
                        val token = response.resetToken
                        if (token != null) {
                            // Chuyển sang màn hình nhập token và mật khẩu mới
                            val intent = Intent(this@ForgotPasswordActivity, ResetPasswordActivity::class.java)
                            intent.putExtra("resetToken", token)
                            startActivity(intent)
                        } else {
                            // Production mode: hướng dẫn user kiểm tra email
                            showEmailSentDialog()
                        }
                    } else {
                        Toast.makeText(this@ForgotPasswordActivity, response?.message ?: "Lỗi không xác định", Toast.LENGTH_SHORT).show()
                    }
                }
                is Result.Failure -> {
                    Toast.makeText(this@ForgotPasswordActivity, result.exception.message ?: "Lỗi kết nối", Toast.LENGTH_SHORT).show()
                }
            }
            
            binding.progressBar.visibility = View.GONE
            binding.btnRequestReset.isEnabled = true
        }
    }
    
    private fun showEmailSentDialog() {
        AlertDialog.Builder(this)
            .setTitle("Yêu cầu đã được gửi")
            .setMessage("Nếu email/tên đăng nhập tồn tại, chúng tôi đã gửi link đặt lại mật khẩu qua email. Vui lòng kiểm tra hộp thư của bạn.")
            .setPositiveButton("OK") { _, _ ->
                finish()
            }
            .show()
    }
}
```

### 5. UI Flow - ResetPasswordActivity

```kotlin
class ResetPasswordActivity : AppCompatActivity() {
    private lateinit var binding: ActivityResetPasswordBinding
    private var resetToken: String? = null
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityResetPasswordBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        resetToken = intent.getStringExtra("resetToken")
        
        if (resetToken == null) {
            // Nếu không có token, cho user nhập token từ email
            binding.etToken.visibility = View.VISIBLE
        } else {
            binding.etToken.visibility = View.GONE
        }
        
        setupViews()
    }
    
    private fun setupViews() {
        binding.btnResetPassword.setOnClickListener {
            resetPassword()
        }
    }
    
    private fun resetPassword() {
        val token = resetToken ?: binding.etToken.text.toString().trim()
        val newPassword = binding.etNewPassword.text.toString()
        val confirmPassword = binding.etConfirmPassword.text.toString()
        
        if (token.isEmpty()) {
            Toast.makeText(this, "Vui lòng nhập token!", Toast.LENGTH_SHORT).show()
            return
        }
        
        if (newPassword.length < 6) {
            Toast.makeText(this, "Mật khẩu mới phải có ít nhất 6 ký tự!", Toast.LENGTH_SHORT).show()
            return
        }
        
        if (newPassword != confirmPassword) {
            Toast.makeText(this, "Mật khẩu mới và xác nhận mật khẩu không khớp!", Toast.LENGTH_SHORT).show()
            return
        }
        
        // Show loading
        binding.progressBar.visibility = View.VISIBLE
        binding.btnResetPassword.isEnabled = false
        
        lifecycleScope.launch {
            when (val result = resetPassword(token, newPassword, confirmPassword)) {
                is Result.Success -> {
                    val response = result.getOrNull()
                    if (response?.success == true) {
                        // Thành công - chuyển về màn hình đăng nhập
                        AlertDialog.Builder(this@ResetPasswordActivity)
                            .setTitle("Thành công")
                            .setMessage(response.message)
                            .setPositiveButton("Đăng nhập") { _, _ ->
                                finish()
                                // Có thể mở LoginActivity ở đây
                            }
                            .setCancelable(false)
                            .show()
                    } else {
                        Toast.makeText(this@ResetPasswordActivity, response?.message ?: "Lỗi không xác định", Toast.LENGTH_SHORT).show()
                    }
                }
                is Result.Failure -> {
                    Toast.makeText(this@ResetPasswordActivity, result.exception.message ?: "Lỗi kết nối", Toast.LENGTH_SHORT).show()
                }
            }
            
            binding.progressBar.visibility = View.GONE
            binding.btnResetPassword.isEnabled = true
        }
    }
}
```

### 6. Layout XML - activity_forgot_password.xml

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="16dp">
    
    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Quên mật khẩu"
        android:textSize="24sp"
        android:textStyle="bold"
        android:layout_marginBottom="24dp"/>
    
    <EditText
        android:id="@+id/etEmail"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:hint="Email"
        android:inputType="textEmailAddress"
        android:layout_marginBottom="16dp"/>
    
    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="HOẶC"
        android:textStyle="bold"
        android:layout_gravity="center"
        android:layout_marginBottom="16dp"/>
    
    <EditText
        android:id="@+id/etUsername"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:hint="Tên đăng nhập"
        android:inputType="text"
        android:layout_marginBottom="24dp"/>
    
    <Button
        android:id="@+id/btnRequestReset"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Gửi yêu cầu đặt lại mật khẩu"/>
    
    <ProgressBar
        android:id="@+id/progressBar"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_gravity="center"
        android:visibility="gone"/>
</LinearLayout>
```

### 7. Layout XML - activity_reset_password.xml

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="16dp">
    
    <TextView
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Đặt lại mật khẩu"
        android:textSize="24sp"
        android:textStyle="bold"
        android:layout_marginBottom="24dp"/>
    
    <EditText
        android:id="@+id/etToken"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:hint="Token (từ email)"
        android:inputType="text"
        android:layout_marginBottom="16dp"
        android:visibility="gone"/>
    
    <EditText
        android:id="@+id/etNewPassword"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:hint="Mật khẩu mới (ít nhất 6 ký tự)"
        android:inputType="textPassword"
        android:layout_marginBottom="16dp"/>
    
    <EditText
        android:id="@+id/etConfirmPassword"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:hint="Xác nhận mật khẩu"
        android:inputType="textPassword"
        android:layout_marginBottom="24dp"/>
    
    <Button
        android:id="@+id/btnResetPassword"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Đặt lại mật khẩu"/>
    
    <ProgressBar
        android:id="@+id/progressBar"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_gravity="center"
        android:visibility="gone"/>
</LinearLayout>
```

---

## ⚠️ Lưu ý quan trọng

### 1. Bảo mật

- ✅ API không tiết lộ user có tồn tại hay không (trả về message giống nhau)
- ✅ Reset token có thời hạn 1 giờ
- ✅ Token chỉ dùng được 1 lần (sau khi đặt lại mật khẩu sẽ bị xóa)
- ✅ Mật khẩu được mã hóa bằng bcrypt

### 2. Development vs Production

- **Development:** API trả về `resetToken` để test
- **Production:** API chỉ trả về message, token sẽ được gửi qua email

### 3. Token Expiry

- Token có thời hạn **1 giờ** (60 phút)
- Sau khi hết hạn, user cần yêu cầu reset lại

### 4. Validation

- Mật khẩu mới: tối thiểu 6 ký tự
- Mật khẩu mới và xác nhận phải khớp
- Token phải hợp lệ và chưa hết hạn

### 5. Tài khoản bị khóa

- Nếu tài khoản bị khóa (`isBanned = true`), không thể reset mật khẩu
- User cần liên hệ admin

### 6. Reset Login Attempts

- Khi đặt lại mật khẩu thành công, hệ thống tự động:
  - Reset `loginAttempts = 0`
  - Unlock tài khoản (`isLocked = false`)
  - Xóa `lockUntil`

---

## 🔍 Debug

### Kiểm tra request

```kotlin
Log.d("ForgotPassword", "Email: $email")
Log.d("ForgotPassword", "Username: $username")
Log.d("ResetPassword", "Token: $token")
Log.d("ResetPassword", "New password length: ${newPassword.length}")
```

### Kiểm tra response

```kotlin
Log.d("ForgotPassword", "Response: ${response.bodyAsText()}")
Log.d("ForgotPassword", "Success: ${response.success}")
Log.d("ForgotPassword", "Token: ${response.resetToken}")
```

### Lỗi thường gặp

1. **"Token không hợp lệ hoặc đã hết hạn!"**
   - Token đã hết hạn (quá 1 giờ)
   - Token không đúng
   - Token đã được sử dụng

2. **"Mật khẩu mới phải có ít nhất 6 ký tự!"**
   - Kiểm tra: `newPassword.length >= 6`

3. **"Mật khẩu mới và xác nhận mật khẩu không khớp!"**
   - Kiểm tra: `newPassword == confirmPassword`

---

## 📞 Hỗ trợ

Nếu gặp vấn đề, vui lòng kiểm tra:
1. Email/username có đúng không
2. Token có còn hiệu lực không (chưa quá 1 giờ)
3. Mật khẩu mới có đủ độ dài không (>= 6 ký tự)
4. Log trên server để xem chi tiết lỗi

---

## 🔮 Mở rộng (Tùy chọn)

### Gửi email với reset token

Để gửi email thực sự, cần:
1. Cài đặt `nodemailer`: `npm install nodemailer`
2. Cấu hình email service (Gmail, SendGrid, etc.)
3. Cập nhật API `/forgot-password` để gửi email thay vì trả về token

Ví dụ:

```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Trong route /forgot-password
const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
await transporter.sendMail({
  from: process.env.EMAIL_USER,
  to: user.email,
  subject: 'Đặt lại mật khẩu',
  html: `
    <h2>Yêu cầu đặt lại mật khẩu</h2>
    <p>Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng click vào link sau:</p>
    <a href="${resetUrl}">${resetUrl}</a>
    <p>Link này có hiệu lực trong 1 giờ.</p>
  `
});
```

