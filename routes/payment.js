const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Voucher = require("../models/Voucher");
const Notification = require("../models/Notification");
const zalopayService = require("../services/zalopayService");
const momoService = require("../services/momoService");
const vnpayService = require("../services/vnpayService");
const { verifyToken, requireCustomer } = require("../middleware/authMiddleware");

/**
 * POST /api/payment/zalopay/create
 * Tạo đơn hàng và gọi ZaloPay API để tạo payment order
 * Bước 2 trong flow: Merchant gửi yêu cầu tạo đơn thanh toán sang ZaloPay
 */
router.post("/zalopay/create", verifyToken, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { shippingAddress, addressId, notes, voucherCode, orderId, items } = req.body;
    console.log("📥 ZaloPay create request received at:", new Date().toISOString());

    let order;

    // Nếu có orderId, lấy đơn hàng đã tạo (cho trường hợp tạo order trước)
    if (orderId) {
      order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Không tìm thấy đơn hàng!" });
      }
      if (order.customer.toString() !== req.user.userId) {
        return res.status(403).json({ message: "Không có quyền truy cập đơn hàng này!" });
      }
      if (order.paymentMethod !== "zalopay") {
        return res.status(400).json({ message: "Đơn hàng không phải thanh toán ZaloPay!" });
      }
    } else {
      // Tạo đơn hàng mới từ giỏ hàng
      // Lấy địa chỉ giao hàng
      let finalShippingAddress = null;
      
      if (addressId) {
        console.log('📍 ZaloPay: Lấy địa chỉ từ ID:', addressId);
        const Address = require('../models/Address');
        const address = await Address.findOne({ _id: addressId, user: req.user.userId });
        if (!address) {
          return res.status(400).json({ message: "Không tìm thấy địa chỉ hoặc địa chỉ không thuộc về bạn!" });
        }
        finalShippingAddress = {
          fullName: address.fullName,
          phone: address.phone,
          address: address.address,
          ward: address.ward || "",
          district: address.district || "",
          city: address.city || ""
        };
      } else if (shippingAddress) {
        // Normalize và validate địa chỉ từ geolocation
        const addressHelper = require('../utils/addressHelper');
        const addressValidation = addressHelper.normalizeShippingAddress(shippingAddress);
        
        if (!addressValidation || !addressValidation.isValid) {
          console.error('❌ ZaloPay: Địa chỉ không hợp lệ:', {
            original: shippingAddress,
            errors: addressValidation?.errors || ['Địa chỉ không hợp lệ']
          });
          return res.status(400).json({ 
            message: "Địa chỉ không hợp lệ!",
            errors: addressValidation?.errors || ['Vui lòng kiểm tra lại thông tin địa chỉ'],
            details: addressValidation?.errors
          });
        }
        
        finalShippingAddress = addressValidation.normalized;
        console.log('✅ ZaloPay: Địa chỉ đã được normalize:', finalShippingAddress);
      } else {
        return res.status(400).json({ message: "Vui lòng cung cấp địa chỉ giao hàng! (addressId hoặc shippingAddress object)" });
      }

      // Lấy giỏ hàng
      let cartItems = [];
      let cart = null;

      if (items && items.length > 0) {
        // Nếu có items trong request body (từ mobile app)
        console.log("📦 Using items from request body:", items.length, "items");
        cartItems = items;
        
        // Populate product info cho từng item
        for (const item of cartItems) {
          const product = await Product.findById(item.product);
          if (!product) {
            return res.status(400).json({ message: `Sản phẩm ${item.product} không tồn tại!` });
          }
          // Gán product object để dùng sau
          item.product = product;
        }
      } else {
        // Nếu không có items trong request, lấy từ database (web app)
        console.log("📦 Loading cart from database");
        cart = await Cart.findOne({ user: req.user.userId }).populate("items.product");
        if (!cart || cart.items.length === 0) {
          return res.status(400).json({ message: "Giỏ hàng trống!" });
        }
        cartItems = cart.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          color: item.color || "",
          size: item.size || "",
          price: item.product.salePrice || item.product.price
        }));
      }

      // Kiểm tra tồn kho và tính toán
      let subtotal = 0;
      const orderItems = [];
      const productIds = [];

      for (const item of cartItems) {
        const product = item.product;
        const quantity = item.quantity;
        const price = item.price || (product.salePrice || product.price);
        
        // ✅ KIỂM TRA PRODUCT CÓ TỒN TẠI KHÔNG
        if (!product || !product._id) {
          return res.status(400).json({ message: `Sản phẩm không hợp lệ!` });
        }

        if (product.status === 0) {
          return res.status(400).json({ message: `Sản phẩm ${product.name} đã bị ẩn!` });
        }

        if (product.stock < quantity) {
          return res.status(400).json({ 
            message: `Sản phẩm ${product.name} chỉ còn ${product.stock} sản phẩm trong kho!` 
          });
        }

        const itemSubtotal = price * quantity;

        orderItems.push({
          product: product._id,
          quantity: quantity,
          color: item.color || "",
          size: item.size || "",
          price,
          discount: 0,
          subtotal: itemSubtotal,
        });

        subtotal += itemSubtotal;
        productIds.push(product._id);
      }

      // Tính phí vận chuyển
      const shippingFee = 30000; // Mặc định 30k

      // Xử lý voucher nếu có
      let voucher = null;
      let voucherDiscount = 0;
      let voucherCodeUsed = null;

      if (voucherCode) {
        voucher = await Voucher.findOne({ code: voucherCode.toUpperCase() })
          .populate("applicableProducts", "name category")
          .populate("applicableCategories", "name");

        if (!voucher) {
          return res.status(400).json({ message: "Mã voucher không tồn tại!" });
        }

        // Kiểm tra voucher hợp lệ
        const now = new Date();
        if (voucher.status === 0) {
          return res.status(400).json({ message: "Voucher đã bị vô hiệu hóa!" });
        }
        if (voucher.usedCount >= voucher.quantity) {
          return res.status(400).json({ message: "Voucher đã hết lượt sử dụng!" });
        }
        if (now < voucher.startDate || now > voucher.endDate) {
          return res.status(400).json({ message: "Voucher không còn hiệu lực!" });
        }
        if (subtotal < voucher.minOrderValue) {
          return res.status(400).json({ 
            message: `Đơn hàng tối thiểu ${voucher.minOrderValue.toLocaleString()} VNĐ để sử dụng voucher này!` 
          });
        }

        // Kiểm tra user được áp dụng
        if (voucher.applicableUsers.length > 0) {
          const isApplicable = voucher.applicableUsers.some(
            id => id.toString() === req.user.userId.toString()
          );
          if (!isApplicable) {
            return res.status(400).json({ message: "Bạn không được sử dụng voucher này!" });
          }
        }

        // Kiểm tra sản phẩm áp dụng
        if (voucher.applicableProducts.length > 0) {
          const applicable = productIds.some(productId => 
            voucher.applicableProducts.some(p => p._id.toString() === productId.toString())
          );
          if (!applicable) {
            return res.status(400).json({ message: "Voucher không áp dụng cho sản phẩm trong giỏ hàng!" });
          }
        }

        // Tính toán giảm giá
        if (voucher.type === "percentage") {
          voucherDiscount = (subtotal * voucher.value) / 100;
          if (voucher.maxDiscount && voucherDiscount > voucher.maxDiscount) {
            voucherDiscount = voucher.maxDiscount;
          }
        } else {
          voucherDiscount = voucher.value;
        }

        voucherCodeUsed = voucher.code;
      }

      // Tính tổng tiền cuối cùng
      const total = subtotal + shippingFee - voucherDiscount;

      // ✅ TẠO ORDER NUMBER
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const orderNumber = `ORD-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;

      // Tạo đơn hàng với paymentMethod = "zalopay" và paymentStatus = "pending"
      order = new Order({
        orderNumber: orderNumber, // ✅ THÊM DÒNG NÀY
        customer: req.user.userId,
        shippingAddress: finalShippingAddress,
        items: orderItems,
        subtotal,
        shippingFee,
        discount: 0,
        voucher: voucher ? voucher._id : null,
        voucherCode: voucherCodeUsed,
        voucherDiscount,
        total: total > 0 ? total : 0,
        paymentMethod: "zalopay",
        paymentStatus: "pending",
        status: "new",
        notes: notes || "",
        timeline: [{
          status: "new",
          message: "Đơn hàng đã được tạo, chờ thanh toán ZaloPay",
          updatedBy: req.user.userId,
        }],
      });

      await order.save();

      // Tăng số lần sử dụng voucher (nhưng chưa trừ tồn kho vì chưa thanh toán)
      if (voucher) {
        voucher.usedCount += 1;
        await voucher.save();
      }
    }

    // Tạo app_trans_id cho ZaloPay
    const appTransId = zalopayService.generateAppTransId(order._id);

    // Chuẩn bị thông tin items cho ZaloPay (JSON string)
    const zalopayItems = order.items.map((item, index) => ({
      itemid: `item_${index + 1}`,
      itemname: `Sản phẩm ${index + 1}`,
      itemprice: item.price,
      itemquantity: item.quantity,
    }));
    const itemString = JSON.stringify(zalopayItems);

    // Embed data (có thể chứa orderId để xử lý callback)
    const embedData = {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
    };

    // Validate total amount trước khi gọi ZaloPay
    const totalAmount = Math.round(order.total); // Làm tròn về số nguyên
    if (!totalAmount || totalAmount <= 0) {
      console.error("❌ Invalid order total:", {
        orderId: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        totalAmount
      });
      return res.status(400).json({
        message: "Số tiền đơn hàng không hợp lệ!",
        error: `Tổng tiền phải lớn hơn 0 (hiện tại: ${order.total})`,
      });
    }

    // Gọi ZaloPay API để tạo payment order
    const zalopayStartTime = Date.now();
    console.log("📤 Creating ZaloPay order:", {
      appTransId,
      amount: totalAmount,
      originalTotal: order.total,
      orderNumber: order.orderNumber,
      itemCount: zalopayItems.length,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      voucherDiscount: order.voucherDiscount,
      elapsedTime: Date.now() - startTime
    });
    
    const zalopayResult = await zalopayService.createOrder({
      app_trans_id: appTransId,
      amount: totalAmount, // Sử dụng số nguyên đã validate
      description: `Thanh toán đơn hàng ${order.orderNumber}`,
      item: itemString,
      embed_data: JSON.stringify(embedData),
    });

    const zalopayElapsed = Date.now() - zalopayStartTime;
    console.log("📥 ZaloPay create order response:", {
      ...zalopayResult,
      zalopayApiTime: `${zalopayElapsed}ms`,
      totalElapsed: `${Date.now() - startTime}ms`
    });

    if (!zalopayResult.success) {
      console.error("❌ ZaloPay create order failed:", zalopayResult);
      
      // Xóa order nếu tạo ZaloPay payment thất bại
      if (order && order._id) {
        try {
          await Order.findByIdAndDelete(order._id);
          console.log("🗑️ Đã xóa order do ZaloPay tạo thất bại:", order._id);
          
          // Hoàn lại voucher nếu đã tăng usedCount
          if (order.voucher) {
            const Voucher = require("../models/Voucher");
            const voucher = await Voucher.findById(order.voucher);
            if (voucher && voucher.usedCount > 0) {
              voucher.usedCount -= 1;
              await voucher.save();
              console.log("↩️ Đã hoàn lại voucher usage");
            }
          }
        } catch (deleteError) {
          console.error("❌ Lỗi khi xóa order:", deleteError);
        }
      }
      
      return res.status(400).json({
        success: false,
        message: "Không thể tạo đơn hàng thanh toán ZaloPay!",
        error: zalopayResult.return_message,
        return_code: zalopayResult.return_code,
        sub_return_code: zalopayResult.sub_return_code,
        // Thêm thông tin debug (chỉ trong development)
        ...(process.env.NODE_ENV !== 'production' && {
          debug: {
            app_trans_id: appTransId,
            amount: totalAmount,
            orderId: order?._id
          }
        })
      });
    }

    // Lưu thông tin ZaloPay vào order
    order.zalopayTransToken = zalopayResult.zp_trans_token;
    order.zalopayOrderId = appTransId;
    order.paymentStatus = "processing";
    await order.save();

    // Cập nhật timeline
    if (!order.timeline) {
      order.timeline = [];
    }
    order.timeline.push({
      status: "new",
      message: "Đã tạo yêu cầu thanh toán ZaloPay",
      updatedBy: req.user.userId,
    });
    await order.save();

    // Trả về zp_trans_token để client SDK sử dụng
    const totalElapsed = Date.now() - startTime;
    console.log("✅ ZaloPay order created successfully in", `${totalElapsed}ms`);
    
    res.json({
      success: true,
      message: "Tạo đơn hàng thanh toán ZaloPay thành công!",
      zp_trans_token: zalopayResult.zp_trans_token,
      order_url: zalopayResult.order_url,
      order_token: zalopayResult.order_token,
      orderId: order._id,
      orderNumber: order.orderNumber,
    });
  } catch (error) {
    console.error("Create ZaloPay payment error:", error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
});

/**
 * POST /api/payment/zalopay/callback
 * Webhook callback từ ZaloPay khi thanh toán hoàn tất
 * Bước 4 trong flow: ZaloPay trả về kết quả giao dịch
 */
router.post("/zalopay/callback", async (req, res) => {
  try {
    console.log("📥 ZaloPay callback received:", JSON.stringify(req.body, null, 2));
    
    // ZaloPay gửi callback với format: { data: {...}, mac: "..." }
    // Hoặc có thể là: { data: "string", mac: "..." } hoặc trực tiếp { ... }
    let data, mac;
    
    if (req.body.data && typeof req.body.data === 'string') {
      // Nếu data là string, parse nó
      try {
        data = JSON.parse(req.body.data);
      } catch (e) {
        data = req.body.data;
      }
    } else if (req.body.data && typeof req.body.data === 'object') {
      data = req.body.data;
    } else {
      // Nếu không có data wrapper, có thể data đã ở root level
      data = req.body;
    }
    
    mac = req.body.mac || data.mac;

    if (!data || !mac) {
      console.error("❌ ZaloPay callback: Missing data or mac", { body: req.body });
      return res.status(400).json({ return_code: -1, return_message: "Thiếu dữ liệu!" });
    }

    // Loại bỏ mac khỏi data trước khi verify (nếu có)
    const dataForVerify = { ...data };
    if (dataForVerify.mac) {
      delete dataForVerify.mac;
    }

    // Xác thực MAC
    const isValid = zalopayService.verifyCallback({ data: dataForVerify, mac });
    if (!isValid) {
      console.error("❌ ZaloPay callback MAC invalid:", { 
        dataKeys: Object.keys(dataForVerify), 
        mac,
        hasKey2: !!zalopayService.key2,
        calculatedMac: zalopayService.createMac(dataForVerify, zalopayService.key2)
      });
      return res.status(400).json({ return_code: -1, return_message: "MAC không hợp lệ!" });
    }

    console.log("✅ ZaloPay callback MAC verified");

    // Parse embed_data để lấy orderId
    let orderId = null;
    try {
      let embedDataStr = data.embed_data;
      
      // Xử lý các trường hợp embed_data
      if (!embedDataStr) {
        console.log("⚠️ embed_data is empty");
      } else if (typeof embedDataStr === 'object') {
        // Nếu đã là object, dùng trực tiếp
        orderId = embedDataStr.orderId;
        console.log("📦 OrderId from embed_data (object):", orderId);
      } else if (typeof embedDataStr === 'string') {
        // Nếu là string, thử parse
        try {
          const embedData = JSON.parse(embedDataStr);
      orderId = embedData.orderId;
          console.log("📦 OrderId from embed_data (parsed):", orderId);
        } catch (parseError) {
          console.error("⚠️ Failed to parse embed_data string:", parseError);
          // Thử tìm orderId trực tiếp trong string
          const orderIdMatch = embedDataStr.match(/"orderId"\s*:\s*"([^"]+)"/);
          if (orderIdMatch) {
            orderId = orderIdMatch[1];
            console.log("📦 OrderId extracted from string:", orderId);
          }
        }
      }
    } catch (e) {
      console.error("⚠️ Parse embed_data error:", e);
    }

    // Nếu không có orderId trong embed_data, thử tìm theo zalopayOrderId
    if (!orderId && data.app_trans_id) {
      console.log("🔍 Searching order by zalopayOrderId:", data.app_trans_id);
      // Tìm order theo zalopayOrderId (app_trans_id)
      const order = await Order.findOne({ zalopayOrderId: data.app_trans_id });
      if (order) {
        orderId = order._id.toString();
        console.log("✅ Found order by zalopayOrderId:", orderId);
      } else {
        // Thử parse từ app_trans_id format: YYMMDD_orderId
        const parts = data.app_trans_id.split("_");
        if (parts.length > 1) {
          // Tìm order theo _id (phần sau dấu _)
          const possibleOrderId = parts.slice(1).join("_");
          const orderById = await Order.findById(possibleOrderId);
          if (orderById) {
            orderId = orderById._id.toString();
            console.log("✅ Found order by parsed ID:", orderId);
          }
        }
      }
    }

    if (!orderId) {
      console.error("❌ Cannot find orderId from callback:", {
        app_trans_id: data.app_trans_id,
        embed_data: data.embed_data,
        fullData: data
      });
      return res.status(400).json({ return_code: -1, return_message: "Không tìm thấy đơn hàng!" });
    }

    // Tìm đơn hàng
    const order = await Order.findById(orderId);
    if (!order) {
      console.error("❌ Order not found:", orderId);
      return res.status(404).json({ return_code: -1, return_message: "Không tìm thấy đơn hàng!" });
    }

    console.log("✅ Order found:", {
      orderId: order._id,
      orderNumber: order.orderNumber,
      currentPaymentStatus: order.paymentStatus,
      callbackStatus: data.status
    });

    // Kiểm tra nếu đã xử lý callback này rồi (idempotency)
    if (order.paymentStatus === "success" && order.status !== "new") {
      console.log("ℹ️ Callback already processed, returning OK");
      return res.json({ return_code: 1, return_message: "OK" });
    }

    // Xử lý kết quả thanh toán
    if (data.status === 1) {
      console.log("✅ Payment successful, processing...");
      // Thanh toán thành công
      order.paymentStatus = "success";
      order.zalopayMac = mac;
      
      // Cập nhật timeline
      if (!order.timeline) {
        order.timeline = [];
      }
      order.timeline.push({
        status: "processing",
        message: "Thanh toán ZaloPay thành công",
        updatedBy: order.customer,
      });
      await order.save();

      // Trừ tồn kho
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product && product.stock >= item.quantity) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: -item.quantity },
          });
        }
      }

      // Tạo thông báo
      await Notification.create({
        user: order.customer,
        type: "order",
        title: "Thanh toán thành công",
        message: `Đơn hàng ${order.orderNumber} đã được thanh toán thành công qua ZaloPay!`,
        link: `/orders/${order._id}`,
      });

      // Xóa giỏ hàng nếu có
      const cart = await Cart.findOne({ user: order.customer });
      if (cart) {
        cart.items = [];
        await cart.save();
      }
      
      console.log("✅ Payment processing completed successfully");
    } else {
      // Thanh toán thất bại
      console.log("❌ Payment failed:", data.return_message || "Unknown error");
      order.paymentStatus = "failed";
      
      if (!order.timeline) {
        order.timeline = [];
      }
      order.timeline.push({
        status: "new",
        message: `Thanh toán ZaloPay thất bại: ${data.return_message || "Lỗi không xác định"}`,
        updatedBy: order.customer,
      });
      await order.save();

      // Hoàn lại voucher đã sử dụng
      if (order.voucher) {
        const voucher = await Voucher.findById(order.voucher);
        if (voucher) {
          voucher.usedCount = Math.max(0, voucher.usedCount - 1);
          await voucher.save();
        }
      }
    }

    // Trả về success cho ZaloPay
    res.json({ return_code: 1, return_message: "OK" });
  } catch (error) {
    console.error("ZaloPay callback error:", error);
    res.status(500).json({ return_code: -1, return_message: "Lỗi server!" });
  }
});

/**
 * GET /api/payment/zalopay/status/:orderId
 * Kiểm tra trạng thái thanh toán của đơn hàng
 */
router.get("/zalopay/status/:orderId", verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng!" });
    }

    // Customer chỉ xem đơn hàng của mình
    if (req.user.role === "customer" && order.customer.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Không có quyền xem đơn hàng này!" });
    }

    // Nếu có zalopayOrderId, query từ ZaloPay để lấy trạng thái mới nhất
    if (order.zalopayOrderId && order.paymentStatus === "processing") {
      const queryResult = await zalopayService.queryOrder(order.zalopayOrderId);
      if (queryResult.success && queryResult.data) {
        // Cập nhật payment status nếu có thay đổi
        if (queryResult.data.return_code === 1 && queryResult.data.status === 1) {
          if (order.paymentStatus !== "success") {
            order.paymentStatus = "success";
            await order.save();
          }
        }
      }
    }

    res.json({
      orderId: order._id,
      orderNumber: order.orderNumber,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status,
      total: order.total,
      zalopayTransToken: order.zalopayTransToken,
    });
  } catch (error) {
    console.error("Check ZaloPay payment status error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

/**
 * POST /api/payment/momo/create
 * Tạo đơn hàng và gọi MoMo API để tạo payment order
 */
router.post("/momo/create", verifyToken, requireCustomer, async (req, res) => {
  try {
    const { shippingAddress, addressId, notes, voucherCode, orderId, items } = req.body;

    let order;
    let cart = null;

    // Nếu có orderId, lấy đơn hàng đã tạo (cho trường hợp tạo order trước)
    if (orderId) {
      order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Không tìm thấy đơn hàng!" });
      }
      if (order.customer.toString() !== req.user.userId) {
        return res.status(403).json({ message: "Không có quyền truy cập đơn hàng này!" });
      }
      if (order.paymentMethod !== "momo") {
        return res.status(400).json({ message: "Đơn hàng không phải thanh toán MoMo!" });
      }
    } else {
      // Tạo đơn hàng mới từ giỏ hàng
      // Lấy địa chỉ giao hàng
      let finalShippingAddress = null;
      
      if (addressId) {
        console.log('📍 MoMo: Lấy địa chỉ từ ID:', addressId);
        const Address = require('../models/Address');
        const address = await Address.findOne({ _id: addressId, user: req.user.userId });
        if (!address) {
          return res.status(400).json({ message: "Không tìm thấy địa chỉ hoặc địa chỉ không thuộc về bạn!" });
        }
        finalShippingAddress = {
          fullName: address.fullName,
          phone: address.phone,
          address: address.address,
          ward: address.ward || "",
          district: address.district || "",
          city: address.city || ""
        };
      } else if (shippingAddress) {
        // Normalize và validate địa chỉ từ geolocation
        const addressHelper = require('../utils/addressHelper');
        const addressValidation = addressHelper.normalizeShippingAddress(shippingAddress);
        
        if (!addressValidation || !addressValidation.isValid) {
          console.error('❌ MoMo: Địa chỉ không hợp lệ:', {
            original: shippingAddress,
            errors: addressValidation?.errors || ['Địa chỉ không hợp lệ']
          });
          return res.status(400).json({ 
            message: "Địa chỉ không hợp lệ!",
            errors: addressValidation?.errors || ['Vui lòng kiểm tra lại thông tin địa chỉ'],
            details: addressValidation?.errors
          });
        }
        
        finalShippingAddress = addressValidation.normalized;
        console.log('✅ MoMo: Địa chỉ đã được normalize:', finalShippingAddress);
      } else {
        return res.status(400).json({ message: "Vui lòng cung cấp địa chỉ giao hàng! (addressId hoặc shippingAddress object)" });
      }

      // Lấy giỏ hàng
      let cartItems = [];

      if (items && items.length > 0) {
        // Nếu có items trong request body (từ mobile app)
        console.log("📦 Using items from request body:", items.length, "items");
        cartItems = items;
        
        // ✅ Populate product info cho từng item
        for (const item of cartItems) {
          const product = await Product.findById(item.product);
          if (!product) {
            return res.status(400).json({ message: `Sản phẩm ${item.product} không tồn tại!` });
          }
          // Gán product object để dùng sau
          item.product = product;
        }
      } else {
        // Nếu không có items trong request, lấy từ database (web app)
        console.log("📦 Loading cart from database");
        cart = await Cart.findOne({ user: req.user.userId }).populate("items.product");
        if (!cart || cart.items.length === 0) {
          return res.status(400).json({ message: "Giỏ hàng trống!" });
        }
        cartItems = cart.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          color: item.color || "",
          size: item.size || "",
          price: item.product.salePrice || item.product.price
        }));
      }

      // Kiểm tra tồn kho và tính toán
      let subtotal = 0;
      const orderItems = [];
      const productIds = [];

      for (const item of cartItems) {
        const product = item.product;
        const quantity = item.quantity;
        const price = item.price || (product.salePrice || product.price);
        
        // ✅ KIỂM TRA PRODUCT CÓ TỒN TẠI KHÔNG
        if (!product || !product._id) {
          return res.status(400).json({ message: `Sản phẩm không hợp lệ!` });
        }

        if (product.status === 0) {
          return res.status(400).json({ message: `Sản phẩm ${product.name} đã bị ẩn!` });
        }

        if (product.stock < quantity) {
          return res.status(400).json({ 
            message: `Sản phẩm ${product.name} chỉ còn ${product.stock} sản phẩm trong kho!` 
          });
        }

        const itemSubtotal = price * quantity;

        // ✅ ĐẢM BẢO product._id KHÔNG NULL
        orderItems.push({
          product: product._id, // ObjectId, không phải null
          quantity: quantity,
          color: item.color || "",
          size: item.size || "",
          price,
          discount: 0,
          subtotal: itemSubtotal,
        });

        subtotal += itemSubtotal;
        productIds.push(product._id);
      }

      // Tính phí vận chuyển
      const shippingFee = 30000; // Mặc định 30k

      // Xử lý voucher nếu có
      let voucher = null;
      let voucherDiscount = 0;
      let voucherCodeUsed = null;

      if (voucherCode) {
        voucher = await Voucher.findOne({ code: voucherCode.toUpperCase() })
          .populate("applicableProducts", "name category")
          .populate("applicableCategories", "name");

        if (!voucher) {
          return res.status(400).json({ message: "Mã voucher không tồn tại!" });
        }

        // Kiểm tra voucher hợp lệ
        const now = new Date();
        if (voucher.status === 0) {
          return res.status(400).json({ message: "Voucher đã bị vô hiệu hóa!" });
        }
        if (voucher.usedCount >= voucher.quantity) {
          return res.status(400).json({ message: "Voucher đã hết lượt sử dụng!" });
        }
        if (now < voucher.startDate || now > voucher.endDate) {
          return res.status(400).json({ message: "Voucher không còn hiệu lực!" });
        }
        if (subtotal < voucher.minOrderValue) {
          return res.status(400).json({ 
            message: `Đơn hàng tối thiểu ${voucher.minOrderValue.toLocaleString()} VNĐ để sử dụng voucher này!` 
          });
        }

        // Kiểm tra user được áp dụng
        if (voucher.applicableUsers.length > 0) {
          const isApplicable = voucher.applicableUsers.some(
            id => id.toString() === req.user.userId.toString()
          );
          if (!isApplicable) {
            return res.status(400).json({ message: "Bạn không được sử dụng voucher này!" });
          }
        }

        // Kiểm tra sản phẩm áp dụng
        if (voucher.applicableProducts.length > 0) {
          const applicable = productIds.some(productId => 
            voucher.applicableProducts.some(p => p._id.toString() === productId.toString())
          );
          if (!applicable) {
            return res.status(400).json({ message: "Voucher không áp dụng cho sản phẩm trong giỏ hàng!" });
          }
        }

        // Tính toán giảm giá
        if (voucher.type === "percentage") {
          voucherDiscount = (subtotal * voucher.value) / 100;
          if (voucher.maxDiscount && voucherDiscount > voucher.maxDiscount) {
            voucherDiscount = voucher.maxDiscount;
          }
        } else {
          voucherDiscount = voucher.value;
        }

        voucherCodeUsed = voucher.code;
      }

      // Tính tổng tiền cuối cùng
      const total = subtotal + shippingFee - voucherDiscount;

      // ✅ TẠO ORDER NUMBER
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const orderNumber = `ORD-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;

      // Tạo đơn hàng với paymentMethod = "momo" và paymentStatus = "pending"
      order = new Order({
        orderNumber: orderNumber, // ✅ THÊM DÒNG NÀY
        customer: req.user.userId,
        shippingAddress: finalShippingAddress,
        items: orderItems, // ✅ Đảm bảo mỗi item có product là ObjectId
        subtotal,
        shippingFee,
        discount: 0,
        voucher: voucher ? voucher._id : null,
        voucherCode: voucherCodeUsed,
        voucherDiscount,
        total: total > 0 ? total : 0,
        paymentMethod: "momo",
        paymentStatus: "pending",
        status: "new",
        notes: notes || "",
        timeline: [{
          status: "new",
          message: "Đơn hàng đã được tạo, chờ thanh toán MoMo",
          updatedBy: req.user.userId,
        }],
      });

      await order.save();

      // Tăng số lần sử dụng voucher (nhưng chưa trừ tồn kho vì chưa thanh toán)
      if (voucher) {
        voucher.usedCount += 1;
        await voucher.save();
      }
    }

    // Tạo orderId cho MoMo
    const momoOrderId = momoService.generateOrderId(order._id);

    // Chuẩn bị thông tin items cho MoMo (JSON string trong extraData)
    const extraData = {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      items: order.items.map((item, index) => ({
        id: index + 1,
        name: `Sản phẩm ${index + 1}`,
        price: item.price,
        quantity: item.quantity,
      })),
    };

    // Gọi MoMo API để tạo payment order
    const momoResult = await momoService.createOrder({
      orderId: momoOrderId,
      amount: order.total,
      orderInfo: `Thanh toán đơn hàng ${order.orderNumber}`,
      extraData: JSON.stringify(extraData),
    });

    if (!momoResult.success) {
      return res.status(400).json({
        message: "Không thể tạo đơn hàng thanh toán MoMo!",
        error: momoResult.message,
      });
    }

    // Lưu thông tin MoMo vào order
    order.momoOrderId = momoOrderId;
    order.momoRequestId = momoResult.requestId;
    order.paymentStatus = "processing";
    await order.save();

    // Cập nhật timeline
    if (!order.timeline) {
      order.timeline = [];
    }
    order.timeline.push({
      status: "new",
      message: "Đã tạo yêu cầu thanh toán MoMo",
      updatedBy: req.user.userId,
    });
    await order.save();

    // Trả về payUrl để client redirect
    res.json({
      success: true,
      message: "Tạo đơn hàng thanh toán MoMo thành công!",
      payUrl: momoResult.payUrl,
      deeplink: momoResult.deeplink,
      qrCodeUrl: momoResult.qrCodeUrl,
      orderId: order._id,
      orderNumber: order.orderNumber,
      momoOrderId: momoOrderId,
    });
  } catch (error) {
    console.error("Create MoMo payment error:", error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
});

