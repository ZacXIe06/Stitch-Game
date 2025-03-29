const mongoose = require('mongoose');

// 交易记录模型：记录所有支付相关的交易信息
const transactionSchema = new mongoose.Schema({
  // 用户和交易基本信息
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['purchase', 'completion', 'reward', 'admin'],
    required: true
  },
  picture: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Picture',
    required: function() {
      return this.type === 'purchase' || this.type === 'completion';
    }
  },
  amount: {
    type: Number,
    required: function() {
      return this.type === 'purchase' || this.type === 'reward' || this.type === 'admin';
    }
  },
  duration: {
    type: Number,
    required: function() {
      return this.type === 'completion';
    }
  },
  description: {
    type: String
  },
  date: {
    type: Date,
    default: Date.now
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

// 添加索引以提高查询性能
transactionSchema.index({ user: 1, type: 1 });
transactionSchema.index({ date: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction; 