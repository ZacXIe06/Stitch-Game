// 引入模块
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
require('dotenv').config();  
require('./db');
const jwt = require('jsonwebtoken');
const { storage } = require('./config/cloudinary');
const { authenticateUser, authorizeAdmin } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payment');
const experimentRoutes = require('./routes/experiment');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const pictureRoutes = require('./routes/pictures');

// 创建 Express 应用
const app = express();

// 定义验证中间件
const validateApp = (req, res, next) => {
  const clientKey = req.headers['x-client-key'];
  if (!clientKey || clientKey !== process.env.APP_SECRET_KEY) {
    return res.status(403).json({ message: '无效的应用密钥' });
  }
  next();
};

// 1. 先注册基础中间件
app.use(express.json());
app.use(cors());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// 基础路由 - 服务器状态检查
app.get('/', (req, res) => {
  res.send('填色游戏服务器运行中...');
});

// 2. 不需要认证的路由（放在 API 密钥验证之前）
app.use('/api/auth', authRoutes);

// 4. 认证中间件（对所有需要认证的路由）
app.use('/api', (req, res, next) => {
  // 跳过不需要认证的路由
  if (req.path.startsWith('/auth/') || 
      req.path.startsWith('/payments/callback/')) {
    return next();
  }
  
  // 未认证返回 401
  if (!req.headers.authorization) {
    return res.status(401).json({ message: '需要认证' });
  }
  
  return authenticateUser(req, res, next);
});

// 5. API密钥验证中间件（放在认证中间件后面）
app.use('/api', validateApp);

// 6. 路由注册
app.use('/api/payments', paymentRoutes);
app.use('/api/experiments', experimentRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', (req, res, next) => {
  // 先检查认证
  if (!req.headers.authorization) {
    return res.status(401).json({ message: '需要认证' });
  }
  // 再检查权限
  return authorizeAdmin(req, res, next);
}, adminRoutes);
app.use('/api/pictures', pictureRoutes);

// 引入图片模型
const Picture = require('./models/Picture');

// 引入新的模型
const Progress = require('./models/Progress');
const Tutorial = require('./models/Tutorial');
const DailyTask = require('./models/DailyTask');
const Music = require('./models/Music');
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const Achievement = require('./models/Achievement');
const Experiment = require('./models/Experiment');
const ExperimentResult = require('./models/ExperimentResult');
const Banner = require('./models/Banner');
const Category = require('./models/Category');

// 配置文件上传的存储设置
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 增加到10MB
  },
  timeout: 60000, // 增加超时时间
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片文件'));
    }
  }
});

