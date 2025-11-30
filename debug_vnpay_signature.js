/**
 * Debug VNPay Signature - So sánh với code chính thức
 * 
 * Vấn đề: Error 70 - Signature Error
 */

require('dotenv').config();
const crypto = require('crypto');

const tmnCode = process.env.VNPAY_TMN_CODE || 'SY7OSRWP';
const hashSecret = process.env.VNPAY_HASH_SECRET || 'W3Z2UI7K934HIODNKU3OIE5ZR5A3WE9O';

console.log('🔍 DEBUG VNPAY SIGNATURE GENERATION\n');
console.log('='.repeat(60));

// Test case từ thực tế
const testParams = {
  vnp_Version: '2.1.0',
  vnp_Command: 'pay',
  vnp_TmnCode: tmnCode,
  vnp_Amount: '902000000', // 9,020,000 VND (x100)
  vnp_CurrCode: 'VND',
  vnp_TxnRef: '1764311198245_6929409d315235f32d9470c2',
  vnp_OrderInfo: 'Thanh toan don hang ORD202511281326374600',
  vnp_OrderType: 'other',
  vnp_Locale: 'vn',
  vnp_ReturnUrl: 'https://johnie-breakless-dimensionally.ngrok-free.dev/api/payment/vnpay/return',
  vnp_IpAddr: '192.168.25.99',
  vnp_CreateDate: '20251128132638'
};

console.log('\n📋 Input Params:');
console.log(JSON.stringify(testParams, null, 2));

// Method 1: Loại bỏ null/undefined (KHÔNG loại bỏ rỗng)
const cleanedParams1 = {};
Object.keys(testParams).forEach(key => {
  const value = testParams[key];
  if (value !== null && value !== undefined) {
    cleanedParams1[key] = String(value);
  }
});

console.log('\n🧹 Cleaned Params (Method 1 - keep empty strings):');
console.log(JSON.stringify(cleanedParams1, null, 2));

// Method 2: Loại bỏ null/undefined/rỗng
const cleanedParams2 = {};
Object.keys(testParams).forEach(key => {
  const value = testParams[key];
  if (value !== null && value !== undefined && value !== "") {
    cleanedParams2[key] = String(value);
  }
});

console.log('\n🧹 Cleaned Params (Method 2 - remove empty strings):');
console.log(JSON.stringify(cleanedParams2, null, 2));

// Sort function
const sortObject = (obj) => {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  keys.forEach((key) => {
    sorted[key] = obj[key];
  });
  return sorted;
};

// Test Method 1
const sorted1 = sortObject(cleanedParams1);
const querystring1 = Object.keys(sorted1)
  .map(key => `${key}=${sorted1[key]}`)
  .join('&');

const signature1 = crypto
  .createHmac('sha512', hashSecret)
  .update(querystring1)
  .digest('hex');

console.log('\n🔐 Method 1 (keep empty strings):');
console.log('   Querystring:', querystring1);
console.log('   Signature:  ', signature1.substring(0, 40) + '...');

// Test Method 2
const sorted2 = sortObject(cleanedParams2);
const querystring2 = Object.keys(sorted2)
  .map(key => `${key}=${sorted2[key]}`)
  .join('&');

const signature2 = crypto
  .createHmac('sha512', hashSecret)
  .update(querystring2)
  .digest('hex');

console.log('\n🔐 Method 2 (remove empty strings):');
console.log('   Querystring:', querystring2);
console.log('   Signature:  ', signature2.substring(0, 40) + '...');

// Test Method 3: Sort 2 lần (như code hiện tại)
const sorted3 = sortObject(cleanedParams1);
const querystring3 = Object.keys(sorted3)
  .sort() // Sort lại lần nữa
  .map(key => `${key}=${sorted3[key]}`)
  .join('&');

const signature3 = crypto
  .createHmac('sha512', hashSecret)
  .update(querystring3)
  .digest('hex');

console.log('\n🔐 Method 3 (sort 2 times):');
console.log('   Querystring:', querystring3);
console.log('   Signature:  ', signature3.substring(0, 40) + '...');

// So sánh
console.log('\n📊 COMPARISON:');
console.log('   Method 1 vs Method 2:', querystring1 === querystring2 ? '✅ Same' : '❌ Different');
console.log('   Method 1 vs Method 3:', querystring1 === querystring3 ? '✅ Same' : '❌ Different');
console.log('   Method 2 vs Method 3:', querystring2 === querystring3 ? '✅ Same' : '❌ Different');

// Final URL với signature
const finalParams1 = { ...sorted1, vnp_SecureHash: signature1 };
const finalQuerystring1 = Object.keys(finalParams1)
  .sort()
  .map(key => `${key}=${encodeURIComponent(finalParams1[key])}`)
  .join('&');

const paymentUrl1 = `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?${finalQuerystring1}`;

console.log('\n🌐 Final Payment URL (Method 1, first 400 chars):');
console.log(paymentUrl1.substring(0, 400) + '...');

console.log('\n' + '='.repeat(60));
console.log('\n💡 RECOMMENDATION:');
console.log('   - Kiểm tra logs backend để xem querystring thực tế');
console.log('   - So sánh với VNPay demo code chính thức');
console.log('   - Đảm bảo không sort 2 lần');
console.log('   - Đảm bảo không loại bỏ params bắt buộc');
console.log('\n' + '='.repeat(60));

