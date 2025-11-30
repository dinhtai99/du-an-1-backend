/**
 * Script kiểm tra cấu hình VNPay
 * So sánh với thông tin từ VNPay sandbox
 */

require('dotenv').config();
const crypto = require('crypto');

// Thông tin cấu hình từ VNPay sandbox
const VNPAY_CONFIG = {
  tmnCode: 'SY7OSRWP',
  hashSecret: 'W3Z2UI7K934HIODNKU3OIE5ZR5A3WE9O',
  endpoint: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'
};

// Lấy cấu hình từ .env
const ENV_CONFIG = {
  tmnCode: process.env.VNPAY_TMN_CODE || '',
  hashSecret: process.env.VNPAY_HASH_SECRET || '',
  endpoint: process.env.VNPAY_ENDPOINT || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
  ipnUrl: process.env.VNPAY_IPN_URL || '',
  returnUrl: process.env.VNPAY_RETURN_URL || ''
};

console.log('🔍 KIỂM TRA CẤU HÌNH VNPAY\n');
console.log('='.repeat(60));

// 1. Kiểm tra TMN Code
console.log('\n1️⃣ TMN Code (vnp_TmnCode):');
console.log('   Từ VNPay sandbox:', VNPAY_CONFIG.tmnCode);
console.log('   Từ .env file:    ', ENV_CONFIG.tmnCode || '(chưa cấu hình)');
if (ENV_CONFIG.tmnCode === VNPAY_CONFIG.tmnCode) {
  console.log('   ✅ ĐÚNG');
} else if (!ENV_CONFIG.tmnCode) {
  console.log('   ⚠️  CHƯA CẤU HÌNH - Cần thêm vào .env:');
  console.log('      VNPAY_TMN_CODE=' + VNPAY_CONFIG.tmnCode);
} else {
  console.log('   ❌ SAI - Không khớp với thông tin từ VNPay');
}

// 2. Kiểm tra Hash Secret
console.log('\n2️⃣ Hash Secret (vnp_HashSecret):');
console.log('   Từ VNPay sandbox:', VNPAY_CONFIG.hashSecret.substring(0, 20) + '...');
console.log('   Từ .env file:    ', ENV_CONFIG.hashSecret ? (ENV_CONFIG.hashSecret.substring(0, 20) + '...') : '(chưa cấu hình)');
if (ENV_CONFIG.hashSecret === VNPAY_CONFIG.hashSecret) {
  console.log('   ✅ ĐÚNG');
} else if (!ENV_CONFIG.hashSecret) {
  console.log('   ⚠️  CHƯA CẤU HÌNH - Cần thêm vào .env:');
  console.log('      VNPAY_HASH_SECRET=' + VNPAY_CONFIG.hashSecret);
} else {
  console.log('   ❌ SAI - Không khớp với thông tin từ VNPay');
}

// 3. Kiểm tra Endpoint
console.log('\n3️⃣ Endpoint (vnp_Url):');
console.log('   Từ VNPay sandbox:', VNPAY_CONFIG.endpoint);
console.log('   Từ .env file:    ', ENV_CONFIG.endpoint);
if (ENV_CONFIG.endpoint === VNPAY_CONFIG.endpoint) {
  console.log('   ✅ ĐÚNG');
} else {
  console.log('   ⚠️  KHÁC - Kiểm tra lại endpoint');
}

// 4. Kiểm tra IPN URL và Return URL
console.log('\n4️⃣ IPN URL và Return URL:');
console.log('   IPN URL:    ', ENV_CONFIG.ipnUrl || '(chưa cấu hình)');
console.log('   Return URL: ', ENV_CONFIG.returnUrl || '(chưa cấu hình)');

if (ENV_CONFIG.ipnUrl && (ENV_CONFIG.ipnUrl.includes('localhost') || ENV_CONFIG.ipnUrl.match(/^http:\/\/\d+\.\d+\.\d+\.\d+/))) {
  console.log('   ⚠️  IPN URL đang dùng localhost/IP local - VNPay sandbox không thể truy cập');
  console.log('   💡 Cần dùng ngrok hoặc public URL');
}

if (ENV_CONFIG.returnUrl && (ENV_CONFIG.returnUrl.includes('localhost') || ENV_CONFIG.returnUrl.match(/^http:\/\/\d+\.\d+\.\d+\.\d+/))) {
  console.log('   ⚠️  Return URL đang dùng localhost/IP local - VNPay sandbox không thể truy cập');
  console.log('   💡 Cần dùng ngrok hoặc public URL');
}

