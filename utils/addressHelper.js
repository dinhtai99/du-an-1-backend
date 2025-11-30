/**
 * Helper functions để normalize và validate địa chỉ từ geolocation
 */

/**
 * Normalize string: loại bỏ khoảng trắng thừa, dấu phẩy không cần thiết
 */
function normalizeString(str) {
  if (!str || typeof str !== 'string') return '';
  
  return str
    .trim()
    .replace(/\s+/g, ' ') // Nhiều khoảng trắng thành 1
    .replace(/,\s*,/g, ',') // Nhiều dấu phẩy thành 1
    .replace(/,\s*$/g, '') // Dấu phẩy ở cuối
    .replace(/^\s*,\s*/g, '') // Dấu phẩy ở đầu
    .trim();
}

/**
 * Validate và normalize phone number
 */
function normalizePhone(phone) {
  if (!phone) return '';
  
  // Loại bỏ tất cả ký tự không phải số
  let normalized = String(phone).replace(/\D/g, '');
  
  // Nếu bắt đầu bằng 0, giữ nguyên
  // Nếu bắt đầu bằng 84, chuyển thành 0
  if (normalized.startsWith('84')) {
    normalized = '0' + normalized.substring(2);
  }
  
  // Validate độ dài (10-11 số)
  if (normalized.length < 10 || normalized.length > 11) {
    console.warn('⚠️ Phone number có độ dài không hợp lệ:', phone, '->', normalized);
  }
  
  return normalized;
}

/**
 * Validate và normalize fullName
 */
function normalizeFullName(fullName) {
  if (!fullName) return '';
  
  let normalized = normalizeString(fullName);
  
  // Loại bỏ số ở đầu (nếu có)
  normalized = normalized.replace(/^\d+\s*/, '');
  
  // Capitalize chữ cái đầu mỗi từ (tùy chọn, có thể bỏ nếu muốn giữ nguyên)
  // normalized = normalized.replace(/\b\w/g, l => l.toUpperCase());
  
  return normalized;
}

/**
 * Validate và normalize address (địa chỉ chi tiết)
 */
function normalizeAddress(address) {
  if (!address) return '';
  
  let normalized = normalizeString(address);
  
  // Loại bỏ các ký tự đặc biệt không cần thiết ở đầu/cuối
  normalized = normalized.replace(/^[,\s.]+|[,\s.]+$/g, '');
  
  return normalized;
}

/**
 * Validate và normalize city/province
 */
function normalizeCity(city) {
  if (!city) return '';
  
  let normalized = normalizeString(city);
  
  // Loại bỏ "Tỉnh", "Thành phố" nếu có (để chuẩn hóa)
  normalized = normalized
    .replace(/^(Tỉnh|Thành phố|TP\.?)\s+/i, '')
    .trim();
  
  return normalized;
}

/**
 * Validate và normalize ward/district
 */
function normalizeWardDistrict(wardOrDistrict) {
  if (!wardOrDistrict) return '';
  
  let normalized = normalizeString(wardOrDistrict);
  
  // Loại bỏ "Phường", "Xã", "Quận", "Huyện" nếu có (để chuẩn hóa)
  normalized = normalized
    .replace(/^(Phường|Xã|P\.?)\s+/i, '')
    .replace(/^(Quận|Huyện|Q\.?|H\.?)\s+/i, '')
    .trim();
  
  return normalized;
}

/**
 * Validate và normalize toàn bộ shipping address từ geolocation
 * @param {Object} shippingAddress - Địa chỉ từ request
 * @returns {Object} - Địa chỉ đã được normalize và validate
 */
function normalizeShippingAddress(shippingAddress) {
  if (!shippingAddress || typeof shippingAddress !== 'object') {
    return null;
  }

  // Normalize từng trường
  const normalized = {
    fullName: normalizeFullName(shippingAddress.fullName || ''),
    phone: normalizePhone(shippingAddress.phone || ''),
    address: normalizeAddress(shippingAddress.address || ''),
    ward: normalizeWardDistrict(shippingAddress.ward || ''),
    district: normalizeWardDistrict(shippingAddress.district || ''),
    city: normalizeCity(shippingAddress.city || '')
  };

  // Validate các trường bắt buộc
  const errors = [];
  
  if (!normalized.fullName || normalized.fullName.length < 2) {
    errors.push('Họ tên phải có ít nhất 2 ký tự');
  }
  
  if (!normalized.phone || normalized.phone.length < 10) {
    errors.push('Số điện thoại không hợp lệ (cần ít nhất 10 số)');
  }
  
  if (!normalized.address || normalized.address.length < 5) {
    errors.push('Địa chỉ chi tiết phải có ít nhất 5 ký tự');
  }

  // city là optional nhưng nếu có thì phải validate
  if (normalized.city && normalized.city.length < 2) {
    errors.push('Tên tỉnh/thành phố không hợp lệ');
  }

  return {
    normalized,
    errors,
    isValid: errors.length === 0
  };
}

/**
 * Format địa chỉ đầy đủ để hiển thị
 */
function formatFullAddress(shippingAddress) {
  if (!shippingAddress) return '';
  
  const parts = [];
  
  if (shippingAddress.address) {
    parts.push(shippingAddress.address);
  }
  
  if (shippingAddress.ward) {
    parts.push(shippingAddress.ward);
  }
  
  if (shippingAddress.district) {
    parts.push(shippingAddress.district);
  }
  
  if (shippingAddress.city) {
    parts.push(shippingAddress.city);
  }
  
  return parts.join(', ');
}

module.exports = {
  normalizeString,
  normalizePhone,
  normalizeFullName,
  normalizeAddress,
  normalizeCity,
  normalizeWardDistrict,
  normalizeShippingAddress,
  formatFullAddress
};

