const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Music = require('../models/Music');

// 配置文件上传
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
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('只支持音频文件'));
    }
  }
});

// 获取所有背景音乐
router.get('/', async (req, res) => {
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
router.get('/default', async (req, res) => {
  try {
    const defaultMusic = await Music.findOne({ isDefault: true });
    res.json(defaultMusic);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 上传新音乐
router.post('/', upload.single('audio'), async (req, res) => {
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
router.put('/:id', async (req, res) => {
  try {
    const updateData = {
      title: req.body.title,
      artist: req.body.artist,
      category: req.body.category,
      order: req.body.order
    };
    
    if (req.body.isDefault === 'true') {
      updateData.isDefault = true;
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
router.delete('/:id', async (req, res) => {
  try {
    const music = await Music.findByIdAndDelete(req.params.id);
    if (!music) {
      return res.status(404).json({ message: '音乐不存在' });
    }
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

module.exports = router; 