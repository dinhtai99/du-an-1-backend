// Import các thư viện cần thiết
const axios = require("axios"); // HTTP client để gọi API ZaloPay
const crypto = require("crypto"); // Thư viện để tạo HMAC-SHA256 signature
const http = require("http"); // HTTP module (có thể dùng cho custom request)
const https = require("https"); // HTTPS module (có thể dùng cho custom request)
const { URLSearchParams } = require("url"); // Utility để xử lý query string và form data

/**
 * Class xử lý tích hợp thanh toán ZaloPay
 * ZaloPay là cổng thanh toán của Zalo, phổ biến tại Việt Nam
 */
class ZaloPayService {
  /**
   * Hàm khởi tạo - Load cấu hình từ biến môi trường
   */
  constructor() {
    // ZaloPay API configuration - sẽ lấy từ .env
    // App ID - Mã ứng dụng do ZaloPay cấp khi đăng ký merchant
    this.appId = process.env.ZALOPAY_APP_ID || "";
    
    // Key1 - Khóa bí mật thứ nhất, dùng để tạo chữ ký MAC cho create order
    this.key1 = process.env.ZALOPAY_KEY1 || "";
    
    // Key2 - Khóa bí mật thứ hai, dùng để verify callback từ ZaloPay
    this.key2 = process.env.ZALOPAY_KEY2 || "";
    
    // Endpoint URL - URL API để tạo đơn hàng thanh toán
    // Mặc định là sandbox (test): https://sb-openapi.zalopay.vn/v2/create
    this.endpoint = process.env.ZALOPAY_ENDPOINT || "https://sb-openapi.zalopay.vn/v2/create";
    
    // Callback URL - URL mà ZaloPay sẽ gọi lại (IPN) khi có thay đổi trạng thái thanh toán
    this.callbackUrl = process.env.ZALOPAY_CALLBACK_URL || "http://localhost:3000/api/payment/zalopay/callback";
    
    // Môi trường: sandbox (test) hoặc production (thật)
    this.env = process.env.ZALOPAY_ENV || "sandbox"; // sandbox hoặc production
  }

  /**
   * Tạo chữ ký HMAC SHA256 theo chuẩn ZaloPay
   * ZaloPay sử dụng HMAC-SHA256 để tạo chữ ký MAC cho tất cả requests
   * @param {String} dataString - Chuỗi dữ liệu cần ký (MAC string)
   * @param {String} key - Khóa bí mật (key1 hoặc key2)
   * @returns {String} Signature dạng hex string
   */
  sign(dataString, key) {
    // Tạo HMAC-SHA256 hash từ dataString và key
    return crypto.createHmac("sha256", key).update(dataString).digest("hex");
  }

  /**
   * Chuẩn hóa chuỗi MAC cho request create order
   * ZaloPay yêu cầu MAC string phải theo format: app_id|app_trans_id|app_user|amount|app_time|embed_data|item
   * QUAN TRỌNG: amount và app_time phải là số nguyên, không phải string
   * @param {Object} params - Các tham số để tạo MAC string
   * @param {String} params.app_id - App ID
   * @param {String} params.app_trans_id - Mã đơn hàng (tối đa 40 ký tự)
   * @param {String} params.app_user - User ID
   * @param {Number} params.amount - Số tiền (số nguyên, VNĐ)
   * @param {Number} params.app_time - Timestamp (số nguyên, milliseconds)
   * @param {String} params.embed_data - Dữ liệu embed (JSON string)
   * @param {String} params.item - Danh sách items (JSON string)
   * @returns {String} MAC string theo format ZaloPay
   */
  buildCreateOrderMacString({ app_id, app_trans_id, app_user, amount, app_time, embed_data, item }) {
    // Nối các tham số bằng dấu | (pipe)
    // Format: app_id|app_trans_id|app_user|amount|app_time|embed_data|item
    return `${app_id}|${app_trans_id}|${app_user}|${amount}|${app_time}|${embed_data}|${item}`;
  }

