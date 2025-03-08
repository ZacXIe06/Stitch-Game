const mongoose = require('mongoose');

const metricSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['percentage', 'count', 'value'],
    required: true
  },
  goal: {
    type: Number,
    required: true
  }
});

const experimentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: String,
  type: {
    type: String,
    enum: ['ab_test', 'gradual_rollout'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed'],
    default: 'active'
  },
  variants: [{
    name: String,
    weight: Number,  // 权重，用于灰度发布
    config: Object   // 变体配置
  }],
  targetUsers: {
    type: String,
    enum: ['all', 'new', 'vip'],
    default: 'all'
  },
  startDate: Date,
  endDate: Date,
  metrics: [metricSchema],  // 使用metricSchema
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date
}, {
  strict: false  // 允许未定义的字段
});

experimentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Experiment', experimentSchema); 