/**
 * POST /api/payment/momo/callback
 * Webhook callback từ MoMo khi thanh toán hoàn tất
 */
router.post("/momo/callback", async (req, res) => {
  try {
    const callbackData = req.body;

    if (!callbackData || !callbackData.signature) {
      return res.status(400).json({ 
        resultCode: -1, 
        message: "Thiếu dữ liệu!" 
      });
    }

    // Xác thực signature
    const isValid = momoService.verifyCallback(callbackData);
    if (!isValid) {
      console.error("MoMo callback signature invalid:", callbackData);
      return res.status(400).json({ 
        resultCode: -1, 
        message: "Signature không hợp lệ!" 
      });
    }

    // Parse extraData để lấy orderId
    let orderId = null;
    try {
      const extraData = JSON.parse(callbackData.extraData || "{}");
      orderId = extraData.orderId;
    } catch (e) {
      console.error("Parse extraData error:", e);
    }

    // Nếu không có orderId trong extraData, thử tìm theo momoOrderId
    if (!orderId && callbackData.orderId) {
      const order = await Order.findOne({ momoOrderId: callbackData.orderId });
      if (order) {
        orderId = order._id.toString();
      }
    }

    if (!orderId) {
      console.error("Cannot find orderId from callback:", callbackData);
      return res.status(400).json({ 
        resultCode: -1, 
        message: "Không tìm thấy đơn hàng!" 
      });
    }

    // Tìm đơn hàng
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ 
        resultCode: -1, 
        message: "Không tìm thấy đơn hàng!" 
      });
    }

    // Kiểm tra nếu đã xử lý callback này rồi (idempotency)
    if (order.paymentStatus === "success" && order.status !== "new") {
      return res.json({ resultCode: 0, message: "OK" });
    }

    // Xử lý kết quả thanh toán
    if (callbackData.resultCode === 0) {
      // Thanh toán thành công
      order.paymentStatus = "success";
      order.momoTransId = callbackData.transId;
      order.momoSignature = callbackData.signature;
      
      // Cập nhật timeline
      if (!order.timeline) {
        order.timeline = [];
      }
      order.timeline.push({
        status: "processing",
        message: "Thanh toán MoMo thành công",
        updatedBy: order.customer,
      });
      await order.save();

      // Trừ tồn kho
      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product && product.stock >= item.quantity) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: -item.quantity },
          });
        }
      }

      // Tạo thông báo
      await Notification.create({
        user: order.customer,
        type: "order",
        title: "Thanh toán thành công",
        message: `Đơn hàng ${order.orderNumber} đã được thanh toán thành công qua MoMo!`,
        link: `/orders/${order._id}`,
      });

      // Xóa giỏ hàng nếu có
      const cart = await Cart.findOne({ user: order.customer });
      if (cart) {
        cart.items = [];
        await cart.save();
      }
    } else {
      // Thanh toán thất bại
      order.paymentStatus = "failed";
      
      if (!order.timeline) {
        order.timeline = [];
      }
      order.timeline.push({
        status: "new",
        message: `Thanh toán MoMo thất bại: ${callbackData.message || "Lỗi không xác định"}`,
        updatedBy: order.customer,
      });
      await order.save();

      // Hoàn lại voucher đã sử dụng
      if (order.voucher) {
        const voucher = await Voucher.findById(order.voucher);
        if (voucher) {
          voucher.usedCount = Math.max(0, voucher.usedCount - 1);
          await voucher.save();
        }
      }
    }

    // Trả về success cho MoMo
    res.json({ resultCode: 0, message: "OK" });
  } catch (error) {
    console.error("MoMo callback error:", error);
    res.status(500).json({ resultCode: -1, message: "Lỗi server!" });
  }
});

