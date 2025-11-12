const express = require("express");
const router = express.Router();
const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const { verifyToken } = require("../middleware/authMiddleware");

// 🧾 Lấy danh sách hóa đơn
router.get("/", verifyToken, async (req, res) => {
  try {
    const { search, customer, staff, status, paymentMethod, startDate, endDate, page = 1, limit = 10 } = req.query;
    const query = {};

    // Tìm kiếm theo mã hóa đơn hoặc tên khách hàng
    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: "i" } },
      ];
    }

    // Lọc theo khách hàng
    if (customer) {
      query.customer = customer;
    }

    // Lọc theo nhân viên
    if (staff) {
      query.staff = staff;
    }

    // Lọc theo trạng thái
    if (status) {
      query.status = status;
    }

    // Lọc theo phương thức thanh toán
    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    // Lọc theo ngày
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const invoices = await Invoice.find(query)
      .populate("customer", "name phone address type")
      .populate("staff", "fullName username")
      .populate("items.product", "name price image")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Invoice.countDocuments(query);

    res.json({
      invoices,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Get invoices error:", error);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách hóa đơn!" });
  }
});

// 🧾 Lấy chi tiết hóa đơn
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("customer", "name phone address type")
      .populate("staff", "fullName username")
      .populate("items.product", "name price image category");

    if (!invoice) {
      return res.status(404).json({ message: "Không tìm thấy hóa đơn!" });
    }

    res.json(invoice);
  } catch (error) {
    console.error("Get invoice error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// ➕ Tạo hóa đơn mới
router.post("/", verifyToken, async (req, res) => {
  try {
    const { customer, items, discount, paymentMethod, notes } = req.body;
    const staffId = req.user.userId; // Nhân viên bán hàng là user hiện tại

    if (!customer || !items || items.length === 0) {
      return res.status(400).json({ message: "Vui lòng chọn khách hàng và thêm ít nhất một sản phẩm!" });
    }

    // Tính toán tổng tiền
    let subtotal = 0;
    const invoiceItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Không tìm thấy sản phẩm: ${item.product}` });
      }

      if (product.status === 0) {
        return res.status(400).json({ message: `Sản phẩm ${product.name} đã bị ẩn!` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Sản phẩm ${product.name} chỉ còn ${product.stock} sản phẩm trong kho!` 
        });
      }

      const price = item.price || product.price;
      const itemDiscount = item.discount || 0;
      const itemSubtotal = price * item.quantity * (1 - itemDiscount / 100);

      invoiceItems.push({
        product: product._id,
        quantity: item.quantity,
        price: price,
        discount: itemDiscount,
        subtotal: itemSubtotal,
      });

      subtotal += itemSubtotal;
    }

    // Áp dụng giảm giá tổng
    const totalDiscount = discount || 0;
    const total = subtotal * (1 - totalDiscount / 100);

    // Tạo hóa đơn
    const newInvoice = new Invoice({
      customer,
      staff: staffId,
      items: invoiceItems,
      subtotal,
      discount: totalDiscount,
      total,
      paymentMethod: paymentMethod || "cash",
      status: "pending",
      notes: notes || "",
    });

    await newInvoice.save();

    // Cập nhật tồn kho sản phẩm (chỉ khi hóa đơn hoàn tất)
    // Nếu muốn trừ kho ngay khi tạo, có thể thêm logic ở đây

    const invoice = await Invoice.findById(newInvoice._id)
      .populate("customer", "name phone address type")
      .populate("staff", "fullName username")
      .populate("items.product", "name price image");

    res.status(201).json({
      message: "Tạo hóa đơn thành công!",
      invoice,
    });
  } catch (error) {
    console.error("Create invoice error:", error);
    res.status(500).json({ message: "Lỗi server khi tạo hóa đơn!" });
  }
});