  /**
   * Chuỗi MAC cho callback verification
   * ZaloPay gửi callback với MAC string theo format: app_id|app_trans_id|pmcid|bank_code|amount|discount_amount|status
   * @param {Object} data - Dữ liệu callback từ ZaloPay (có thể có snake_case hoặc camelCase)
   * @returns {String} MAC string để verify callback
   */
  buildCallbackMacString(data) {
    if (!data) return "";
    
    // Hỗ trợ cả snake_case (app_id) và camelCase (appid) từ ZaloPay
    const appId = data.app_id || data.appid || "";
    const appTransId = data.app_trans_id || data.apptransid || "";
    const pmcId = data.pmc_id || data.pmcid || "";
    const bankCode = data.bank_code || data.bankcode || "";
    const amount = data.amount ?? 0;
    const discountAmount = data.discount_amount ?? data.discountamount ?? 0;
    const status = data.status ?? 0;
    
    // Format: app_id|app_trans_id|pmcid|bank_code|amount|discount_amount|status
    return `${appId}|${appTransId}|${pmcId}|${bankCode}|${amount}|${discountAmount}|${status}`;
  }

  /**
   * Chuỗi MAC cho query order
   * ZaloPay yêu cầu MAC string cho query: app_id|app_trans_id|app_time
   * @param {Object} params - Các tham số để tạo MAC string
   * @param {String} params.app_id - App ID
   * @param {String} params.app_trans_id - Mã đơn hàng
   * @param {Number} params.app_time - Timestamp (milliseconds)
   * @returns {String} MAC string theo format ZaloPay
   */
  buildQueryMacString({ app_id, app_trans_id, app_time }) {
    // Format: app_id|app_trans_id|app_time
    return `${app_id}|${app_trans_id}|${app_time}`;
  }