/**
 * GET /api/payment/momo/return
 * Return URL sau khi thanh toán (redirect từ MoMo)
 */
router.get("/momo/return", async (req, res) => {
  try {
    const { orderId, resultCode, message } = req.query;

    if (!orderId) {
      return res.redirect("/?payment=error&message=Thiếu thông tin đơn hàng");
    }

    // Tìm đơn hàng
    const order = await Order.findOne({ momoOrderId: orderId });
    if (!order) {
      return res.redirect("/?payment=error&message=Không tìm thấy đơn hàng");
    }

    if (resultCode === "0") {
      // Thanh toán thành công - query lại từ MoMo để đảm bảo
      const queryResult = await momoService.queryOrder(orderId);
      if (queryResult.success && queryResult.data?.resultCode === 0) {
        return res.redirect(`/?payment=success&orderId=${order._id}`);
      }
    }

    return res.redirect(`/?payment=failed&orderId=${order._id}&message=${encodeURIComponent(message || "Thanh toán thất bại")}`);
  } catch (error) {
    console.error("MoMo return error:", error);
    return res.redirect("/?payment=error&message=Lỗi xử lý");
  }
});

/**
 * GET /api/payment/momo/status/:orderId
 * Kiểm tra trạng thái thanh toán của đơn hàng
 */
