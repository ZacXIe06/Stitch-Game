const express = require('express');
const router = express.Router();
const multer = require('multer');
const { storage } = require('../config/cloudinary');
const upload = multer({ storage });
const Banner = require('../models/Banner');
const Category = require('../models/Category');
const Picture = require('../models/Picture');
const { authenticateUser, authorizeAdmin, isAdmin } = require('../middleware/auth');

// 确保所有管理员路由都使用这两个中间件
router.use(authenticateUser);
router.use(authorizeAdmin);

// Banner管理
router.post('/banners', upload.single('image'), async (req, res) => {
  try {
    let imageData = {};
    
    if (process.env.NODE_ENV === 'test') {
      // 测试环境使用模拟的图片数据
      imageData = {
        url: 'http://test-url.com/test-image.jpg'
      };
    } else {
      // 生产环境使用实际的 Cloudinary 数据
      imageData = {
        url: req.file.path
      };
    }

    const banner = new Banner({
      title: req.body.title,
      image: imageData,
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
    // 添加测试环境的处理
    let imageData = {};
    
    if (process.env.NODE_ENV === 'test') {
      // 测试环境使用模拟的图片数据
      imageData = {
        url: 'http://test-url.com/test-image.jpg'
      };
    } else {
      // 生产环境使用实际的 Cloudinary 数据
      imageData = {
        url: req.file.path
      };
    }

    const picture = new Picture({
      title: req.body.title,
      description: req.body.description,
      category: req.body.categoryId,  // 确保这里使用 categoryId
      tags: req.body.tags ? req.body.tags.split(',') : [],
      difficulty: req.body.difficulty,
      position: req.body.position,
      imageUrl: imageData.url,
      thumbnailUrl: imageData.url.replace('/upload/', '/upload/t_thumbnail/')
    });

    await picture.save();
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
      update.image = {
        url: req.file.path,
        publicId: req.file.filename
      };
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

// 获取图片列表（支持分页和筛选）
router.get('/pictures', async (req, res) => {
  try {
    const { 
      category, 
      tags, 
      status,
      difficulty,
      page = 1, 
      limit = 20,
      sort = 'position',
      order = 'asc'
    } = req.query;

    const query = {};
    if (category) query.category = category;
    if (tags) query.tags = { $in: tags.split(',') };
    if (status) query.status = status;
    if (difficulty) query.difficulty = difficulty;

    const [pictures, total] = await Promise.all([
      Picture.find(query)
        .sort({ [sort]: order === 'asc' ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate('category'),
      Picture.countDocuments(query)
    ]);

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

// 辅助函数：构建分类树
function buildCategoryTree(categories, parentId = null) {
  return categories
    .filter(cat => cat.parentId?.toString() === (parentId?.toString() ?? null))
    .map(cat => ({
      ...cat.toObject(),
      children: buildCategoryTree(categories, cat._id)
    }));
}

module.exports = router; 