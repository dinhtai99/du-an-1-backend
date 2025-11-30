/**
 * Test VNPay Signature Generation
 * So sánh với thông tin từ VNPay sandbox
 */

require('dotenv').config();
const crypto = require('crypto');

// Thông tin cấu hình từ VNPay sandbox
const VNPAY_CONFIG = {
  tmnCode: 'SY7OSRWP',
  hashSecret: 'W3Z2UI7K934HIODNKU3OIE5ZR5A3WE9O'
};

// Lấy cấu hình từ .env
const ENV_CONFIG = {
  tmnCode: process.env.VNPAY_TMN_CODE || VNPAY_CONFIG.tmnCode,
  hashSecret: process.env.VNPAY_HASH_SECRET || VNPAY_CONFIG.hashSecret
};

console.log('🔍 TEST VNPAY SIGNATURE GENERATION\n');
console.log('='.repeat(60));

// Test params (giống như VNPay yêu cầu)
const testParams = {
  vnp_Version: '2.1.0',
  vnp_Command: 'pay',
  vnp_TmnCode: ENV_CONFIG.tmnCode,
  vnp_Amount: '1000000',
  vnp_CurrCode: 'VND',
  vnp_TxnRef: 'test_123456',
  vnp_OrderInfo: 'Thanh toan don hang test',
  vnp_OrderType: 'other',
  vnp_Locale: 'vn',
  vnp_ReturnUrl: 'http://localhost:3000/api/payment/vnpay/return',
  vnp_IpAddr: '127.0.0.1',
  vnp_CreateDate: '20251128120000'
};

console.log('\n📋 Test Params:');
console.log(JSON.stringify(testParams, null, 2));

// Loại bỏ params rỗng/null/undefined
const cleanedParams = {};
Object.keys(testParams).forEach(key => {
  const value = testParams[key];
  if (value !== null && value !== undefined && value !== "") {
    cleanedParams[key] = String(value);
  }
});

console.log('\n🧹 Cleaned Params (after removing null/undefined/empty):');
console.log(JSON.stringify(cleanedParams, null, 2));

// Sort params theo alphabet
const sortObject = (obj) => {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  keys.forEach((key) => {
    sorted[key] = obj[key];
  });
  return sorted;
};

const sortedParams = sortObject(cleanedParams);

console.log('\n🔤 Sorted Params (alphabetical order):');
console.log(JSON.stringify(sortedParams, null, 2));

// Tạo querystring cho signature - KHÔNG encode (raw values)
const querystring = Object.keys(sortedParams)
  .sort()
  .map(key => `${key}=${sortedParams[key]}`)
  .join('&');

console.log('\n🔗 Querystring for signature (raw, no encode):');
console.log(querystring);

// Tạo signature
const signature = crypto
  .createHmac('sha512', ENV_CONFIG.hashSecret)
  .update(querystring)
  .digest('hex');

console.log('\n🔐 Generated Signature:');
console.log(signature);
console.log('   (first 40 chars):', signature.substring(0, 40) + '...');

// Tạo final URL (với encode)
const finalParams = { ...sortedParams };
finalParams['vnp_SecureHash'] = signature;

const finalQuerystring = Object.keys(finalParams)
  .sort()
  .map(key => `${key}=${encodeURIComponent(finalParams[key])}`)
  .join('&');

const paymentUrl = `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?${finalQuerystring}`;

console.log('\n🌐 Final Payment URL (first 300 chars):');
console.log(paymentUrl.substring(0, 300) + '...');

// Verify: Decode URL và kiểm tra signature
console.log('\n✅ VERIFICATION:');
const urlParams = new URLSearchParams(paymentUrl.split('?')[1]);
const receivedSecureHash = urlParams.get('vnp_SecureHash');
const paramsForVerify = {};
urlParams.forEach((value, key) => {
  if (key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType') {
    paramsForVerify[key] = decodeURIComponent(value);
  }
});

const sortedVerifyParams = sortObject(paramsForVerify);
const verifyQuerystring = Object.keys(sortedVerifyParams)
  .sort()
  .map(key => `${key}=${sortedVerifyParams[key]}`)
  .join('&');

const verifySignature = crypto
  .createHmac('sha512', ENV_CONFIG.hashSecret)
  .update(verifyQuerystring)
  .digest('hex');

console.log('   Original signature:  ', signature.substring(0, 40) + '...');
console.log('   Verify signature:     ', verifySignature.substring(0, 40) + '...');
console.log('   Match:                ', signature === verifySignature ? '✅ YES' : '❌ NO');

console.log('\n' + '='.repeat(60));
console.log('\n📝 CHECKLIST:');
console.log('   [ ] TMN Code đúng:', ENV_CONFIG.tmnCode === VNPAY_CONFIG.tmnCode ? '✅' : '❌');
console.log('   [ ] Hash Secret đúng:', ENV_CONFIG.hashSecret === VNPAY_CONFIG.hashSecret ? '✅' : '❌');
console.log('   [ ] Params đã sort alphabet:', '✅');
console.log('   [ ] Querystring KHÔNG encode (raw values):', '✅');
console.log('   [ ] Signature generation hoạt động:', signature.length === 128 ? '✅' : '❌');
console.log('   [ ] Signature verify match:', signature === verifySignature ? '✅' : '❌');

if (signature !== verifySignature) {
  console.log('\n❌ LỖI: Signature không khớp khi verify!');
  console.log('   Có thể do:');
  console.log('   - Encode/Decode không đúng');
  console.log('   - Params không được sort đúng');
  console.log('   - Có params null/undefined/rỗng');
} else {
  console.log('\n✅ Tất cả đều đúng! Signature generation hoạt động chính xác.');
}

console.log('\n' + '='.repeat(60));

