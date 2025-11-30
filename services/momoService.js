// Import các thư viện cần thiết
const axios = require("axios"); // HTTP client để gọi API MoMo
const crypto = require("crypto"); // Thư viện để tạo HMAC-SHA256 signature

/**
 * Class xử lý tích hợp thanh toán MoMo
 * MoMo là một trong những cổng thanh toán phổ biến tại Việt Nam
 */
class MoMoService {
  /**
   * Hàm khởi tạo - Load cấu hình từ biến môi trường
   */
  constructor() {
    // MoMo API configuration - sẽ lấy từ .env
    // Partner Code - Mã đối tác do MoMo cấp khi đăng ký merchant
    this.partnerCode = process.env.MOMO_PARTNER_CODE || "";
    
    // Access Key - Khóa truy cập API do MoMo cấp
    this.accessKey = process.env.MOMO_ACCESS_KEY || "";
    
    // Secret Key - Khóa bí mật dùng để tạo chữ ký (signature) cho request
    this.secretKey = process.env.MOMO_SECRET_KEY || "";
    
    // Endpoint URL - URL API để tạo đơn hàng thanh toán
    // Mặc định là sandbox (test): https://test-payment.momo.vn/v2/gateway/api/create
    this.endpoint = process.env.MOMO_ENDPOINT || "https://test-payment.momo.vn/v2/gateway/api/create";
    
    // Callback URL - URL mà MoMo sẽ gọi lại (IPN) khi có thay đổi trạng thái thanh toán
    this.callbackUrl = process.env.MOMO_CALLBACK_URL || "http://localhost:3000/api/payment/momo/callback";
    
    // Return URL - URL mà MoMo sẽ redirect khách hàng về sau khi thanh toán xong
    this.returnUrl = process.env.MOMO_RETURN_URL || "http://localhost:3000/api/payment/momo/return";
    
    // Môi trường: sandbox (test) hoặc production (thật)
    this.env = process.env.MOMO_ENV || "sandbox"; // sandbox hoặc production
  }