  /**
   * Tạo đơn hàng thanh toán trên ZaloPay
   * @param {Object} orderInfo - Thông tin đơn hàng
   * @param {String} orderInfo.app_trans_id - Mã đơn hàng (unique, max 40 chars)
   * @param {Number} orderInfo.amount - Số tiền (VNĐ)
   * @param {String} orderInfo.description - Mô tả đơn hàng
   * @param {String} orderInfo.item - JSON string của items
   * @param {String} orderInfo.embed_data - Dữ liệu embed (optional)
   * @returns {Promise<Object>} Kết quả từ ZaloPay API
   */
  async createOrder(orderInfo) {
    try {
      // Validate config
      if (!this.appId || !this.key1 || !this.key2) {
        console.error("❌ ZaloPay config missing:", {
          hasAppId: !!this.appId,
          hasKey1: !!this.key1,
          hasKey2: !!this.key2
        });
        return {
          success: false,
          return_code: -1,
          return_message: "ZaloPay chưa được cấu hình đầy đủ! Vui lòng kiểm tra biến môi trường.",
        };
      }

      const {
        app_trans_id,
        amount,
        description,
        item,
        embed_data = "{}",
      } = orderInfo;

      // Validate input
      if (!app_trans_id || !amount || !description || !item) {
        console.error("❌ ZaloPay create order: Missing required fields", orderInfo);
        return {
          success: false,
          return_code: -1,
          return_message: "Thiếu thông tin bắt buộc!",
        };
      }

      // Validate amount: phải là số nguyên > 0
      const amountNum = parseInt(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        console.error("❌ ZaloPay create order: Invalid amount", { amount, amountNum });
        return {
          success: false,
          return_code: -1,
          return_message: `Số tiền không hợp lệ! (${amount})`,
        };
      }

      // Validate app_trans_id: tối đa 40 ký tự
      if (app_trans_id.length > 40) {
        console.error("❌ ZaloPay create order: app_trans_id quá dài", { 
          app_trans_id, 
          length: app_trans_id.length 
        });
        return {
          success: false,
          return_code: -1,
          return_message: "Mã đơn hàng quá dài! (tối đa 40 ký tự)",
        };
      }

      // Tạo timestamp (milliseconds)
      const app_time = Date.now();

      // Tạo dữ liệu request (đảm bảo amount là số nguyên)
      // Lưu ý: MAC string phải dùng giá trị gốc (không String() cho amount và app_time)
      const data = {
        app_id: String(this.appId),
        app_user: "Shop_THB_User",
        app_time: app_time, // Giữ nguyên số nguyên (milliseconds)
        amount: amountNum, // Sử dụng số nguyên đã validate
        app_trans_id: String(app_trans_id),
        embed_data: String(embed_data),
        item: String(item),
        description: String(description),
        bank_code: "", // Để trống để user chọn trong ZaloPay app
        callback_url: this.callbackUrl,
        mac: "", // Sẽ tính sau
      };

      // Tạo MAC string với giá trị gốc (quan trọng: amount và app_time phải là số, không phải string)
      const macString = this.buildCreateOrderMacString({
        app_id: String(this.appId),
        app_trans_id: String(app_trans_id),
        app_user: "Shop_THB_User",
        amount: amountNum, // Số nguyên
        app_time: app_time, // Số nguyên (milliseconds)
        embed_data: String(embed_data),
        item: String(item)
      });
      
      data.mac = this.sign(macString, this.key1);
      
      // Validate MAC không rỗng
      if (!data.mac || data.mac.length === 0) {
        console.error("❌ MAC signature is empty!");
        return {
          success: false,
          return_code: -1,
          return_message: "Lỗi tạo chữ ký MAC!",
        };
      }

      console.log("📤 ZaloPay API request:", {
        endpoint: this.endpoint,
        app_id: data.app_id,
        app_trans_id: data.app_trans_id,
        amount: data.amount,
        app_time: data.app_time,
        app_user: data.app_user,
        callback_url: data.callback_url,
        description_length: data.description.length,
        item_length: data.item.length,
        embed_data_length: data.embed_data.length,
        mac_length: data.mac.length
      });
      
      console.log("🔐 ZaloPay MAC string:", macString);
      console.log("🔐 ZaloPay MAC signature:", data.mac);
      console.log("🔐 ZaloPay MAC (first 20 chars):", data.mac.substring(0, 20) + "...");

      // Tạo form body - ZaloPay yêu cầu tất cả giá trị là string
      // Lưu ý: MAC string dùng số nguyên, nhưng form data phải là string
      const formData = {
        app_id: String(this.appId),
        app_user: "Shop_THB_User",
        app_time: String(app_time), // String cho form data
        amount: String(amountNum), // String cho form data
        app_trans_id: String(app_trans_id),
        embed_data: String(embed_data),
        item: String(item),
        description: String(description),
        bank_code: "", // Để trống để user chọn
        callback_url: this.callbackUrl,
        mac: data.mac
      };
      
      // Log form data trước khi encode
      console.log("📤 Form data (before encoding):", {
        app_id: formData.app_id,
        app_trans_id: formData.app_trans_id,
        amount: formData.amount,
        app_time: formData.app_time,
        description_length: formData.description.length,
        item_length: formData.item.length,
        embed_data_length: formData.embed_data.length,
        callback_url: formData.callback_url,
        mac_length: formData.mac.length
      });
      
      const formBody = new URLSearchParams(formData).toString();
      
      // Log form body để debug (ẩn MAC)
      const formBodyForLog = formBody.replace(/mac=[^&]*/, 'mac=***');
      console.log("📤 Form body length:", formBody.length);
      console.log("📤 Form body (first 200 chars, MAC hidden):", formBodyForLog.substring(0, 200));

      // Gọi API ZaloPay với retry logic (tối ưu cho Android app timeout 30s)
      let response;
      let lastError;
      const maxRetries = 1; // Chỉ retry 1 lần để tránh timeout quá lâu (tối đa 2 lần thử)
      const timeout = 20000; // 20 seconds timeout (để còn buffer cho Android app 30s)
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`📤 ZaloPay API attempt ${attempt}/${maxRetries}...`);
          
          response = await axios.post(this.endpoint, formBody, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
            timeout: timeout,
            // Thêm keep-alive và connection timeout
            httpAgent: new http.Agent({ 
              keepAlive: true,
              timeout: timeout,
              maxSockets: 5
            }),
            httpsAgent: new https.Agent({ 
              keepAlive: true,
              timeout: timeout,
              maxSockets: 5
            }),
          });
          
