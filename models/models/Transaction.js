const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['membership', 'coins', 'item'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    enum: ['CNY', 'USD'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['alipay', 'wechat', 'creditcard', 'google_pay', 'apple_pay'],
    required: true
  },
  paymentIntentId: {
    type: String,
    sparse: true,
    unique: true
  },
  paymentDetails: {
    type: Object,
    select: false
  },
  orderId: {
    type: String,
    unique: true,
    required: true
  },
  description: String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('Transaction', transactionSchema); 