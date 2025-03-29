// 引入模块
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
require('dotenv').config();  
const jwt = require('jsonwebtoken');
const { authenticateUser, authorizeAdmin } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payment');
const experimentRoutes = require('./routes/experiment');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const pictureRoutes = require('./routes/pictures');
const musicRoutes = require('./routes/music');
const tutorialRoutes = require('./routes/tutorials');
const progressRoutes = require('./routes/progress');
const path = require('path');
const config = require('./config');
// const validateApp = require('./middleware/validateApp');
const connectDB = require('./config/database');

// 连接数据库
connectDB();

// 创建 Express 应用
const app = express();

// 设置端口 - 强制使用3001
const PORT = 3001;

// 1. 先注册基础中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use('/', express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 添加日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// 特殊路由 - 测试uploads目录访问
app.get('/test-uploads', (req, res) => {
  // 读取uploads目录内容
  const uploadsDir = path.join(__dirname, 'uploads');
  try {
    const files = fs.readdirSync(uploadsDir);
    res.json({
      success: true,
      uploadsPath: uploadsDir,
      files: files,
      fileCount: files.length
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      uploadsPath: uploadsDir
    });
  }
});

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
      req.path.startsWith('/payments/callback/') ||
      req.path.startsWith('/pictures')) {
    return next();
  }
  
  console.log('验证请求:', req.path, req.headers.authorization ? '有授权头' : '无授权头');
  
  // 临时跳过认证，用于测试
  if (req.headers.authorization && req.headers.authorization.includes('mock-token-for-admin')) {
    console.log('使用测试令牌，授予管理员权限，跳过角色检查');
    req.user = { userId: 'admin-test', roles: ['admin'] };
    return next();
  }
  
  // 未认证返回 401
  if (!req.headers.authorization) {
    return res.status(401).json({ message: '需要认证' });
  }
  
  return authenticateUser(req, res, next);
});

// 5. API密钥验证中间件（放在认证中间件后面）
// app.use('/api', validateApp);

// 6. 路由注册
app.use('/api/payments', paymentRoutes);
app.use('/api/experiments', experimentRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', authorizeAdmin, adminRoutes);
app.use('/api/pictures', pictureRoutes);
app.use('/api/music', musicRoutes);
app.use('/api/tutorials', tutorialRoutes);
app.use('/api/progress', progressRoutes);

// 引入模型
const Picture = require('./models/Picture');
const Progress = require('./models/Progress');
const Tutorial = require('./models/Tutorial');
const Music = require('./models/Music');
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const Achievement = require('./models/Achievement');
const Experiment = require('./models/Experiment');
const ExperimentResult = require('./models/ExperimentResult');
const Category = require('./models/Category');
const Banner = require('./models/Banner');

// 配置文件上传的存储设置
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
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

// 进度相关API
app.post('/api/progress', async (req, res) => {
  try {
    const { pictureId, progress: progressValue, colorData } = req.body;
    const userId = req.user.userId;
    
    const picture = await Picture.findById(pictureId);
    if (!picture) {
      return res.status(404).json({ message: '图片不存在' });
    }
    
    let progressDoc = await Progress.findOne({
      userId,
      pictureId
    });
    
    if (progressDoc) {
      progressDoc.progress = progressValue;
      progressDoc.colorData = colorData;
      progressDoc.lastSaved = new Date();
    } else {
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
    console.error('保存进度错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取进度
app.get('/api/progress/:pictureId', async (req, res) => {
  try {
    const progress = await Progress.findOne({ 
      userId: req.user.userId,
      pictureId: req.params.pictureId
    });
    if (!progress) {
      return res.status(404).json({ message: '进度不存在' });
    }
    res.json(progress);
  } catch (error) {
    console.error('获取进度错误:', error);
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

// 所有其他路由都返回index.html
app.get('*', (req, res) => {
  if (req.path.startsWith('/admin')) {
    res.sendFile(path.join(__dirname, 'public/admin/index.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public/index.html'));
  }
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务器的函数
const startServer = async () => {
  try {
    // 先连接数据库
    await connectDB();
    
    // 数据库连接成功后启动服务器
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`服务器成功运行在端口 ${PORT}`);
      console.log('可以通过以下地址访问：');
      console.log(`- 本地访问: http://localhost:${PORT}`);
      console.log(`- 局域网访问: http://${getLocalIP()}:${PORT}`);
    });

    // 优雅关闭处理
    process.on('SIGTERM', () => {
      console.log('收到 SIGTERM 信号，准备关闭服务器...');
      server.close(() => {
        console.log('服务器已关闭');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
};

// 获取本机IP地址
function getLocalIP() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  for (let devName in interfaces) {
    const iface = interfaces[devName];
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (alias.family === 'IPv4' && !alias.internal) {
        return alias.address;
      }
    }
  }
  return '0.0.0.0';
}

// 启动服务器
startServer();

// 处理未捕获的异常
process.on('unhandledRejection', (err) => {
  console.error('未捕获的Promise拒绝:', err);
  process.exit(1);
});