// API 路由部分
// 2. 搜索功能 - 根据关键词搜索图片
// 使用方法：GET /api/pictures/search?keyword=关键词
app.get('/api/pictures/search', async (req, res) => {
  try {
    const { keyword } = req.query;
    const searchRegex = new RegExp(keyword, 'i'); // i 表示不区分大小写
    
    const pictures = await Picture.find({
      $or: [
        { title: searchRegex },   
        { category: searchRegex } 
      ]
    });
    
    res.json(pictures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. 分类功能
// 3.1 获取所有分类列表
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Picture.distinct('category');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3.2 获取指定分类的所有图片
app.get('/api/pictures/category/:category', async (req, res) => {
  try {
    const pictures = await Picture.find({ category: req.params.category });
    res.json(pictures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. 获取所有图片列表
app.get('/api/pictures', async (req, res) => {
  try {
    const pictures = await Picture.find();
    res.json(pictures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. 获取单个图片详情
app.get('/api/pictures/:id', async (req, res) => {
  try {
    const picture = await Picture.findById(req.params.id);
    if (!picture) {
      return res.status(404).json({ message: '图片不存在' });
    }
    res.json(picture);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. 上传新图片
// 使用方法：POST 请求，需要提供 title, category 和 image 文件
app.post('/api/pictures', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '未提供图片文件' });
    }

    const picture = new Picture({
      title: req.body.title,
      category: req.body.category,
      imageUrl: req.file.path,
      thumbnailUrl: req.file.path.replace('/upload/', '/upload/t_thumbnail/')
    });

    console.log('准备保存图片:', picture);
    await picture.save();
    console.log('图片保存成功');

    res.status(201).json(picture);
  } catch (error) {
    console.error('图片上传错误:', {
      message: error.message,
      stack: error.stack,
      cloudinaryError: error.error
    });
    res.status(400).json({ error: error.message });
  }
});

// 7. 更新图片信息
// 使用方法：PUT 请求，可更新 title 和 category
app.put('/api/pictures/:id', async (req, res) => {
  try {
    const picture = await Picture.findByIdAndUpdate(
      req.params.id,
      {
        title: req.body.title,
        category: req.body.category
      },
      { new: true }  // 返回更新后的文档
    );
    if (!picture) {
      return res.status(404).json({ message: '图片不存在' });
    }
    res.json(picture);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. 删除图片
app.delete('/api/pictures/:id', async (req, res) => {
  try {
    const picture = await Picture.findById(req.params.id);
    if (!picture) {
      return res.status(404).json({ message: '图片不存在' });
    }

    // 从Cloudinary删除图片
    const publicId = picture.imageUrl.split('/').pop().split('.')[0];
    await cloudinary.uploader.destroy(publicId);

    await picture.remove();
    res.json({ message: '图片删除成功' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 进度相关API
app.post('/api/progress', async (req, res) => {
  try {
    const { pictureId, progress: progressValue, colorData } = req.body;
    const userId = req.user.userId;  // 从 JWT 中获取的是字符串形式的 ID
    
    // 验证图片是否存在
    const picture = await Picture.findById(pictureId);
    if (!picture) {
      return res.status(404).json({ message: '图片不存在' });
    }
    
    // 先查找是否存在进度
    let progressDoc = await Progress.findOne({
      userId,
      pictureId
    });
    
    if (progressDoc) {
      // 更新现有进度
      progressDoc.progress = progressValue;
      progressDoc.colorData = colorData;
      progressDoc.lastSaved = new Date();
    } else {
      // 创建新进度
      progressDoc = new Progress({
        userId,
        pictureId,
        progress: progressValue,
        colorData,
        lastSaved: new Date()
      });
    }
    
    await progressDoc.save();
    
    res.status(201).json(progressDoc);
  } catch (error) {
    console.error('保存进度错误:', error);  // 添加错误日志
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/progress/:pictureId', async (req, res) => {
  try {
    const progress = await Progress.findOne({ 
      userId: req.user.userId,  // 从 JWT 中获取的是字符串形式的 ID
      pictureId: req.params.pictureId
    });
    if (!progress) {
      return res.status(404).json({ message: '进度不存在' });
    }
    res.json(progress);
  } catch (error) {
    console.error('获取进度错误:', error);  // 添加错误日志
    res.status(500).json({ error: error.message });
  }
});

// 管理员查看用户进度
app.get('/api/admin/progress/:userId', async (req, res) => {
  try {
    const progress = await Progress.find({ userId: req.params.userId })
      .populate('pictureId')
      .sort('-lastSaved');
    res.json(progress);
  } catch (error) {
    console.error('获取用户进度错误:', error);  // 添加错误日志
    res.status(500).json({ error: error.message });
  }
});

// 新手引导相关API
app.get('/api/tutorials', async (req, res) => {
  try {
    const tutorials = await Tutorial.find().sort('order');
    res.json(tutorials);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tutorials/complete/:userId/:tutorialId', async (req, res) => {
  try {
    const progress = await Progress.findOneAndUpdate(
      { userId: req.params.userId },
      { $addToSet: { completedTutorials: req.params.tutorialId } },
      { new: true, upsert: true }
    );
    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 每日任务相关API
app.get('/api/daily-tasks/:userId', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let tasks = await DailyTask.find({
      userId: req.params.userId,
      createdAt: { $gte: today }
    });
    
    if (tasks.length === 0) {
      // 生成新的每日任务
      const newTasks = [
        {
          userId: req.params.userId,
          type: 'complete_pictures',
          target: 3,
          reward: 100,
          progress: 0
        },
        {
          userId: req.params.userId,
          type: 'perfect_coloring',
          target: 1,
          reward: 200,
          progress: 0
        }
      ];
      
      tasks = await DailyTask.insertMany(newTasks);
    }
    
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/daily-tasks/:taskId/progress', async (req, res) => {
  try {
    const { progress } = req.body;
    const task = await DailyTask.findByIdAndUpdate(
      req.params.taskId,
      { progress },
      { new: true }
    );
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 音乐相关API
// 获取所有背景音乐
app.get('/api/music', async (req, res) => {
  try {
    const { category } = req.query;
    const query = category ? { category } : {};
    const music = await Music.find(query).sort('order');
    res.json(music);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取默认背景音乐
app.get('/api/music/default', async (req, res) => {
  try {
    const defaultMusic = await Music.findOne({ isDefault: true });
    res.json(defaultMusic);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 上传新音乐
app.post('/api/music', upload.single('audio'), async (req, res) => {
  try {
    const music = new Music({
      title: req.body.title,
      artist: req.body.artist,
      category: req.body.category,
      url: `/uploads/${req.file.filename}`,
      duration: req.body.duration,
      order: req.body.order,
      isDefault: req.body.isDefault === 'true'
    });
    
    // 如果设置为默认音乐，取消其他音乐的默认状态
    if (music.isDefault) {
      await Music.updateMany(
        { _id: { $ne: music._id } },
        { isDefault: false }
      );
    }
    
    await music.save();
    res.status(201).json(music);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 更新音乐信息
app.put('/api/music/:id', async (req, res) => {
  try {
    const updateData = {
      title: req.body.title,
      artist: req.body.artist,
      category: req.body.category,
      order: req.body.order
    };
    
    if (req.body.isDefault === 'true') {
      updateData.isDefault = true;
      // 取消其他音乐的默认状态
      await Music.updateMany(
        { _id: { $ne: req.params.id } },
        { isDefault: false }
      );
    }
    
    const music = await Music.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!music) {
      return res.status(404).json({ message: '音乐不存在' });
    }
    res.json(music);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 删除音乐
app.delete('/api/music/:id', async (req, res) => {
  try {
    const music = await Music.findByIdAndDelete(req.params.id);
    if (!music) {
      return res.status(404).json({ message: '音乐不存在' });
    }
    // 如果删除的是默认音乐，设置最早添加的音乐为默认
    if (music.isDefault) {
      const newDefault = await Music.findOne().sort('createdAt');
      if (newDefault) {
        newDefault.isDefault = true;
        await newDefault.save();
      }
    }
    res.json({ message: '音乐已删除' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 完成图片
app.post('/api/pictures/:id/complete', async (req, res) => {
  try {
    const picture = await Picture.findById(req.params.id);
    if (!picture) {
      return res.status(404).json({ message: '图片不存在' });
    }

    picture.isCompleted = true;
    await picture.save();

    res.json({ 
      _id: picture._id,
      isCompleted: picture.isCompleted 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取用户完成/未完成的图片
app.get('/api/pictures/status/:completed', async (req, res) => {
  try {
    const isCompleted = req.params.completed === 'true';
    const pictures = await Picture.find({ isCompleted });
    res.json(pictures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取用户信息
app.get('/api/users/me', async (req, res) => {
  res.json(req.user);
});

// 更新用户信息
app.put('/api/users/me', async (req, res) => {
  try {
    const allowedUpdates = ['username', 'email'];
    const updates = Object.keys(req.body)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {});
      
    Object.assign(req.user, updates);
    await req.user.save();
    res.json(req.user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 支付相关配置
const paymentConfig = {
  applePay: {
    merchantId: process.env.APPLE_MERCHANT_ID,
    merchantName: '填色游戏'
  },
  googlePay: {
    packageName: process.env.ANDROID_PACKAGE_NAME,
    products: {
      coins_100: {
        id: 'com.game.coins.100',
        type: 'inapp',
        price: '￥6.00'
      }
      // ... 其他商品
    }
  }
};

// 获取支付配置
app.get('/api/payments/config', (req, res) => {
  res.json({
    applePay: paymentConfig.applePay,
    googlePay: paymentConfig.googlePay
  });
});

// 获取交易历史
app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id })
      .sort('-createdAt');
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取成就列表
app.get('/api/achievements', async (req, res) => {
  try {
    const achievements = await Achievement.find({ userId: req.user._id });
    res.json(achievements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 添加全局错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? '服务器内部错误' 
      : err.message
  });
});

// 添加 404 处理
app.use((req, res) => {
  res.status(404).json({ message: '请求的资源不存在' });
});

// AB测试和灰度发布中间件
const experimentMiddleware = async (req, res, next) => {
  if (!req.user) return next();

  try {
    // 获取所有活跃实验
    const activeExperiments = await Experiment.find({ 
      status: 'active',
      startDate: { $lte: new Date() },
      $or: [
        { endDate: { $gt: new Date() } },
        { endDate: null }
      ]
    });

    req.experiments = {};

    for (const experiment of activeExperiments) {
      // 检查用户是否已参与实验
      const existingResult = await ExperimentResult.findOne({
        experimentId: experiment._id,
        userId: req.user._id
      });

      if (existingResult) {
        req.experiments[experiment.name] = existingResult.variant;
        continue;
      }

      if (experiment.type === 'ab_test') {
        // AB测试分组逻辑
        const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
        let random = Math.random() * totalWeight;
        let selectedVariant;

        for (const variant of experiment.variants) {
          random -= variant.weight;
          if (random <= 0) {
            selectedVariant = variant.name;
            break;
          }
        }

        // 记录用户分组
        const result = new ExperimentResult({
          experimentId: experiment._id,
          userId: req.user._id,
          variant: selectedVariant
        });
        await result.save();
        req.experiments[experiment.name] = selectedVariant;

      } else if (experiment.type === 'gray_release') {
        // 灰度发布逻辑
        const userHash = req.user._id.toString().substr(-2);
        const userPercentile = parseInt(userHash, 16) % 100;
        const isInRollout = userPercentile < experiment.rolloutPercentage;

        // 检查目标用户组
        const isTargetUser = experiment.targetGroups.some(group => {
          switch (group) {
            case 'all':
              return true;
            case 'new_users':
              return (new Date() - req.user.createdAt) < (7 * 24 * 60 * 60 * 1000);
            case 'premium_users':
              return req.user.membershipLevel === 'premium';
            case 'specific_users':
              return experiment.specificUserIds?.includes(req.user._id.toString());
            default:
              return false;
          }
        });

        const variant = (isInRollout && isTargetUser) ? 'new' : 'original';
        const result = new ExperimentResult({
          experimentId: experiment._id,
          userId: req.user._id,
          variant
        });
        await result.save();
        req.experiments[experiment.name] = variant;
      }
  }
  
  next();
  } catch (error) {
    next(error);
  }
};

// 实验管理API路由
app.post('/api/experiments', async (req, res) => {
  try {
    const experiment = new Experiment(req.body);
    await experiment.save();
    res.status(201).json(experiment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 获取实验列表
app.get('/api/experiments', async (req, res) => {
  try {
    const experiments = await Experiment.find();
    res.json(experiments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新实验
app.put('/api/experiments/:id', async (req, res) => {
  try {
    const experiment = await Experiment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(experiment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 记录实验指标
app.post('/api/experiments/:id/metrics', async (req, res) => {
  try {
    const { metric, value } = req.body;
    const result = await ExperimentResult.findOneAndUpdate(
      {
        experimentId: req.params.id,
        userId: req.user._id
      },
      {
        $push: {
          metrics: {
            name: metric,
            value,
            recordedAt: new Date()
          }
        }
      },
      { new: true }
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取实验结果统计
app.get('/api/experiments/:id/stats', async (req, res) => {
  try {
    const results = await ExperimentResult.aggregate([
      { $match: { experimentId: mongoose.Types.ObjectId(req.params.id) } },
      { $group: {
        _id: '$variant',
        userCount: { $sum: 1 },
        metrics: { $push: '$metrics' }
      }}
    ]);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 在需要进行实验的路由之前使用中间件
app.use('/api/*', experimentMiddleware);

// Banner管理API
app.post('/api/admin/banners', upload.single('image'), async (req, res) => {
  try {
    const banner = new Banner({
      title: req.body.title,
      imageUrl: req.file.path,
      linkUrl: req.body.linkUrl,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      status: req.body.status,
      order: req.body.order,
      platform: req.body.platform
    });
    await banner.save();
    res.status(201).json(banner);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/banners', async (req, res) => {
  try {
    const { platform = 'all' } = req.query;
    const now = new Date();
    const banners = await Banner.find({
      status: 'active',
      $or: [
        { platform: 'all' },
        { platform }
      ],
      $or: [
        { startDate: { $lte: now }, endDate: { $gte: now } },
        { startDate: null, endDate: null }
      ]
    }).sort('order');
    res.json(banners);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取图片列表（支持多种筛选和排序）
app.get('/api/pictures', async (req, res) => {
  try {
    const {
      category,
      tags,
      difficulty,
      status = 'active',
      sort = 'order',
      order = 'asc',
      page = 1,
      limit = 20
    } = req.query;

    const query = { status };
    if (category) query.categoryId = category;
    if (tags) query.tags = { $in: tags.split(',') };
    if (difficulty) query.difficulty = difficulty;

    const pictures = await Picture.find(query)
      .sort({ [sort]: order === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('categoryId');

    const total = await Picture.countDocuments(query);

    res.json({
      pictures,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Google Play支付路由
// TODO: 需要实现购买验证和订阅管理
app.get('/api/payments/google-play/products', (req, res) => {
  try {
    res.json(paymentConfig.googlePlay.products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建服务器实例但不立即启动
const server = require('http').createServer(app);

// 只在非测试环境启动服务器
if (process.env.NODE_ENV !== 'test') {
const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
}

module.exports = { app, server };