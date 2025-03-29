const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Banner = require('../models/Banner');
const Category = require('../models/Category');
const Picture = require('../models/Picture');
const { authenticateUser, authorizeAdmin, isAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

// 配置本地存储
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

// 确保所有管理员路由都使用这两个中间件
router.use(authenticateUser);
router.use(authorizeAdmin);

// 添加调试路由
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: '管理员API测试成功',
    user: req.user
  });
});

// 获取所有上传的图片
router.get('/all-images', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    
    const files = fs.readdirSync(uploadsDir);
    const imageFiles = files.filter(file => 
      ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].some(ext => file.toLowerCase().endsWith(ext))
    );
    
    const images = imageFiles.map(file => ({
      filename: file,
      url: `/uploads/${file}`,
      fullPath: path.join(uploadsDir, file)
    }));
    
    res.json({
      success: true,
      count: images.length,
      images: images
    });
  } catch (error) {
    console.error('获取所有图片错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取图片列表（支持分页和筛选）- 简化版
router.get('/pictures', async (req, res) => {
  try {
    console.log('获取图片列表请求:', req.query);
    
    const { page = 1, limit = 20 } = req.query;

    // 简化查询，不使用过滤条件
    console.log('执行简化查询');

    const [pictures, total] = await Promise.all([
      Picture.find()
        .sort({ position: 1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('category'),
      Picture.countDocuments()
    ]);

    console.log(`查询到 ${pictures.length} 张图片，总计 ${total} 张`);
    
    // 检查并处理图片URL
    pictures.forEach(picture => {
      console.log('图片记录:', picture._id, picture.title);
      console.log('原始图片URL:', picture.imageUrl);
    });

    res.json({
      pictures,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取图片列表错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// Banner管理
router.post('/banners', upload.single('image'), async (req, res) => {
  try {
    const banner = new Banner({
      title: req.body.title,
      imageUrl: `/uploads/${req.file.filename}`,
      link: req.body.link,
      position: req.body.position,
      startDate: req.body.startDate,
      endDate: req.body.endDate
    });

    await banner.save();
    res.status(201).json(banner);
  } catch (error) {
    console.error('创建Banner错误:', error);
    res.status(400).json({ error: error.message });
  }
});

// 分类管理
router.post('/categories', async (req, res) => {
  try {
    console.log('创建分类请求:', req.body);  // 添加调试日志
    const category = new Category(req.body);
    console.log('准备保存分类:', category);  // 添加调试日志
    await category.save();
    console.log('分类保存成功');  // 添加调试日志
    res.status(201).json(category);
  } catch (error) {
    console.error('创建分类失败:', error);  // 添加调试日志
    res.status(400).json({ error: error.message });
  }
});

// 图片管理
router.post('/pictures', upload.single('image'), async (req, res) => {
  try {
    console.log('上传图片请求:', req.body);
    console.log('上传的文件:', req.file);
    
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';
    console.log('生成的图片URL:', imageUrl);
    
    const picture = new Picture({
      title: req.body.title,
      description: req.body.description,
      category: req.body.categoryId,
      tags: req.body.tags ? req.body.tags.split(',') : [],
      difficulty: req.body.difficulty,
      position: req.body.position,
      imageUrl: imageUrl,
      thumbnailUrl: imageUrl
    });

    await picture.save();
    console.log('保存的图片数据:', picture);
    res.status(201).json(picture);
  } catch (error) {
    console.error('创建图片错误:', error);
    res.status(400).json({ error: error.message });
  }
});

// 排序接口
router.put('/sort/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { items } = req.body;  // [{id: xxx, position: 1}, ...]
    
    let Model;
    switch(type) {
      case 'banners':
        Model = Banner;
        break;
      case 'categories':
        Model = Category;
        break;
      case 'pictures':
        Model = Picture;
        break;
      default:
        throw new Error('不支持的类型');
    }

    // 批量更新位置
    await Promise.all(
      items.map(item => 
        Model.findByIdAndUpdate(item.id, { position: item.position })
      )
    );

    res.json({ status: 'success' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 获取Banner列表
router.get('/banners', async (req, res) => {
  try {
    const banners = await Banner.find().sort('position');
    res.json(banners);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新Banner
router.put('/banners/:id', upload.single('image'), async (req, res) => {
  try {
    const update = { ...req.body };
    if (req.file) {
      update.imageUrl = `/uploads/${req.file.filename}`;
    }
    const banner = await Banner.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(banner);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 删除Banner
router.delete('/banners/:id', async (req, res) => {
  try {
    await Banner.findByIdAndDelete(req.params.id);
    res.json({ status: 'success' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 获取分类列表（树形结构）
router.get('/categories/tree', async (req, res) => {
  try {
    const categories = await Category.find().sort('position');
    const tree = buildCategoryTree(categories);
    res.json(tree);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新分类
router.put('/categories/:id', async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ error: '分类不存在' });
    }

    res.json(category);
  } catch (error) {
    console.error('更新分类错误:', error);
    res.status(400).json({ error: error.message });
  }
});

// 删除分类
router.delete('/categories/:id', async (req, res) => {
  try {
    // 检查是否有子分类
    const hasChildren = await Category.exists({ parentId: req.params.id });
    if (hasChildren) {
      throw new Error('请先删除子分类');
    }
    // 检查是否有关联的图片
    const hasPictures = await Picture.exists({ category: req.params.id });
    if (hasPictures) {
      throw new Error('请先移除该分类下的图片');
    }
    await Category.findByIdAndDelete(req.params.id);
    res.json({ status: 'success' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 获取单个图片
router.get('/pictures/:id', async (req, res) => {
  try {
    const picture = await Picture.findById(req.params.id)
      .populate('category');
    
    if (!picture) {
      return res.status(404).json({ error: '图片不存在' });
    }
    
    console.log('获取图片详情:', picture._id, picture.title);
    console.log('图片URL:', picture.imageUrl);
    
    res.json(picture);
  } catch (error) {
    console.error('获取图片详情错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 更新图片
router.put('/pictures/:id', upload.single('image'), async (req, res) => {
  try {
    console.log('更新图片请求:', req.params.id);
    console.log('更新图片数据:', req.body);
    console.log('更新图片文件:', req.file);
    
    const picture = await Picture.findById(req.params.id);
    if (!picture) {
      return res.status(404).json({ error: '图片不存在' });
    }
    
    // 更新基本信息
    picture.title = req.body.title;
    picture.description = req.body.description;
    picture.position = req.body.position;
    picture.status = req.body.status;
    
    // 更新标签
    if (req.body.tags) {
      picture.tags = req.body.tags.split(',');
    }
    
    // 更新图片
    if (req.file) {
      const imageUrl = `/uploads/${req.file.filename}`;
      picture.imageUrl = imageUrl;
      console.log('更新图片URL:', imageUrl);
    }
    
    await picture.save();
    console.log('图片更新成功');
    
    res.json(picture);
  } catch (error) {
    console.error('更新图片错误:', error);
    res.status(400).json({ error: error.message });
  }
});

// 删除图片
router.delete('/pictures/:id', async (req, res) => {
  try {
    const picture = await Picture.findByIdAndDelete(req.params.id);
    if (!picture) {
      return res.status(404).json({ error: '图片不存在' });
    }
    
    console.log('删除图片成功:', req.params.id);
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除图片错误:', error);
    res.status(400).json({ error: error.message });
  }
});

// 辅助函数：构建分类树
function buildCategoryTree(categories, parentId = null) {
  return categories
    .filter(cat => cat.parentId?.toString() === (parentId?.toString() ?? null))
    .map(cat => ({
      ...cat.toObject(),
      children: buildCategoryTree(categories, cat._id)
    }));
}

// 获取用户总数
router.get('/users/count', async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取今日活跃用户数
router.get('/users/active-today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const count = await User.countDocuments({
      lastLoginAt: { $gte: today }
    });
    
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取图片总数
router.get('/pictures/count', async (req, res) => {
  try {
    const count = await Picture.countDocuments();
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取用户列表（支持分页和搜索）
router.get('/users', async (req, res) => {
  try {
    const { 
      search, 
      type,
      page = 1, 
      limit = 20,
      sort = 'registeredAt',
      order = 'desc'
    } = req.query;

    const query = {};
    
    // 搜索条件：用户名或邮箱
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    // 用户类型筛选：高价值用户或普通用户
    if (type === 'high-value') {
      // 定义高价值用户的条件：完成图片数 >= 20 或 金币余额 >= 500
      query.$or = [
        { completedCount: { $gte: 20 } },
        { 'coins.balance': { $gte: 500 } }
      ];
    } else if (type === 'normal') {
      // 普通用户条件：完成图片数 < 20 且 金币余额 < 500
      query.$and = [
        { completedCount: { $lt: 20 } },
        { 'coins.balance': { $lt: 500 } }
      ];
    }

    // 排除管理员用户
    query.role = { $ne: 'admin' };

    const [users, total] = await Promise.all([
      User.find(query)
        .select('username email registeredAt lastLogin completedCount coins.balance')
        .sort({ [sort]: order === 'asc' ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    // 处理用户数据，添加高价值用户标识
    const processedUsers = users.map(user => {
      const userData = user.toObject();
      // 判断是否为高价值用户
      userData.isHighValue = 
        (userData.completedCount >= 20) || 
        (userData.coins && userData.coins.balance >= 500);
      
      return userData;
    });

    res.json({
      users: processedUsers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取用户详情
router.get('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    
    // 获取用户基本信息
    const user = await User.findById(userId)
      .select('-password -role -refreshToken');
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    
    // 获取用户购买记录
    const purchases = await Transaction.find({ 
      user: userId, 
      type: 'purchase' 
    })
    .sort({ date: -1 })
    .populate('picture', 'title');
    
    // 获取用户完成记录
    const completions = await Transaction.find({ 
      user: userId, 
      type: 'completion' 
    })
    .sort({ date: -1 })
    .populate('picture', 'title');
    
    // 处理用户数据
    const userData = user.toObject();
    
    // 判断是否为高价值用户
    userData.isHighValue = 
      (userData.completedCount >= 20) || 
      (userData.coins && userData.coins.balance >= 500);
    
    // 计算购买次数
    userData.purchaseCount = purchases.length;
    
    // 添加购买记录
    userData.purchases = purchases.map(p => ({
      _id: p._id,
      date: p.date,
      picture: p.picture,
      coins: p.amount
    }));
    
    // 添加完成记录
    userData.completions = completions.map(c => ({
      _id: c._id,
      date: c.date,
      picture: c.picture,
      duration: c.duration
    }));
    
    // 添加金币交易记录
    userData.coinTransactions = user.coins.transactions.map(t => ({
      _id: t._id,
      date: t.timestamp,
      type: t.type,
      amount: t.amount,
      description: t.reason
    })).sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json(userData);
  } catch (error) {
    console.error('获取用户详情错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 仪表盘数据
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalCategories,
      totalPictures,
      totalUsers,
      totalCompletions
    ] = await Promise.all([
      Category.countDocuments(),
      Picture.countDocuments(),
      User.countDocuments({ role: { $ne: 'admin' } }),
      Transaction.countDocuments({ type: 'completion' })
    ]);
    
    res.json({
      totalCategories,
      totalPictures,
      totalUsers,
      totalCompletions
    });
  } catch (error) {
    console.error('获取仪表盘数据错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 系统状态检查路由
router.get('/check-status', async (req, res) => {
  try {
    // 检查数据库连接
    const dbStatus = mongoose.connection.readyState === 1;
    
    // 获取系统信息
    const systemInfo = {
      serverStatus: true,
      dbStatus: dbStatus,
      apiStatus: true,
      systemLoad: Math.random() * 100, // 模拟系统负载
      storageSpace: Math.random() * 100 // 模拟存储空间使用
    };

    res.json({
      success: true,
      data: systemInfo
    });
  } catch (error) {
    console.error('检查系统状态时出错:', error);
    res.status(500).json({
      success: false,
      message: '检查系统状态时出错'
    });
  }
});

module.exports = router; 