const express = require('express');
const router = express.Router();
const Picture = require('../models/Picture');
const { authenticateUser } = require('../middleware/auth');

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

// 搜索图片
router.get('/search', async (req, res) => {
  // ... 搜索功能实现
});

// 按分类获取图片
router.get('/category/:category', async (req, res) => {
  // ... 分类功能实现
});

module.exports = router; 