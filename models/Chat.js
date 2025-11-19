const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  senderRole: {
    type: String,
    enum: ["customer", "admin"],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const chatSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  lastMessage: {
    type: String,
    default: ""
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  unreadCount: {
    type: Number,
    default: 0
  },
  customerUnreadCount: {
    type: Number,
    default: 0
  },
  adminUnreadCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  messages: [chatMessageSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Tự động cập nhật updatedAt và lastMessage
chatSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  if (this.messages && this.messages.length > 0) {
    const lastMsg = this.messages[this.messages.length - 1];
    this.lastMessage = lastMsg.message.substring(0, 100);
    this.lastMessageAt = lastMsg.createdAt || Date.now();
  }
  next();
});

module.exports = mongoose.model("Chat", chatSchema);

