const axios = require("axios");
const crypto = require("crypto");

class MoMoService {
  constructor() {
    // MoMo API configuration - sẽ lấy từ .env
    this.partnerCode = process.env.MOMO_PARTNER_CODE || "";
    this.accessKey = process.env.MOMO_ACCESS_KEY || "";
    this.secretKey = process.env.MOMO_SECRET_KEY || "";
    this.endpoint = process.env.MOMO_ENDPOINT || "https://test-payment.momo.vn/v2/gateway/api/create";
    this.callbackUrl = process.env.MOMO_CALLBACK_URL || "http://localhost:3000/api/payment/momo/callback";
    this.returnUrl = process.env.MOMO_RETURN_URL || "http://localhost:3000/api/payment/momo/return";
    this.env = process.env.MOMO_ENV || "sandbox"; // sandbox hoặc production
  }

  /**
   * Tạo signature để xác thực request
   */
  createSignature(data) {
    const dataString = `accessKey=${data.accessKey}&amount=${data.amount}&extraData=${data.extraData}&ipnUrl=${data.ipnUrl}&orderId=${data.orderId}&orderInfo=${data.orderInfo}&partnerCode=${data.partnerCode}&redirectUrl=${data.redirectUrl}&requestId=${data.requestId}&requestType=${data.requestType}`;
    return crypto
      .createHmac("sha256", this.secretKey)
      .update(dataString)
      .digest("hex");
  }

  /**
   * Tạo đơn hàng thanh toán trên MoMo
   * @param {Object} orderInfo - Thông tin đơn hàng
   * @param {String} orderInfo.orderId - Mã đơn hàng (unique)
   * @param {Number} orderInfo.amount - Số tiền (VNĐ)
   * @param {String} orderInfo.orderInfo - Mô tả đơn hàng
   * @param {String} orderInfo.extraData - Dữ liệu bổ sung (optional, JSON string)
   * @returns {Promise<Object>} Kết quả từ MoMo API
   */
  async createOrder(orderInfo) {
    try {
      const {
        orderId,
        amount,
        orderInfo: orderInfoText,
        extraData = "{}",
      } = orderInfo;

      // Tạo requestId (unique)
      const requestId = `${orderId}_${Date.now()}`;

      // Tạo dữ liệu request
      const data = {
        partnerCode: this.partnerCode,
        partnerName: "Shop THB",
        storeId: "ShopTHB",
        requestId: requestId,
        amount: amount,
        orderId: orderId,
        orderInfo: orderInfoText,
        redirectUrl: this.returnUrl,
        ipnUrl: this.callbackUrl,
        extraData: extraData,
        requestType: "captureWallet",
        autoCapture: true,
        lang: "vi",
        accessKey: this.accessKey,
        signature: "", // Sẽ tính sau
      };

      // Tạo signature
      data.signature = this.createSignature(data);

      // Gọi API MoMo
      const response = await axios.post(this.endpoint, data, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.data && response.data.resultCode === 0) {
        return {
          success: true,
          resultCode: response.data.resultCode,
          message: response.data.message,
          payUrl: response.data.payUrl,
          deeplink: response.data.deeplink,
          qrCodeUrl: response.data.qrCodeUrl,
          orderId: response.data.orderId,
          requestId: response.data.requestId,
        };
      } else {
        return {
          success: false,
          resultCode: response.data?.resultCode || -1,
          message: response.data?.message || "Lỗi không xác định",
        };
      }
    } catch (error) {
      console.error("MoMo create order error:", error);
      return {
        success: false,
        resultCode: -1,
        message: error.message || "Lỗi kết nối MoMo",
      };
    }
  }

  /**
   * Xác thực callback từ MoMo
   * @param {Object} callbackData - Dữ liệu callback từ MoMo
   * @returns {Boolean} true nếu hợp lệ
   */
  verifyCallback(callbackData) {
    try {
      const {
        partnerCode,
        orderId,
        requestId,
        amount,
        orderInfo,
        orderType,
        transId,
        resultCode,
        message,
        payType,
        responseTime,
        extraData,
        signature,
      } = callbackData;

      // Tạo signature từ dữ liệu callback (theo thứ tự alphabet)
      const dataString = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData || ""}&message=${message || ""}&orderId=${orderId}&orderInfo=${orderInfo || ""}&orderType=${orderType || ""}&partnerCode=${partnerCode}&payType=${payType || ""}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId || ""}`;
      const calculatedSignature = crypto
        .createHmac("sha256", this.secretKey)
        .update(dataString)
        .digest("hex");

      // So sánh signature
      return calculatedSignature === signature;
    } catch (error) {
      console.error("MoMo verify callback error:", error);
      return false;
    }
  }

  /**
   * Query thông tin đơn hàng từ MoMo
   * @param {String} orderId - Mã đơn hàng
   * @param {String} requestId - Mã request (optional)
   * @returns {Promise<Object>} Thông tin đơn hàng
   */
  async queryOrder(orderId, requestId = null) {
    try {
      const queryRequestId = requestId || `${orderId}_query_${Date.now()}`;

      const data = {
        partnerCode: this.partnerCode,
        orderId: orderId,
        requestId: queryRequestId,
        lang: "vi",
        accessKey: this.accessKey,
        signature: "", // Sẽ tính sau
      };

      // Tạo signature cho query
      const dataString = `accessKey=${data.accessKey}&orderId=${data.orderId}&partnerCode=${data.partnerCode}&requestId=${data.requestId}`;
      data.signature = crypto
        .createHmac("sha256", this.secretKey)
        .update(dataString)
        .digest("hex");

      const queryUrl = this.env === "production"
        ? "https://payment.momo.vn/v2/gateway/api/query"
        : "https://test-payment.momo.vn/v2/gateway/api/query";

      const response = await axios.post(queryUrl, data, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      return {
        success: response.data?.resultCode === 0,
        data: response.data,
      };
    } catch (error) {
      console.error("MoMo query order error:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Tạo mã đơn hàng (orderId) theo format MoMo
   * Format: orderId (tối đa 50 ký tự)
   */
  generateOrderId(orderId) {
    // Sử dụng orderId từ database, thêm prefix nếu cần
    return `MOMO_${orderId.toString().slice(-40)}`;
  }
}

module.exports = new MoMoService();

