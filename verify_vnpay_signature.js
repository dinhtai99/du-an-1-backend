/**
 * Verify VNPay Signature từ logs backend
 * So sánh với VNPay yêu cầu
 */

const crypto = require('crypto');

// Từ logs backend
const querystring = 'vnp_Amount=902000000&vnp_Command=pay&vnp_CreateDate=20251128212952&vnp_CurrCode=VND&vnp_IpAddr=192.168.25.99&vnp_Locale=vn&vnp_OrderInfo=Thanh toan don hang ORD202511282129527077&vnp_OrderType=other&vnp_ReturnUrl=https://johnie-breakless-dimensionally.ngrok-free.dev/api/payment/vnpay/return&vnp_TmnCode=SY7OSRWP&vnp_TxnRef=1764340192306_6929b1e0e9dad52e09be8be1&vnp_Version=2.1.0';

const hashSecret = 'W3Z2UI7K934HIODNKU3OIE5ZR5A3WE9O';
const expectedSignature = '26fb07da203d918776745c4ff6cf128cd97f6759049798399f338647219030c47366d2b50c7f175926ea650a3658cc157f1bd7967be7fdb90f3fa42543a60a52';

console.log('🔍 VERIFY VNPAY SIGNATURE FROM LOGS\n');
console.log('='.repeat(60));

console.log('\n📋 Input:');
console.log('   Querystring length:', querystring.length);
console.log('   HashSecret length:', hashSecret.length);
console.log('   Expected signature:', expectedSignature.substring(0, 40) + '...');

// Generate signature
const calculatedSignature = crypto
  .createHmac('sha512', hashSecret)
  .update(querystring)
  .digest('hex');

console.log('\n🔐 Calculated signature:');
console.log('   Full:', calculatedSignature);
console.log('   First 40 chars:', calculatedSignature.substring(0, 40) + '...');
console.log('   Length:', calculatedSignature.length);

console.log('\n✅ Verification:');
console.log('   Match:', calculatedSignature === expectedSignature ? '✅ YES' : '❌ NO');

if (calculatedSignature !== expectedSignature) {
  console.log('\n❌ SIGNATURE MISMATCH!');
  console.log('   Expected:', expectedSignature);
  console.log('   Calculated:', calculatedSignature);
  console.log('\n   Possible causes:');
  console.log('   1. HashSecret không đúng');
  console.log('   2. Querystring không đúng (có thể bị encode hoặc sort sai)');
  console.log('   3. Encoding issue (UTF-8 vs ASCII)');
} else {
  console.log('\n✅ Signature generation is CORRECT!');
  console.log('\n💡 If VNPay still returns Error 70:');
  console.log('   1. Check if VNPay is using the same HashSecret');
  console.log('   2. Check if VNPay is receiving the correct params');
  console.log('   3. Check if there are any special characters in params');
  console.log('   4. Check if Return URL is accessible from VNPay');
  console.log('   5. Check VNPay sandbox status');
}

// Check querystring format
console.log('\n📊 Querystring Analysis:');
const params = querystring.split('&');
console.log('   Number of params:', params.length);
console.log('   Params:');
params.forEach((param, index) => {
  const [key, value] = param.split('=');
  console.log(`   ${index + 1}. ${key}=${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
});

// Check if sorted alphabetically
const keys = params.map(p => p.split('=')[0]);
const sortedKeys = [...keys].sort();
const isSorted = JSON.stringify(keys) === JSON.stringify(sortedKeys);

console.log('\n🔤 Sorting check:');
console.log('   Is sorted alphabetically:', isSorted ? '✅ YES' : '❌ NO');
if (!isSorted) {
  console.log('   Current order:', keys.join(', '));
  console.log('   Expected order:', sortedKeys.join(', '));
}

// Check for encoding issues
console.log('\n🔍 Encoding check:');
const hasEncodedChars = querystring.includes('%') || querystring.includes('+');
console.log('   Has encoded characters:', hasEncodedChars ? '❌ YES (should be raw)' : '✅ NO (raw values)');

// Check Return URL
const returnUrlMatch = querystring.match(/vnp_ReturnUrl=([^&]+)/);
if (returnUrlMatch) {
  const returnUrl = returnUrlMatch[1];
  console.log('\n🌐 Return URL check:');
  console.log('   URL:', returnUrl);
  console.log('   Is ngrok:', returnUrl.includes('ngrok') ? '✅ YES' : '❌ NO');
  console.log('   Is HTTPS:', returnUrl.startsWith('https://') ? '✅ YES' : '❌ NO');
}

console.log('\n' + '='.repeat(60));

