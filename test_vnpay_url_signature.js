/**
 * Test VNPay Signature - Có thể VNPay verify từ URL đã encode?
 * 
 * Vấn đề: Signature generation đúng, nhưng VNPay vẫn báo Error 70
 * Có thể VNPay verify signature từ URL đã encode, không phải raw values?
 */

const crypto = require('crypto');

const hashSecret = 'W3Z2UI7K934HIODNKU3OIE5ZR5A3WE9O';

// Từ logs backend - URL đầy đủ
const fullUrl = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=902000000&vnp_Command=pay&vnp_CreateDate=20251128213401&vnp_CurrCode=VND&vnp_IpAddr=192.168.25.99&vnp_Locale=vn&vnp_OrderInfo=Thanh%20toan%20don%20hang%20ORD202511282134016877&vnp_OrderType=other&vnp_ReturnUrl=https%3A%2F%2Fjohnie-breakless-dimensionally.ngrok-free.dev%2Fapi%2Fpayment%2Fvnpay%2Freturn&vnp_SecureHash=6efceb138cab64a9e424485ae754ead3aab3a4e48711ad256188b50f2ad650ab94fef184b52a0a9bc0c07e3f7956084e337dac59cc38730c4b87b103c55cb9d2&vnp_TmnCode=SY7OSRWP&vnp_TxnRef=1764340441813_6929b2d9e48ec21ece967ac1&vnp_Version=2.1.0';

console.log('🔍 TEST VNPAY SIGNATURE VERIFICATION\n');
console.log('='.repeat(60));

// Extract query string từ URL
const urlObj = new URL(fullUrl);
const queryParams = new URLSearchParams(urlObj.search);

console.log('\n📋 URL Query Params (decoded):');
const decodedParams = {};
queryParams.forEach((value, key) => {
  decodedParams[key] = value;
  console.log(`   ${key} = ${value.substring(0, 80)}${value.length > 80 ? '...' : ''}`);
});

// Method 1: Verify từ raw values (như code hiện tại)
const rawParams = { ...decodedParams };
delete rawParams['vnp_SecureHash'];
delete rawParams['vnp_SecureHashType'];

const sortedRaw = Object.keys(rawParams).sort().reduce((acc, key) => {
  acc[key] = rawParams[key];
  return acc;
}, {});

const rawQuerystring = Object.keys(sortedRaw)
  .map(key => `${key}=${sortedRaw[key]}`)
  .join('&');

const rawSignature = crypto
  .createHmac('sha512', hashSecret)
  .update(rawQuerystring)
  .digest('hex');

console.log('\n🔐 Method 1: Verify từ raw values (như code hiện tại):');
console.log('   Querystring:', rawQuerystring.substring(0, 100) + '...');
console.log('   Signature:  ', rawSignature.substring(0, 40) + '...');
console.log('   Match:      ', rawSignature === decodedParams['vnp_SecureHash'] ? '✅ YES' : '❌ NO');

// Method 2: Verify từ encoded values (có thể VNPay làm thế này?)
const encodedParams = {};
urlObj.searchParams.forEach((value, key) => {
  if (key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType') {
    encodedParams[key] = value; // Value đã được encode trong URL
  }
});

const sortedEncoded = Object.keys(encodedParams).sort().reduce((acc, key) => {
  acc[key] = encodedParams[key];
  return acc;
}, {});

const encodedQuerystring = Object.keys(sortedEncoded)
  .map(key => `${key}=${sortedEncoded[key]}`)
  .join('&');

const encodedSignature = crypto
  .createHmac('sha512', hashSecret)
  .update(encodedQuerystring)
  .digest('hex');

console.log('\n🔐 Method 2: Verify từ encoded values (có thể VNPay làm thế này?):');
console.log('   Querystring:', encodedQuerystring.substring(0, 100) + '...');
console.log('   Signature:  ', encodedSignature.substring(0, 40) + '...');
console.log('   Match:      ', encodedSignature === decodedParams['vnp_SecureHash'] ? '✅ YES' : '❌ NO');

// Method 3: Verify từ URL query string trực tiếp (không decode)
const urlQueryString = urlObj.search.substring(1); // Bỏ dấu ?
const urlParams = new URLSearchParams(urlQueryString);
const urlParamsForVerify = {};
urlParams.forEach((value, key) => {
  if (key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType') {
    urlParamsForVerify[key] = value;
  }
});

const sortedUrlParams = Object.keys(urlParamsForVerify).sort().reduce((acc, key) => {
  acc[key] = urlParamsForVerify[key];
  return acc;
}, {});

const urlQuerystring = Object.keys(sortedUrlParams)
  .map(key => `${key}=${sortedUrlParams[key]}`)
  .join('&');

const urlSignature = crypto
  .createHmac('sha512', hashSecret)
  .update(urlQuerystring)
  .digest('hex');

console.log('\n🔐 Method 3: Verify từ URL query string (không decode):');
console.log('   Querystring:', urlQuerystring.substring(0, 100) + '...');
console.log('   Signature:  ', urlSignature.substring(0, 40) + '...');
console.log('   Match:      ', urlSignature === decodedParams['vnp_SecureHash'] ? '✅ YES' : '❌ NO');

// So sánh
console.log('\n📊 COMPARISON:');
console.log('   Method 1 (raw) vs Method 2 (encoded):', rawQuerystring === encodedQuerystring ? '✅ Same' : '❌ Different');
console.log('   Method 1 (raw) vs Method 3 (URL):', rawQuerystring === urlQuerystring ? '✅ Same' : '❌ Different');
console.log('   Method 2 (encoded) vs Method 3 (URL):', encodedQuerystring === urlQuerystring ? '✅ Same' : '❌ Different');

console.log('\n💡 ANALYSIS:');
if (rawSignature === decodedParams['vnp_SecureHash']) {
  console.log('   ✅ Method 1 (raw values) - ĐÚNG (như code hiện tại)');
} else {
  console.log('   ❌ Method 1 (raw values) - SAI');
}

if (encodedSignature === decodedParams['vnp_SecureHash']) {
  console.log('   ✅ Method 2 (encoded values) - ĐÚNG (có thể VNPay dùng cách này?)');
} else {
  console.log('   ❌ Method 2 (encoded values) - SAI');
}

if (urlSignature === decodedParams['vnp_SecureHash']) {
  console.log('   ✅ Method 3 (URL query string) - ĐÚNG');
} else {
  console.log('   ❌ Method 3 (URL query string) - SAI');
}

console.log('\n' + '='.repeat(60));
console.log('\n📝 KẾT LUẬN:');
console.log('   Nếu Method 1 đúng: Code hiện tại ĐÚNG, vấn đề ở chỗ khác');
console.log('   Nếu Method 2 hoặc 3 đúng: Cần sửa code để verify từ encoded values');
console.log('\n' + '='.repeat(60));

