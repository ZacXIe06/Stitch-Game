const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pictureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Picture',
    required: true
  },
  // 进度百分比 (0-100)
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // 颜色数据 - 使用多种存储格式
  colorData: {
    // 存储格式类型: 'sparse', 'rle', 'bitmap', 'blocks'
    format: {
      type: String,
      enum: ['sparse', 'rle', 'bitmap', 'blocks'],
      default: 'sparse'
    },
    // 稀疏矩阵格式 - 只存储已上色的格子
    sparse: {
      type: Map,
      of: String,
      default: () => new Map()
    },
    // 行程编码格式 - 存储连续相同颜色的格子
    rle: [{
      color: String,  // 颜色值或null表示未上色
      count: Number,  // 连续格子数量
      startX: Number, // 起始X坐标
      startY: Number  // 起始Y坐标
    }],
    // 位图格式 - 二进制数据
    bitmap: Buffer,
    // 分块格式 - 将图像分成多个小块
    blocks: [{
      x: Number,      // 块的X坐标
      y: Number,      // 块的Y坐标
      size: Number,   // 块的大小
      data: Buffer    // 块的数据
    }]
  },
  // 进度截图快照
  snapshot: {
    // 图片URL
    imageUrl: {
      type: String
    },
    // 创建时间
    createdAt: {
      type: Date,
      default: Date.now
    },
    // 缩略图URL（可选）
    thumbnailUrl: {
      type: String
    }
  },
  // 最后一次保存时间
  lastSaved: {
    type: Date,
    default: Date.now
  },
  // 总格子数
  totalCells: {
    type: Number,
    required: true
  },
  // 已上色格子数
  coloredCells: {
    type: Number,
    default: 0
  }
});

// 创建复合索引
progressSchema.index({ userId: 1, pictureId: 1 }, { unique: true });

// 更新时自动设置lastSaved
progressSchema.pre('save', function(next) {
  this.lastSaved = new Date();
  next();
});

// 计算进度百分比的方法
progressSchema.methods.calculateProgress = function() {
  if (this.totalCells === 0) return 0;
  this.progress = Math.round((this.coloredCells / this.totalCells) * 100);
  return this.progress;
};

module.exports = mongoose.model('Progress', progressSchema); 