  /**
   * Tạo signature để xác thực request
   * MoMo yêu cầu tất cả request phải có chữ ký (signature) để đảm bảo tính toàn vẹn
   * Signature được tạo bằng HMAC-SHA256 từ các tham số request và secretKey
   * @param {Object} data - Object chứa các tham số request (accessKey, amount, orderId, ...)
   * @returns {String} Signature dạng hex string
   */
  createSignature(data) {
    // Tạo chuỗi data string từ các tham số theo thứ tự alphabet
    // Format: key1=value1&key2=value2&...
    // QUAN TRỌNG: Thứ tự các tham số phải đúng theo yêu cầu của MoMo
    const dataString = `accessKey=${data.accessKey}&amount=${data.amount}&extraData=${data.extraData}&ipnUrl=${data.ipnUrl}&orderId=${data.orderId}&orderInfo=${data.orderInfo}&partnerCode=${data.partnerCode}&redirectUrl=${data.redirectUrl}&requestId=${data.requestId}&requestType=${data.requestType}`;
    
    // Tạo HMAC-SHA256 hash từ dataString và secretKey
    // HMAC-SHA256 là thuật toán mã hóa một chiều, dùng để tạo chữ ký
    return crypto
      .createHmac("sha256", this.secretKey) // Tạo HMAC với secretKey
      .update(dataString) // Cập nhật với dataString
      .digest("hex"); // Lấy kết quả dạng hex string
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
      // Destructure các thông tin từ orderInfo
      const {
        orderId, // Mã đơn hàng (unique)
        amount, // Số tiền thanh toán (VNĐ)
        orderInfo: orderInfoText, // Mô tả đơn hàng
        extraData = "{}", // Dữ liệu bổ sung (JSON string, mặc định là "{}")
      } = orderInfo;

      // Tạo requestId (unique) - ID của request này
      // Format: orderId_timestamp (ví dụ: "ORD123_1699123456789")
      const requestId = `${orderId}_${Date.now()}`;

      // Tạo dữ liệu request gửi đến MoMo API
      const data = {
        partnerCode: this.partnerCode, // Mã đối tác
        partnerName: "Shop THB", // Tên đối tác
        storeId: "ShopTHB", // ID cửa hàng
        requestId: requestId, // ID request (unique)
        amount: amount, // Số tiền thanh toán (VNĐ)
        orderId: orderId, // Mã đơn hàng
        orderInfo: orderInfoText, // Mô tả đơn hàng
        redirectUrl: this.returnUrl, // URL redirect về sau khi thanh toán
        ipnUrl: this.callbackUrl, // URL callback (IPN) khi có thay đổi trạng thái
        extraData: extraData, // Dữ liệu bổ sung (JSON string)
        requestType: "captureWallet", // Loại request: captureWallet (thanh toán ví MoMo)
        autoCapture: true, // Tự động capture (thu tiền) khi thanh toán thành công
        lang: "vi", // Ngôn ngữ: "vi" (tiếng Việt)
        accessKey: this.accessKey, // Access Key
        signature: "", // Chữ ký (sẽ tính sau)
      };

      // Tạo signature từ data (trước khi thêm signature vào data)
      // Signature được tính từ tất cả các tham số trừ chính signature
      data.signature = this.createSignature(data);

      // Gọi API MoMo để tạo đơn hàng thanh toán
      // POST request với Content-Type: application/json
      const response = await axios.post(this.endpoint, data, {
        headers: {
          "Content-Type": "application/json", // Header bắt buộc
        },
      });

      // Kiểm tra kết quả từ MoMo API
      // resultCode === 0 nghĩa là thành công
      if (response.data && response.data.resultCode === 0) {
        // Trả về thông tin thanh toán thành công
        return {
          success: true, // Thành công
          resultCode: response.data.resultCode, // Mã kết quả (0 = thành công)
          message: response.data.message, // Thông báo từ MoMo
          payUrl: response.data.payUrl, // URL thanh toán (để redirect khách hàng)
          deeplink: response.data.deeplink, // Deep link để mở app MoMo (nếu có)
          qrCodeUrl: response.data.qrCodeUrl, // URL QR code để quét thanh toán (nếu có)
          orderId: response.data.orderId, // Mã đơn hàng
          requestId: response.data.requestId, // ID request
        };
      } else {
        // Trả về lỗi nếu resultCode !== 0
        return {
          success: false, // Thất bại
          resultCode: response.data?.resultCode || -1, // Mã lỗi từ MoMo hoặc -1 nếu không có
          message: response.data?.message || "Lỗi không xác định", // Thông báo lỗi
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
   * Hàm này verify chữ ký từ MoMo callback để đảm bảo request đến từ MoMo thật
   * @param {Object} callbackData - Dữ liệu callback từ MoMo (IPN)
   * @returns {Boolean} true nếu chữ ký hợp lệ, false nếu không hợp lệ
   */
  verifyCallback(callbackData) {
    try {
      // Destructure các thông tin từ callback data
      const {
        partnerCode, // Mã đối tác
        orderId, // Mã đơn hàng
        requestId, // ID request
        amount, // Số tiền
        orderInfo, // Mô tả đơn hàng
        orderType, // Loại đơn hàng
        transId, // ID giao dịch từ MoMo
        resultCode, // Mã kết quả (0 = thành công)
        message, // Thông báo
        payType, // Loại thanh toán
        responseTime, // Thời gian response
        extraData, // Dữ liệu bổ sung
        signature, // Chữ ký từ MoMo
      } = callbackData;

      // Tạo signature từ dữ liệu callback (theo thứ tự alphabet)
      // QUAN TRỌNG: Thứ tự các tham số phải đúng theo yêu cầu của MoMo
      // Các giá trị null/undefined được thay bằng chuỗi rỗng ""
      const dataString = `accessKey=${this.accessKey}&amount=${amount}&extraData=${extraData || ""}&message=${message || ""}&orderId=${orderId}&orderInfo=${orderInfo || ""}&orderType=${orderType || ""}&partnerCode=${partnerCode}&payType=${payType || ""}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId || ""}`;
      
      // Tạo HMAC-SHA256 hash từ dataString và secretKey
      const calculatedSignature = crypto
        .createHmac("sha256", this.secretKey) // Tạo HMAC với secretKey
        .update(dataString) // Cập nhật với dataString
        .digest("hex"); // Lấy kết quả dạng hex string

      // So sánh signature tính được với signature từ MoMo
      // Nếu giống nhau → request hợp lệ, đến từ MoMo
      // Nếu khác nhau → request không hợp lệ, có thể bị giả mạo
      return calculatedSignature === signature;
    } catch (error) {
      console.error("MoMo verify callback error:", error);
      return false;
    }
  }

  /**
   * Query thông tin đơn hàng từ MoMo
   * Hàm này gọi API MoMo để tra cứu thông tin giao dịch (trạng thái, số tiền, ...)
   * @param {String} orderId - Mã đơn hàng cần tra cứu
   * @param {String} requestId - Mã request (optional, nếu không có sẽ tự tạo)
   * @returns {Promise<Object>} { success: boolean, data: {...} } hoặc { success: false, error: string }
   */
  async queryOrder(orderId, requestId = null) {
    try {
      // Tạo requestId nếu không có
      // Format: orderId_query_timestamp (ví dụ: "ORD123_query_1699123456789")
      const queryRequestId = requestId || `${orderId}_query_${Date.now()}`;

      // Tạo dữ liệu request gửi đến MoMo API
      const data = {
        partnerCode: this.partnerCode, // Mã đối tác
        orderId: orderId, // Mã đơn hàng cần tra cứu
        requestId: queryRequestId, // ID request (unique)
        lang: "vi", // Ngôn ngữ: "vi" (tiếng Việt)
        accessKey: this.accessKey, // Access Key
        signature: "", // Chữ ký (sẽ tính sau)
      };

      // Tạo signature cho query request
      // Format: accessKey=...&orderId=...&partnerCode=...&requestId=...
      const dataString = `accessKey=${data.accessKey}&orderId=${data.orderId}&partnerCode=${data.partnerCode}&requestId=${data.requestId}`;
      
      // Tạo HMAC-SHA256 hash từ dataString và secretKey
      data.signature = crypto
        .createHmac("sha256", this.secretKey) // Tạo HMAC với secretKey
        .update(dataString) // Cập nhật với dataString
        .digest("hex"); // Lấy kết quả dạng hex string

      // Xác định URL API query của MoMo
      // Production: https://payment.momo.vn/v2/gateway/api/query
      // Sandbox (test): https://test-payment.momo.vn/v2/gateway/api/query
      const queryUrl = this.env === "production"
        ? "https://payment.momo.vn/v2/gateway/api/query"
        : "https://test-payment.momo.vn/v2/gateway/api/query";

      // Gọi API MoMo để tra cứu đơn hàng
      // POST request với Content-Type: application/json
      const response = await axios.post(queryUrl, data, {
        headers: {
          "Content-Type": "application/json", // Header bắt buộc
        },
      });

      // Trả về kết quả
      return {
        success: response.data?.resultCode === 0, // Thành công nếu resultCode === 0
        data: response.data, // Dữ liệu từ MoMo (trạng thái, số tiền, ...)
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
   * MoMo yêu cầu orderId tối đa 50 ký tự và phải unique
   * @param {String|Number} orderId - ID đơn hàng trong hệ thống
   * @returns {String} Mã đơn hàng cho MoMo (format: MOMO_<orderId>, tối đa 50 ký tự)
   */
  generateOrderId(orderId) {
    // Sử dụng orderId từ database, thêm prefix "MOMO_" nếu cần
    // slice(-40): Lấy 40 ký tự cuối cùng của orderId (để đảm bảo tổng cộng không quá 50 ký tự)
    // Format: "MOMO_" (5 ký tự) + orderId (tối đa 40 ký tự) = tối đa 45 ký tự
    return `MOMO_${orderId.toString().slice(-40)}`;
  }
}

// Export một instance duy nhất của MoMoService (Singleton pattern)
// Đảm bảo chỉ có một instance được tạo và sử dụng trong toàn bộ ứng dụng
module.exports = new MoMoService();

