const express = require('express');
const router = express.Router();
const Picture = require('../models/Picture');
const Category = require('../models/Category');
const multer = require('multer');
const path = require('path');

// 配置本地存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // 保留原始文件名，但添加时间戳防止重名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// 配置multer中间件
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    console.log('文件类型检查:', file.mimetype);
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片文件'));
    }
  }
});

// 获取图片列表（用户端）
router.get('/', async (req, res) => {
  try {
    const { category, difficulty, page = 1, limit = 20 } = req.query;
    const query = { status: 'active' };  // 只显示激活的图片
    
    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;

    const pictures = await Picture.find(query)
      .sort({ position: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('category');

    res.json(pictures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取单张图片详情
router.get('/:id', async (req, res) => {
  try {
    const picture = await Picture.findById(req.params.id)
      .populate('category');
    if (!picture) {
      return res.status(404).json({ error: '图片不存在' });
    }
    res.json(picture);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取图片内容
router.get('/:id/content', async (req, res) => {
  try {
    const picture = await Picture.findById(req.params.id);
    if (!picture) {
      return res.status(404).json({ error: '图片不存在' });
    }

    // 直接发送本地文件
    res.sendFile(path.join(__dirname, '..', picture.imageUrl));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 上传图片
router.post('/', upload.single('image'), async (req, res) => {
  console.log('开始处理上传请求');
  console.log('请求体:', req.body);
  console.log('文件信息:', req.file);
  
  try {
    if (!req.file) {
      console.log('未检测到文件');
      return res.status(400).json({ error: '未提供图片文件' });
    }

    if (!req.body.title || !req.body.category) {
      console.log('缺少必要字段');
      return res.status(400).json({ error: '标题和分类是必需的' });
    }

    // 查找或创建分类
    let category = await Category.findOne({ name: req.body.category });
    if (!category) {
      category = new Category({
        name: req.body.category,
        description: `${req.body.category}分类`,
        status: 'active'
      });
      await category.save();
      console.log('创建新分类:', category);
    }

    const picture = new Picture({
      title: req.body.title.trim(),
      category: category._id, // 使用分类的ID
      imageUrl: `/uploads/${req.file.filename}`,
      thumbnailUrl: `/uploads/${req.file.filename}`,
      status: 'active'
    });

    console.log('准备保存的图片数据:', picture);
    await picture.save();
    console.log('图片保存成功');

    res.status(201).json(picture);
  } catch (error) {
    console.error('上传错误:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: '数据验证失败', details: error.message });
    }
    res.status(500).json({ error: '服务器错误', details: error.message });
  }
});

// 搜索图片
router.get('/search', async (req, res) => {
  // ... 搜索功能实现
});

// 按分类获取图片
router.get('/category/:category', async (req, res) => {
  // ... 分类功能实现
});

module.exports = router; 