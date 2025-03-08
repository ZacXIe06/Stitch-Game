const mongoose = require('mongoose');

// 交易记录模型：记录所有支付相关的交易信息
const transactionSchema = new mongoose.Schema({
  // 用户和交易基本信息
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  productId: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'CNY'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  
  // 支付平台相关信息
  paymentMethod: {
    type: String,
    enum: ['apple_pay', 'google_play'],
    required: true
  },
  platform: {
    type: String,
    enum: ['ios', 'android'],
    required: true
  },
  orderId: {
    type: String,
    unique: true,
    required: true
  },
  
  // Apple Pay数据
  applePayToken: {
    type: String,
    sparse: true
  },
  paymentDetails: {  // 添加支付详情
    type: Object,
    select: false
  },
  description: String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  deviceInfo: {  // 设备信息
    type: Object,
    select: false
  },
  
  // Google Play数据
  googlePlayData: {
    productId: String,
    purchaseToken: String,
    orderId: String,
    packageName: String,
    purchaseTime: Date,
    purchaseState: Number
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Transaction', transactionSchema); 