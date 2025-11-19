const axios = require("axios");
const crypto = require("crypto");

class ZaloPayService {
  constructor() {
    // ZaloPay API configuration - sẽ lấy từ .env
    this.appId = process.env.ZALOPAY_APP_ID || "";
    this.key1 = process.env.ZALOPAY_KEY1 || "";
    this.key2 = process.env.ZALOPAY_KEY2 || "";
    this.endpoint = process.env.ZALOPAY_ENDPOINT || "https://sb-openapi.zalopay.vn/v2/create";
    this.callbackUrl = process.env.ZALOPAY_CALLBACK_URL || "http://localhost:3000/api/payment/zalopay/callback";
    this.env = process.env.ZALOPAY_ENV || "sandbox"; // sandbox hoặc production
  }

  /**
   * Tạo MAC (Message Authentication Code) để xác thực request
   */
  createMac(data, key) {
    const dataString = Object.keys(data)
      .sort()
      .map((key) => `${key}=${data[key]}`)
      .join("&");
    return crypto
      .createHmac("sha256", key)
      .update(dataString)
      .digest("hex");
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

      // Tạo timestamp (milliseconds)
      const app_time = Date.now();

      // Tạo dữ liệu request
      const data = {
        app_id: this.appId,
        app_user: "Shop_THB_User",
        app_time: app_time,
        amount: amount,
        app_trans_id: app_trans_id,
        embed_data: embed_data,
        item: item,
        description: description,
        bank_code: "", // Để trống để user chọn trong ZaloPay app
        callback_url: this.callbackUrl,
        mac: "", // Sẽ tính sau
      };

      // Tạo MAC
      data.mac = this.createMac(data, this.key1);

      console.log("📤 ZaloPay API request:", {
        endpoint: this.endpoint,
        app_id: this.appId,
        app_trans_id: app_trans_id,
        amount: amount,
        callback_url: this.callbackUrl
      });

      // Gọi API ZaloPay
      const response = await axios.post(this.endpoint, null, {
        params: data,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 30000, // 30 seconds timeout
      });

      console.log("📥 ZaloPay API response:", {
        status: response.status,
        return_code: response.data?.return_code,
        return_message: response.data?.return_message
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
        console.error("❌ ZaloPay API error:", response.data);
        return {
          success: false,
          return_code: response.data?.return_code || -1,
          return_message: response.data?.return_message || "Lỗi không xác định",
        };
      }
    } catch (error) {
      console.error("❌ ZaloPay create order error:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      return {
        success: false,
        return_code: -1,
        return_message: error.response?.data?.return_message || error.message || "Lỗi kết nối ZaloPay",
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

      // Tạo MAC từ data với key2
      const calculatedMac = this.createMac(dataForMac, this.key2);

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
        mac: "",
      };

      // Tạo MAC
      data.mac = this.createMac(data, this.key1);

      const queryUrl = this.env === "production"
        ? "https://openapi.zalopay.vn/v2/query"
        : "https://sb-openapi.zalopay.vn/v2/query";

      const response = await axios.post(queryUrl, null, {
        params: data,
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
    return `${year}${month}${day}_${orderId.toString().slice(-30)}`;
  }
}

module.exports = new ZaloPayService();