// 5. Test Signature Generation
console.log('\n5️⃣ Test Signature Generation:');
if (ENV_CONFIG.hashSecret) {
  const testParams = {
    vnp_Amount: '1000000',
    vnp_Command: 'pay',
    vnp_CreateDate: '20251128120000',
    vnp_CurrCode: 'VND',
    vnp_IpAddr: '127.0.0.1',
    vnp_Locale: 'vn',
    vnp_OrderInfo: 'Thanh toan don hang test',
    vnp_OrderType: 'other',
    vnp_ReturnUrl: 'http://localhost:3000/api/payment/vnpay/return',
    vnp_TmnCode: ENV_CONFIG.tmnCode || VNPAY_CONFIG.tmnCode,
    vnp_TxnRef: 'test_123456',
    vnp_Version: '2.1.0'
  };

  // Sort params theo alphabet
  const sortedKeys = Object.keys(testParams).sort();
  const sortedParams = {};
  sortedKeys.forEach(key => {
    sortedParams[key] = testParams[key];
  });

  // Tạo querystring (raw values, không encode)
  const querystring = Object.keys(sortedParams)
    .map(key => `${key}=${sortedParams[key]}`)
    .join('&');

  // Tạo signature
  const signature = crypto
    .createHmac('sha512', ENV_CONFIG.hashSecret || VNPAY_CONFIG.hashSecret)
    .update(querystring)
    .digest('hex');

  console.log('   Test params:', JSON.stringify(testParams, null, 2));
  console.log('   Querystring:', querystring);
  console.log('   Signature:  ', signature.substring(0, 40) + '...');
  console.log('   ✅ Signature generation hoạt động');
} else {
  console.log('   ⚠️  Không thể test signature - thiếu Hash Secret');
}

// 6. Tổng kết
console.log('\n' + '='.repeat(60));
console.log('\n📋 TỔNG KẾT:\n');

const issues = [];
if (!ENV_CONFIG.tmnCode || ENV_CONFIG.tmnCode !== VNPAY_CONFIG.tmnCode) {
  issues.push('❌ TMN Code chưa đúng hoặc chưa cấu hình');
}
if (!ENV_CONFIG.hashSecret || ENV_CONFIG.hashSecret !== VNPAY_CONFIG.hashSecret) {
  issues.push('❌ Hash Secret chưa đúng hoặc chưa cấu hình');
}
if (!ENV_CONFIG.ipnUrl || ENV_CONFIG.ipnUrl.includes('localhost') || ENV_CONFIG.ipnUrl.match(/^http:\/\/\d+\.\d+\.\d+\.\d+/)) {
  issues.push('⚠️  IPN URL cần dùng public URL (ngrok)');
}
if (!ENV_CONFIG.returnUrl || ENV_CONFIG.returnUrl.includes('localhost') || ENV_CONFIG.returnUrl.match(/^http:\/\/\d+\.\d+\.\d+\.\d+/)) {
  issues.push('⚠️  Return URL cần dùng public URL (ngrok)');
}

if (issues.length === 0) {
  console.log('✅ Tất cả cấu hình đều đúng!');
} else {
  console.log('Các vấn đề cần sửa:');
  issues.forEach(issue => console.log('  ' + issue));
  
  console.log('\n💡 Hướng dẫn sửa:');
  console.log('1. Cập nhật .env với các giá trị sau:');
  console.log('   VNPAY_TMN_CODE=' + VNPAY_CONFIG.tmnCode);
  console.log('   VNPAY_HASH_SECRET=' + VNPAY_CONFIG.hashSecret);
  console.log('   VNPAY_ENDPOINT=' + VNPAY_CONFIG.endpoint);
  console.log('\n2. Setup ngrok cho IPN URL và Return URL:');
  console.log('   - Chạy: ngrok http 3000');
  console.log('   - Copy URL từ ngrok (ví dụ: https://abc123.ngrok.io)');
  console.log('   - Cập nhật .env:');
  console.log('     VNPAY_IPN_URL=https://abc123.ngrok.io/api/payment/vnpay/callback');
  console.log('     VNPAY_RETURN_URL=https://abc123.ngrok.io/api/payment/vnpay/return');
}

console.log('\n' + '='.repeat(60));

