const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  // 个人资料信息
  nickname: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    default: '/images/default-avatar.png'
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 200
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', ''],
    default: ''
  },
  birthday: {
    type: Date
  },
  membership: {
    level: {
      type: String,
      enum: ['free', 'basic', 'premium', 'vip'],
      default: 'free'
    },
    startDate: Date,
    endDate: Date
  },
  ranking: {
    score: { type: Number, default: 0 },
    position: { type: Number },
    lastUpdated: Date
  },
  coins: {
    balance: { type: Number, default: 0 },
    transactions: [{
      type: { type: String, enum: ['earn', 'spend'] },
      amount: Number,
      reason: String,
      timestamp: { type: Date, default: Date.now }
    }]
  },
  tools: [{
    type: { type: String },
    count: { type: Number, default: 0 },
    lastRefillTime: Date
  }],
  achievements: [{
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'Achievement' },
    unlockedAt: Date,
    progress: Number
  }],
  payments: {
    history: [{
      orderId: String,
      platform: String,
      amount: Number,
      status: String,
      createdAt: { type: Date, default: Date.now }
    }],
    applePay: {
      customerId: String,
      lastTransactionId: String
    },
    googlePay: {
      customerId: String,
      lastTransactionId: String
    }
  },
  gameLevel: {
    type: Number,
    default: 1
  },
  experience: {
    type: Number,
    default: 0
  },
  completedPictures: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Picture'
  }],
  completedCount: {
    type: Number,
    default: 0
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: Date,
  lastLogin: {
    type: Date
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  refreshToken: {
    type: String
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
});

// 密码加密中间件
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  this.updatedAt = new Date();
  next();
});

// 验证密码的方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// 排名更新
userSchema.methods.updateRanking = async function(newScore) {
  this.ranking.score = newScore;
  this.ranking.lastUpdated = new Date();
  await this.save();
  
  // 更新排名位置
  const position = await this.model('User').countDocuments({
    'ranking.score': { $gt: newScore }
  });
  this.ranking.position = position + 1;
  await this.save();
};

module.exports = mongoose.model('User', userSchema); 