// ✏️ Cập nhật hóa đơn
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { items, discount, paymentMethod, status, notes } = req.body;
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: "Không tìm thấy hóa đơn!" });
    }

    // Chỉ cho phép cập nhật nếu chưa hoàn tất hoặc đã hủy
    if (invoice.status === "completed") {
      return res.status(400).json({ message: "Không thể cập nhật hóa đơn đã hoàn tất!" });
    }

    // Nếu cập nhật items, tính lại tổng tiền
    if (items && items.length > 0) {
      let subtotal = 0;
      const invoiceItems = [];

      for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(404).json({ message: `Không tìm thấy sản phẩm: ${item.product}` });
        }

        const price = item.price || product.price;
        const itemDiscount = item.discount || 0;
        const itemSubtotal = price * item.quantity * (1 - itemDiscount / 100);

        invoiceItems.push({
          product: product._id,
          quantity: item.quantity,
          price: price,
          discount: itemDiscount,
          subtotal: itemSubtotal,
        });

        subtotal += itemSubtotal;
      }

      invoice.items = invoiceItems;
      invoice.subtotal = subtotal;
    }

    // Cập nhật giảm giá
    if (discount !== undefined) {
      invoice.discount = discount;
    }

    // Tính lại tổng tiền
    invoice.total = invoice.subtotal * (1 - (invoice.discount || 0) / 100);

    if (paymentMethod) invoice.paymentMethod = paymentMethod;
    if (status) invoice.status = status;
    if (notes !== undefined) invoice.notes = notes;

    await invoice.save();

    // Nếu chuyển sang completed, trừ tồn kho
    if (status === "completed" && invoice.status !== "completed") {
      for (const item of invoice.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity },
        });
      }
    }

    const updatedInvoice = await Invoice.findById(invoice._id)
      .populate("customer", "name phone address type")
      .populate("staff", "fullName username")
      .populate("items.product", "name price image");

    res.json({
      message: "Cập nhật hóa đơn thành công!",
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error("Update invoice error:", error);
    res.status(500).json({ message: "Lỗi server khi cập nhật hóa đơn!" });
  }
});

// ✅ Cập nhật trạng thái hóa đơn
router.patch("/:id/status", verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: "Không tìm thấy hóa đơn!" });
    }

    const oldStatus = invoice.status;
    invoice.status = status;

    // Nếu chuyển sang completed, trừ tồn kho
    if (status === "completed" && oldStatus !== "completed") {
      for (const item of invoice.items) {
        const product = await Product.findById(item.product);
        if (product.stock < item.quantity) {
          return res.status(400).json({ 
            message: `Sản phẩm ${product.name} không đủ tồn kho!` 
          });
        }
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity },
        });
      }
    }

    // Nếu hủy hóa đơn đã completed, hoàn lại tồn kho
    if (status === "cancelled" && oldStatus === "completed") {
      for (const item of invoice.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity },
        });
      }
    }

    await invoice.save();

    const updatedInvoice = await Invoice.findById(invoice._id)
      .populate("customer", "name phone address type")
      .populate("staff", "fullName username")
      .populate("items.product", "name price image");

    res.json({
      message: "Cập nhật trạng thái hóa đơn thành công!",
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error("Update invoice status error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

// 🗑️ Xóa hóa đơn (chỉ cho phép xóa hóa đơn pending hoặc cancelled)
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: "Không tìm thấy hóa đơn!" });
    }

    if (invoice.status === "completed") {
      return res.status(400).json({ message: "Không thể xóa hóa đơn đã hoàn tất!" });
    }

    await Invoice.findByIdAndDelete(req.params.id);
    res.json({ message: "Xóa hóa đơn thành công!" });
  } catch (error) {
    console.error("Delete invoice error:", error);
    res.status(500).json({ message: "Lỗi server khi xóa hóa đơn!" });
  }
});

// 📄 Xuất PDF (trả về JSON, frontend sẽ xử lý in PDF)
router.get("/:id/pdf", verifyToken, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("customer", "name phone address type")
      .populate("staff", "fullName username")
      .populate("items.product", "name price image category");

    if (!invoice) {
      return res.status(404).json({ message: "Không tìm thấy hóa đơn!" });
    }

    res.json({
      message: "Dữ liệu hóa đơn sẵn sàng để in PDF",
      invoice,
    });
  } catch (error) {
    console.error("Get invoice PDF error:", error);
    res.status(500).json({ message: "Lỗi server!" });
  }
});

module.exports = router;