          // Nếu thành công, break khỏi loop
          break;
        } catch (error) {
          lastError = error;
          
          // Nếu là timeout hoặc network error, thử lại
          if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            if (attempt < maxRetries) {
              const waitTime = 1000; // Chỉ chờ 1s giữa các lần retry để nhanh hơn
              console.log(`⏳ ZaloPay timeout/network error, retrying in ${waitTime}ms... (attempt ${attempt}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              continue;
            }
          }
          
          // Nếu là lỗi khác hoặc đã hết retry, throw error
          throw error;
        }
      }
      
      // Nếu vẫn không có response sau tất cả retries
      if (!response && lastError) {
        throw lastError;
      }

      // Log toàn bộ response để debug
      console.log("📥 ZaloPay API response (full):", JSON.stringify(response.data, null, 2));
      console.log("📥 ZaloPay API response (summary):", {
        status: response.status,
        return_code: response.data?.return_code,
        sub_return_code: response.data?.sub_return_code,
        return_message: response.data?.return_message,
        is_payment_url: !!response.data?.order_url,
        has_zp_trans_token: !!response.data?.zp_trans_token
      });

      if (response.data && response.data.return_code === 1) {
        return {
          success: true,
          return_code: response.data.return_code,
          return_message: response.data.return_message,
          zp_trans_token: response.data.zp_trans_token,
          order_url: response.data.order_url,
          order_token: response.data.order_token,
        };
      } else {
        // Log chi tiết lỗi để debug
        const errorData = response.data || {};
        const subReturnCode = errorData.sub_return_code;
        let errorMessage = errorData.return_message || "Lỗi không xác định";
        
        // Thêm thông tin chi tiết dựa trên sub_return_code
        if (subReturnCode) {
          switch (subReturnCode) {
            case -68:
              errorMessage += " (Mã giao dịch bị trùng - app_trans_id đã được sử dụng)";
              break;
            case -401:
              errorMessage += " (Dữ liệu yêu cầu không hợp lệ - kiểm tra format và các field bắt buộc)";
              break;
            case -402:
              errorMessage += " (Chữ ký không hợp lệ - kiểm tra key1 và MAC)";
              break;
            case -5:
              errorMessage += " (Số tiền không hợp lệ - amount phải > 0)";
              break;
            case -3:
              errorMessage += " (Ứng dụng không hợp lệ - kiểm tra app_id)";
              break;
            default:
              errorMessage += ` (sub_return_code: ${subReturnCode})`;
          }
        }
        
        // Log chi tiết để debug
        console.error("❌ ZaloPay API error (full response):", JSON.stringify(errorData, null, 2));
        console.error("❌ ZaloPay API error (summary):", {
          return_code: errorData.return_code,
          sub_return_code: subReturnCode,
          return_message: errorData.return_message,
          app_id: this.appId,
          app_id_length: this.appId?.length,
          app_trans_id: data.app_trans_id,
          app_trans_id_length: data.app_trans_id?.length,
          amount: data.amount,
          amount_type: typeof data.amount,
          app_time: data.app_time,
          app_time_type: typeof data.app_time,
          hasKey1: !!this.key1,
          key1_length: this.key1?.length,
          hasKey2: !!this.key2,
          key2_length: this.key2?.length,
          endpoint: this.endpoint,
          mac_string: macString,
          calculated_mac: data.mac.substring(0, 20) + "..."
        });
        
        return {
          success: false,
          return_code: errorData.return_code || -1,
          sub_return_code: subReturnCode,
          return_message: errorMessage,
        };
      }
    } catch (error) {
      // Phân loại lỗi để trả về message phù hợp
      let errorMessage = "Lỗi kết nối ZaloPay";
      
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        errorMessage = "Kết nối ZaloPay quá thời gian chờ. Vui lòng thử lại sau!";
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        errorMessage = "Không thể kết nối đến ZaloPay. Vui lòng kiểm tra kết nối mạng!";
      } else if (error.response) {
        // Có response từ server nhưng có lỗi
        errorMessage = error.response.data?.return_message || error.message || "Lỗi từ ZaloPay API";
      } else {
        // Lỗi network hoặc timeout
        errorMessage = error.message || "Lỗi kết nối ZaloPay";
      }
      
      console.error("❌ ZaloPay create order error:", {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
        endpoint: this.endpoint,
        hasAppId: !!this.appId,
        hasKey1: !!this.key1,
        hasKey2: !!this.key2
      });
      
      return {
        success: false,
        return_code: -1,
        return_message: errorMessage,
        error_code: error.code,
        endpoint: this.endpoint
      };
    }
  }

  /**
   * Xác thực callback từ ZaloPay
   * @param {Object} callbackData - Dữ liệu callback từ ZaloPay
   * @returns {Boolean} true nếu hợp lệ
   */
  verifyCallback(callbackData) {
    try {
      const { data, mac } = callbackData;

      if (!data || !mac || !this.key2) {
        console.error("ZaloPay verify callback: Missing data, mac, or key2");
        return false;
      }

      // Tạo bản sao của data và loại bỏ mac nếu có (để tính MAC chính xác)
      const dataForMac = { ...data };
      if (dataForMac.mac) {
        delete dataForMac.mac;
      }

      const macString = this.buildCallbackMacString(dataForMac);
      const calculatedMac = this.sign(macString, this.key2);

      // So sánh MAC (case-insensitive để tránh lỗi)
      const isValid = calculatedMac.toLowerCase() === mac.toLowerCase();
      
      if (!isValid) {
        console.error("ZaloPay MAC mismatch:", {
          calculated: calculatedMac,
          received: mac,
          dataKeys: Object.keys(dataForMac),
          dataSample: JSON.stringify(dataForMac).substring(0, 200)
        });
      }
      
      return isValid;
    } catch (error) {
      console.error("ZaloPay verify callback error:", error);
      return false;
    }
  }

  /**
   * Query thông tin đơn hàng từ ZaloPay
   * @param {String} appTransId - Mã đơn hàng (app_trans_id)
   * @returns {Promise<Object>} Thông tin đơn hàng
   */
  async queryOrder(appTransId) {
    try {
      const appTime = Date.now();

      const data = {
        app_id: this.appId,
        app_trans_id: appTransId,
        app_time: appTime,
        mac: "",
      };

      const macString = this.buildQueryMacString(data);
      data.mac = this.sign(macString, this.key1);

      const queryUrl = this.env === "production"
        ? "https://openapi.zalopay.vn/v2/query"
        : "https://sb-openapi.zalopay.vn/v2/query";

      const formBody = new URLSearchParams(data).toString();

      const response = await axios.post(queryUrl, formBody, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      return {
        success: response.data?.return_code === 1,
        data: response.data,
      };
    } catch (error) {
      console.error("ZaloPay query order error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Tạo mã đơn hàng (app_trans_id) theo format ZaloPay
   * Format: YYMMDD_orderId (tối đa 40 ký tự)
   */
  generateAppTransId(orderId) {
    const date = new Date();
    const year = String(date.getFullYear()).slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    const milliseconds = String(date.getMilliseconds()).padStart(3, "0");
    
    // Format: YYMMDD_HHMMSSMMM_orderId (tối đa 40 ký tự)
    // Thêm timestamp để đảm bảo unique
    const orderIdStr = orderId.toString();
    const dateTimePrefix = `${year}${month}${day}_${hours}${minutes}${seconds}${milliseconds}_`;
    const maxOrderIdLength = 40 - dateTimePrefix.length;
    const orderIdSuffix = orderIdStr.length > maxOrderIdLength 
      ? orderIdStr.slice(-maxOrderIdLength) 
      : orderIdStr;
    
    const appTransId = `${dateTimePrefix}${orderIdSuffix}`;
    
    // Validate không vượt quá 40 ký tự
    if (appTransId.length > 40) {
      console.warn(`⚠️ app_trans_id quá dài (${appTransId.length}), cắt bớt`);
      return appTransId.slice(0, 40);
    }
    
    return appTransId;
  }
}

module.exports = new ZaloPayService();

