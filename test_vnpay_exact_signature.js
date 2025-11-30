/**
 * Test VNPay Signature với chính xác params từ logs
 * So sánh với VNPay yêu cầu
 */

require('dotenv').config();
const crypto = require('crypto');

const hashSecret = process.env.VNPAY_HASH_SECRET || 'W3Z2UI7K934HIODNKU3OIE5ZR5A3WE9O';

// Từ logs backend - chính xác
const params = {
  vnp_Amount: '902000000',
  vnp_Command: 'pay',
  vnp_CreateDate: '20251128220229',
  vnp_CurrCode: 'VND',
  vnp_IpAddr: '192.168.1.1',
  vnp_Locale: 'vn',
  vnp_OrderInfo: 'Thanh toan don hang ORD202511282202295178',
  vnp_OrderType: 'other',
  vnp_ReturnUrl: 'https://johnie-breakless-dimensionally.ngrok-free.dev/api/payment/vnpay/return',
  vnp_TmnCode: 'SY7OSRWP',
  vnp_TxnRef: '1764342149681_6929b98571ebe56c034a9beb',
  vnp_Version: '2.1.0'
};

const expectedSignature = '3341ad3f4162cb8ca70cbaddef76a6f9b13bb17c5e0a9a6d70989b25a0436192e923fdfd71cc349664e38d4deaae66aa93571ee8a0a04aeda22630e3e51f2c34';

console.log('🔍 TEST VNPAY SIGNATURE - EXACT PARAMS FROM LOGS\n');
console.log('='.repeat(60));

// Method 1: Sort và tạo querystring (như code hiện tại)
const sortObject = (obj) => {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  keys.forEach((key) => {
    sorted[key] = obj[key];
  });
  return sorted;
};

const sorted1 = sortObject(params);
const querystring1 = Object.keys(sorted1)
  .map(key => `${key}=${sorted1[key]}`)
  .join('&');

const signature1 = crypto
  .createHmac('sha512', hashSecret)
  .update(querystring1)
  .digest('hex');

console.log('\n📋 Method 1 (như code hiện tại):');
console.log('   Querystring:', querystring1);
console.log('   Signature:  ', signature1);
console.log('   Match:      ', signature1 === expectedSignature ? '✅ YES' : '❌ NO');

// Method 2: Thử với IP address khác (có thể VNPay không chấp nhận 192.168.1.1)
const params2 = { ...params };
params2.vnp_IpAddr = '8.8.8.8'; // Public IP

const sorted2 = sortObject(params2);
const querystring2 = Object.keys(sorted2)
  .map(key => `${key}=${sorted2[key]}`)
  .join('&');

const signature2 = crypto
  .createHmac('sha512', hashSecret)
  .update(querystring2)
  .digest('hex');

console.log('\n📋 Method 2 (với IP public 8.8.8.8):');
console.log('   Querystring:', querystring2);
console.log('   Signature:  ', signature2);
console.log('   Note:       VNPay có thể yêu cầu IP public');

// Method 3: Thử loại bỏ vnp_IpAddr (nếu VNPay cho phép)
const params3 = { ...params };
delete params3.vnp_IpAddr;

const sorted3 = sortObject(params3);
const querystring3 = Object.keys(sorted3)
  .map(key => `${key}=${sorted3[key]}`)
  .join('&');

const signature3 = crypto
  .createHmac('sha512', hashSecret)
  .update(querystring3)
  .digest('hex');

console.log('\n📋 Method 3 (không có vnp_IpAddr):');
console.log('   Querystring:', querystring3);
console.log('   Signature:  ', signature3);
console.log('   Note:       VNPay có thể không yêu cầu IP address');

// Method 4: Kiểm tra xem có phải vấn đề với Return URL encoding không
const params4 = { ...params };
// Return URL có thể cần được decode trước khi tạo signature?
const decodedReturnUrl = decodeURIComponent(params4.vnp_ReturnUrl);
params4.vnp_ReturnUrl = decodedReturnUrl;

const sorted4 = sortObject(params4);
const querystring4 = Object.keys(sorted4)
  .map(key => `${key}=${sorted4[key]}`)
  .join('&');

const signature4 = crypto
  .createHmac('sha512', hashSecret)
  .update(querystring4)
  .digest('hex');

console.log('\n📋 Method 4 (Return URL decoded):');
console.log('   Original Return URL:', params.vnp_ReturnUrl);
console.log('   Decoded Return URL: ', decodedReturnUrl);
console.log('   Querystring:', querystring4);
console.log('   Signature:  ', signature4);
console.log('   Match:      ', signature4 === expectedSignature ? '✅ YES' : '❌ NO');

console.log('\n' + '='.repeat(60));
console.log('\n💡 PHÂN TÍCH:');

if (signature1 === expectedSignature) {
  console.log('   ✅ Method 1 (code hiện tại) - Signature ĐÚNG');
  console.log('   → Vấn đề không phải ở signature generation');
  console.log('   → Có thể là:');
  console.log('     1. VNPay không chấp nhận IP 192.168.1.1 (private IP)');
  console.log('     2. VNPay đang verify signature từ URL đã encode');
  console.log('     3. VNPay sandbox có vấn đề');
} else {
  console.log('   ❌ Method 1 - Signature SAI');
  console.log('   → Cần kiểm tra lại signature generation');
}

console.log('\n📝 KHUYẾN NGHỊ:');
console.log('   1. Thử dùng IP public thay vì 192.168.1.1');
console.log('   2. Kiểm tra VNPay có yêu cầu IP address không');
console.log('   3. Liên hệ VNPay support với:');
console.log('      - TMN Code: SY7OSRWP');
console.log('      - Querystring:', querystring1);
console.log('      - Signature:', signature1);
console.log('      - Error: "Sai chữ ký"');

console.log('\n' + '='.repeat(60));