router.get("/momo/status/:orderId", verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng!" });
    }

    // Customer chỉ xem đơn hàng của mình
    if (req.user.role === "customer" && order.customer.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Không có quyền xem đơn hàng này!" });
    }

    // Nếu có momoOrderId, query từ MoMo để lấy trạng thái mới nhất
    if (order.momoOrderId && order.paymentStatus === "processing") {
      const queryResult = await momoService.queryOrder(order.momoOrderId);
      if (queryResult.success && queryResult.data) {
        // Cập nhật payment status nếu có thay đổi
        if (queryResult.data.resultCode === 0 && queryResult.data.amount === order.total) {
          if (order.paymentStatus !== "success") {
            order.paymentStatus = "success";
            order.momoTransId = queryResult.data.transId;
            await order.save();
          }
        }
      }
    }

    res.json({
      orderId: order._id,
      orderNumber: order.orderNumber,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status,
      total: order.total,
      momoOrderId: order.momoOrderId,
      momoTransId: order.momoTransId,
    });
  } catch (error) {
    console.error("Check MoMo payment status error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

/**
 * POST /api/payment/vnpay/create
 * Tạo đơn hàng và tạo payment URL VNPay
 */
router.post("/vnpay/create", verifyToken, requireCustomer, async (req, res) => {
  try {
    const { shippingAddress, addressId, notes, voucherCode, orderId, items } = req.body;

    let order;
    let cart = null;

    // Nếu có orderId, lấy đơn hàng đã tạo (cho trường hợp tạo order trước)
    if (orderId) {
      order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Không tìm thấy đơn hàng!" });
      }
      if (order.customer.toString() !== req.user.userId) {
        return res.status(403).json({ message: "Không có quyền truy cập đơn hàng này!" });
      }
      if (order.paymentMethod !== "vnpay") {
        return res.status(400).json({ message: "Đơn hàng không phải thanh toán VNPay!" });
      }
    } else {
      // Tạo đơn hàng mới từ giỏ hàng
      // Lấy địa chỉ giao hàng
      let finalShippingAddress = null;
      
      if (addressId) {
        console.log('📍 VNPay: Lấy địa chỉ từ ID:', addressId);
        const Address = require('../models/Address');
        const address = await Address.findOne({ _id: addressId, user: req.user.userId });
        if (!address) {
          return res.status(400).json({ message: "Không tìm thấy địa chỉ hoặc địa chỉ không thuộc về bạn!" });
        }
        finalShippingAddress = {
          fullName: address.fullName,
          phone: address.phone,
          address: address.address,
          ward: address.ward || "",
          district: address.district || "",
          city: address.city || ""
        };
      } else if (shippingAddress) {
        // Normalize và validate địa chỉ từ geolocation
        const addressHelper = require('../utils/addressHelper');
        const addressValidation = addressHelper.normalizeShippingAddress(shippingAddress);
        
        if (!addressValidation || !addressValidation.isValid) {
          console.error('❌ VNPay: Địa chỉ không hợp lệ:', {
            original: shippingAddress,
            errors: addressValidation?.errors || ['Địa chỉ không hợp lệ']
          });
          return res.status(400).json({ 
            message: "Địa chỉ không hợp lệ!",
            errors: addressValidation?.errors || ['Vui lòng kiểm tra lại thông tin địa chỉ'],
            details: addressValidation?.errors
          });
        }
        
        finalShippingAddress = addressValidation.normalized;
        console.log('✅ VNPay: Địa chỉ đã được normalize:', finalShippingAddress);
      } else {
        return res.status(400).json({ message: "Vui lòng cung cấp địa chỉ giao hàng! (addressId hoặc shippingAddress object)" });
      }

      // Lấy giỏ hàng
      let cartItems = [];

      if (items && items.length > 0) {
        console.log("📦 Using items from request body:", items.length, "items");
        cartItems = items;
        
        for (const item of cartItems) {
          const product = await Product.findById(item.product);
          if (!product) {
            return res.status(400).json({ message: `Sản phẩm ${item.product} không tồn tại!` });
          }
          item.product = product;
        }
      } else {
        console.log("📦 Loading cart from database");
        cart = await Cart.findOne({ user: req.user.userId }).populate("items.product");
        if (!cart || cart.items.length === 0) {
          return res.status(400).json({ message: "Giỏ hàng trống!" });
        }
        cartItems = cart.items.map(item => ({
          product: item.product,
          quantity: item.quantity,
          color: item.color || "",
          size: item.size || "",
          price: item.product.salePrice || item.product.price
        }));
      }

      // Kiểm tra tồn kho và tính toán
      let subtotal = 0;
      const orderItems = [];
      const productIds = [];

      for (const item of cartItems) {
        const product = item.product;
        const quantity = item.quantity;
        const price = item.price || (product.salePrice || product.price);
        
        if (!product || !product._id) {
          return res.status(400).json({ message: `Sản phẩm không hợp lệ!` });
        }

        if (product.status === 0) {
          return res.status(400).json({ message: `Sản phẩm ${product.name} đã bị ẩn!` });
        }

        if (product.stock < quantity) {
          return res.status(400).json({ 
            message: `Sản phẩm ${product.name} chỉ còn ${product.stock} sản phẩm trong kho!` 
          });
        }

        const itemSubtotal = price * quantity;

        orderItems.push({
          product: product._id,
          quantity: quantity,
          color: item.color || "",
          size: item.size || "",
          price,
          discount: 0,
          subtotal: itemSubtotal,
        });

        subtotal += itemSubtotal;
        productIds.push(product._id);
      }

      // Tính phí vận chuyển
      const shippingFee = 30000;

      // Xử lý voucher nếu có
      let voucher = null;
      let voucherDiscount = 0;
      let voucherCodeUsed = null;

      if (voucherCode) {
        voucher = await Voucher.findOne({ code: voucherCode.toUpperCase() })
          .populate("applicableProducts", "name category")
          .populate("applicableCategories", "name");

        if (!voucher) {
          return res.status(400).json({ message: "Mã voucher không tồn tại!" });
        }

        const now = new Date();
        if (voucher.status === 0) {
          return res.status(400).json({ message: "Voucher đã bị vô hiệu hóa!" });
        }
        if (voucher.usedCount >= voucher.quantity) {
          return res.status(400).json({ message: "Voucher đã hết lượt sử dụng!" });
        }
        if (now < voucher.startDate || now > voucher.endDate) {
          return res.status(400).json({ message: "Voucher không còn hiệu lực!" });
        }
        if (subtotal < voucher.minOrderValue) {
          return res.status(400).json({ 
            message: `Đơn hàng tối thiểu ${voucher.minOrderValue.toLocaleString()} VNĐ để sử dụng voucher này!` 
          });
        }

        if (voucher.applicableUsers.length > 0) {
          const isApplicable = voucher.applicableUsers.some(
            id => id.toString() === req.user.userId.toString()
          );
          if (!isApplicable) {
            return res.status(400).json({ message: "Bạn không được sử dụng voucher này!" });
          }
        }

        if (voucher.applicableProducts.length > 0) {
          const applicable = productIds.some(productId => 
            voucher.applicableProducts.some(p => p._id.toString() === productId.toString())
          );
          if (!applicable) {
            return res.status(400).json({ message: "Voucher không áp dụng cho sản phẩm trong giỏ hàng!" });
          }
        }

        if (voucher.type === "percentage") {
          voucherDiscount = (subtotal * voucher.value) / 100;
          if (voucher.maxDiscount && voucherDiscount > voucher.maxDiscount) {
            voucherDiscount = voucher.maxDiscount;
          }
        } else {
          voucherDiscount = voucher.value;
        }

        voucherCodeUsed = voucher.code;
      }

      // Tính tổng tiền cuối cùng
      const total = subtotal + shippingFee - voucherDiscount;

      // Tạo ORDER NUMBER
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const orderNumber = `ORD-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;

      // Tạo đơn hàng
      order = new Order({
        orderNumber: orderNumber,
        customer: req.user.userId,
        shippingAddress: finalShippingAddress,
        items: orderItems,
        subtotal,
        shippingFee,
        discount: 0,
        voucher: voucher ? voucher._id : null,
        voucherCode: voucherCodeUsed,
        voucherDiscount,
        total: total > 0 ? total : 0,
        paymentMethod: "vnpay",
        paymentStatus: "pending",
        status: "new",
        notes: notes || "",
        timeline: [{
          status: "new",
          message: "Đơn hàng đã được tạo, chờ thanh toán VNPay",
          updatedBy: req.user.userId,
        }],
      });

      await order.save();

      if (voucher) {
        voucher.usedCount += 1;
        await voucher.save();
      }
    }

    // Tạo vnp_TxnRef cho VNPay
    const vnp_TxnRef = vnpayService.generateTxnRef(order._id);

    // Extract IP address (có thể có IPv6 prefix)
    // Lấy IP từ nhiều nguồn, ưu tiên x-forwarded-for (khi có proxy/ngrok)
    let clientIp = req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || req.ip || req.connection.remoteAddress;
    
    // Nếu có x-forwarded-for, lấy IP đầu tiên (có thể có nhiều IP)
    if (clientIp && clientIp.includes(",")) {
      clientIp = clientIp.split(",")[0].trim();
    }
    
    // Nếu không có IP, dùng default
    if (!clientIp) {
      clientIp = "192.168.1.1"; // Dùng IP mặc định hợp lệ thay vì localhost
    }
    
    console.log("🌐 Client IP extracted:", {
      original: req.ip || req.connection.remoteAddress,
      xForwardedFor: req.headers["x-forwarded-for"],
      xRealIp: req.headers["x-real-ip"],
      final: clientIp
    });
    
    // Tạo payment URL
    const vnpayResult = vnpayService.createPaymentUrl({
      vnp_Amount: Math.round(order.total * 100), // VNPay yêu cầu số tiền tính bằng xu (x100)
      vnp_TxnRef: vnp_TxnRef,
      vnp_OrderInfo: `Thanh toán đơn hàng ${order.orderNumber}`,
      vnp_IpAddr: clientIp,
    });

    if (!vnpayResult.success) {
      if (order && order._id) {
        try {
          await Order.findByIdAndDelete(order._id);
          console.log("🗑️ Đã xóa order do VNPay tạo thất bại:", order._id);
          
          if (order.voucher) {
            const Voucher = require("../models/Voucher");
            const voucher = await Voucher.findById(order.voucher);
            if (voucher && voucher.usedCount > 0) {
              voucher.usedCount -= 1;
              await voucher.save();
              console.log("↩️ Đã hoàn lại voucher usage");
            }
          }
        } catch (deleteError) {
          console.error("❌ Lỗi khi xóa order:", deleteError);
        }
      }
      
      return res.status(400).json({
        success: false,
        message: "Không thể tạo đơn hàng thanh toán VNPay!",
        error: vnpayResult.message,
      });
    }

    // Lưu thông tin VNPay vào order
    order.vnpayTxnRef = vnp_TxnRef;
    order.paymentStatus = "processing";
    await order.save();

    if (!order.timeline) {
      order.timeline = [];
    }
    order.timeline.push({
      status: "new",
      message: "Đã tạo yêu cầu thanh toán VNPay",
      updatedBy: req.user.userId,
    });
    await order.save();

    res.json({
      success: true,
      message: "Tạo đơn hàng thanh toán VNPay thành công!",
      paymentUrl: vnpayResult.paymentUrl,
      orderId: order._id,
      orderNumber: order.orderNumber,
      vnp_TxnRef: vnp_TxnRef,
    });
  } catch (error) {
    console.error("Create VNPay payment error:", error);
    res.status(500).json({ message: "Lỗi server!", error: error.message });
  }
});

/**
 * VNPay IPN Callback Handler (dùng chung cho GET và POST)
 */
const handleVnpayCallback = async (req, res) => {
  try {
    // VNPay có thể gửi params qua query (GET) hoặc body (POST)
    const params = req.method === "POST" ? req.body : req.query;
    console.log("📥 VNPay IPN callback received:", {
      method: req.method,
      params: JSON.stringify(params, null, 2)
    });
    
    const isValid = vnpayService.verifyCallback(params);
    if (!isValid) {
      console.error("❌ VNPay callback signature invalid:", params);
      return res.status(400).json({ RspCode: "97", Message: "Checksum failed" });
    }

    const {
      vnp_TxnRef,
      vnp_Amount,
      vnp_ResponseCode,
      vnp_TransactionStatus,
      vnp_TransactionNo,
      vnp_SecureHash,
    } = params;

    const orderId = vnpayService.parseOrderIdFromTxnRef(vnp_TxnRef);
    if (!orderId) {
      console.error("❌ Cannot parse orderId from vnp_TxnRef:", vnp_TxnRef);
      return res.status(400).json({ RspCode: "01", Message: "Order not found" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      console.error("❌ Order not found:", orderId);
      return res.status(404).json({ RspCode: "01", Message: "Order not found" });
    }

    if (order.paymentStatus === "success" && order.status !== "new") {
      console.log("ℹ️ Callback already processed, returning OK");
      return res.json({ RspCode: "00", Message: "Confirm Success" });
    }

    if (vnp_ResponseCode === "00" && vnp_TransactionStatus === "00") {
      console.log("✅ Payment successful, processing...");
      order.paymentStatus = "success";
      order.vnpayTransactionNo = vnp_TransactionNo;
      order.vnpaySecureHash = vnp_SecureHash;
      
      if (!order.timeline) {
        order.timeline = [];
      }
      order.timeline.push({
        status: "processing",
        message: "Thanh toán VNPay thành công",
        updatedBy: order.customer,
      });
      await order.save();

      for (const item of order.items) {
        const product = await Product.findById(item.product);
        if (product && product.stock >= item.quantity) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: -item.quantity },
          });
        }
      }

      await Notification.create({
        user: order.customer,
        type: "order",
        title: "Thanh toán thành công",
        message: `Đơn hàng ${order.orderNumber} đã được thanh toán thành công qua VNPay!`,
        link: `/orders/${order._id}`,
      });

      const cart = await Cart.findOne({ user: order.customer });
      if (cart) {
        cart.items = [];
        await cart.save();
      }
      
      return res.json({ RspCode: "00", Message: "Confirm Success" });
    } else {
      console.log("❌ Payment failed:", { vnp_ResponseCode, vnp_TransactionStatus });
      order.paymentStatus = "failed";
      
      if (!order.timeline) {
        order.timeline = [];
      }
      order.timeline.push({
        status: "new",
        message: `Thanh toán VNPay thất bại: Mã lỗi ${vnp_ResponseCode}`,
        updatedBy: order.customer,
      });
      await order.save();

      if (order.voucher) {
        const voucher = await Voucher.findById(order.voucher);
        if (voucher) {
          voucher.usedCount = Math.max(0, voucher.usedCount - 1);
          await voucher.save();
        }
      }

      return res.json({ RspCode: "00", Message: "Confirm Success" });
    }
  } catch (error) {
    console.error("VNPay callback error:", error);
    res.status(500).json({ RspCode: "99", Message: "Unknown error" });
  }
};

/**
 * GET /api/payment/vnpay/callback
 * IPN (Instant Payment Notification) callback từ VNPay - GET
 */
router.get("/vnpay/callback", handleVnpayCallback);

/**
 * POST /api/payment/vnpay/callback
 * IPN (Instant Payment Notification) callback từ VNPay - POST
 */
router.post("/vnpay/callback", handleVnpayCallback);

/**
 * GET /api/payment/vnpay/return
 * Return URL sau khi thanh toán (redirect từ VNPay)
 */
router.get("/vnpay/return", async (req, res) => {
  try {
    const { vnp_TxnRef, vnp_ResponseCode, vnp_TransactionStatus } = req.query;

    if (!vnp_TxnRef) {
      return res.redirect("/?payment=error&message=Thiếu thông tin đơn hàng");
    }

    const orderId = vnpayService.parseOrderIdFromTxnRef(vnp_TxnRef);
    if (!orderId) {
      return res.redirect("/?payment=error&message=Không tìm thấy đơn hàng");
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.redirect("/?payment=error&message=Không tìm thấy đơn hàng");
    }

    const isValid = vnpayService.verifyCallback(req.query);
    if (!isValid) {
      return res.redirect(`/?payment=error&orderId=${order._id}&message=Chữ ký không hợp lệ`);
    }

    if (vnp_ResponseCode === "00" && vnp_TransactionStatus === "00") {
      return res.redirect(`/?payment=success&orderId=${order._id}`);
    }

    return res.redirect(`/?payment=failed&orderId=${order._id}&message=${encodeURIComponent("Thanh toán thất bại")}`);
  } catch (error) {
    console.error("VNPay return error:", error);
    return res.redirect("/?payment=error&message=Lỗi xử lý");
  }
});

/**
 * GET /api/payment/vnpay/status/:orderId
 * Kiểm tra trạng thái thanh toán của đơn hàng
 */
router.get("/vnpay/status/:orderId", verifyToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng!" });
    }

    if (req.user.role === "customer" && order.customer.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Không có quyền xem đơn hàng này!" });
    }

    if (order.vnpayTxnRef && order.paymentStatus === "processing") {
      const queryResult = await vnpayService.queryOrder(order.vnpayTxnRef);
      if (queryResult.success) {
        // Parse response để cập nhật payment status nếu cần
      }
    }

    res.json({
      orderId: order._id,
      orderNumber: order.orderNumber,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status,
      total: order.total,
      vnpayTxnRef: order.vnpayTxnRef,
      vnpayTransactionNo: order.vnpayTransactionNo,
    });
  } catch (error) {
    console.error("Check VNPay payment status error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

module.exports = router;

