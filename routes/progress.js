const express = require('express');
const router = express.Router();
const Progress = require('../models/Progress');
const Picture = require('../models/Picture');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 配置文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads/snapshots';
    // 确保目录存在
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const userId = req.body.userId || 'anonymous';
    const pictureId = req.params.pictureId || req.body.pictureId;
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `snapshot_${userId}_${pictureId}_${timestamp}${ext}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片文件'));
    }
  }
});

// 保存进度
router.post('/', async (req, res) => {
  try {
    const { userId, pictureId, progress, colorData, format, coloredCells, totalCells } = req.body;
    
    if (!userId || !pictureId) {
      return res.status(400).json({ error: '用户ID和图片ID是必需的' });
    }
    
    const picture = await Picture.findById(pictureId);
    if (!picture) {
      return res.status(404).json({ message: '图片不存在' });
    }
    
    let progressDoc = await Progress.findOne({
      userId,
      pictureId
    });
    
    if (progressDoc) {
      // 更新现有进度
      progressDoc.progress = progress || progressDoc.progress;
      progressDoc.coloredCells = coloredCells || progressDoc.coloredCells;
      
      // 根据格式更新颜色数据
      if (colorData) {
        const dataFormat = format || progressDoc.colorData.format || 'sparse';
        progressDoc.colorData.format = dataFormat;
        
        switch (dataFormat) {
          case 'sparse':
            // 将对象转换为 Map
            if (typeof colorData === 'object' && !Array.isArray(colorData)) {
              progressDoc.colorData.sparse = new Map(Object.entries(colorData));
            }
            break;
            
          case 'rle':
            progressDoc.colorData.rle = colorData;
            break;
            
          case 'bitmap':
            // 如果传入的是 base64 字符串，转换为 Buffer
            if (typeof colorData === 'string') {
              progressDoc.colorData.bitmap = Buffer.from(colorData, 'base64');
            } else {
              progressDoc.colorData.bitmap = colorData;
            }
            break;
            
          case 'blocks':
            progressDoc.colorData.blocks = colorData;
            break;
        }
      }
      
      progressDoc.lastSaved = new Date();
    } else {
      // 创建新进度记录
      const dataFormat = format || 'sparse';
      let colorDataObj = { format: dataFormat };
      
      switch (dataFormat) {
        case 'sparse':
          colorDataObj.sparse = new Map(Object.entries(colorData || {}));
          break;
          
        case 'rle':
          colorDataObj.rle = colorData || [];
          break;
          
        case 'bitmap':
          if (typeof colorData === 'string') {
            colorDataObj.bitmap = Buffer.from(colorData, 'base64');
          } else {
            colorDataObj.bitmap = colorData || Buffer.alloc(0);
          }
          break;
          
        case 'blocks':
          colorDataObj.blocks = colorData || [];
          break;
      }
      
      progressDoc = new Progress({
        userId,
        pictureId,
        progress: progress || 0,
        colorData: colorDataObj,
        totalCells: totalCells || (picture.width * picture.height) || 1000,
        coloredCells: coloredCells || 0,
        lastSaved: new Date()
      });
    }
    
    // 如果没有提供进度，根据已上色格子数计算
    if (!progress && coloredCells !== undefined) {
      progressDoc.calculateProgress();
    }
    
    await progressDoc.save();
    
    // 转换 Map 为普通对象以便 JSON 序列化
    const responseData = progressDoc.toObject();
    if (responseData.colorData && responseData.colorData.sparse) {
      responseData.colorData.sparse = Object.fromEntries(progressDoc.colorData.sparse);
    }
    
    res.status(201).json(responseData);
  } catch (error) {
    console.error('保存进度错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 上传进度截图
router.post('/:pictureId/snapshot', upload.single('snapshot'), async (req, res) => {
  try {
    const pictureId = req.params.pictureId;
    const userId = req.body.userId;
    
    if (!userId) {
      return res.status(400).json({ error: '用户ID是必需的' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: '未提供截图文件' });
    }
    
    let progressDoc = await Progress.findOne({
      userId,
      pictureId
    });
    
    if (!progressDoc) {
      // 如果进度记录不存在，创建一个新的
      const picture = await Picture.findById(pictureId);
      if (!picture) {
        return res.status(404).json({ error: '图片不存在' });
      }
      
      progressDoc = new Progress({
        userId,
        pictureId,
        progress: 0,
        totalCells: picture.width * picture.height || 1000,
        coloredCells: 0
      });
    }
    
    // 更新截图信息
    progressDoc.snapshot = {
      imageUrl: `/uploads/snapshots/${req.file.filename}`,
      createdAt: new Date(),
      thumbnailUrl: `/uploads/snapshots/${req.file.filename}` // 可以生成缩略图
    };
    
    await progressDoc.save();
    
    res.status(200).json({
      success: true,
      snapshot: progressDoc.snapshot
    });
  } catch (error) {
    console.error('上传截图错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取进度
router.get('/:pictureId', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: '用户ID是必需的' });
    }
    
    const progress = await Progress.findOne({ 
      userId,
      pictureId: req.params.pictureId
    });
    
    if (!progress) {
      return res.status(404).json({ message: '进度不存在' });
    }
    
    // 转换 Map 为普通对象以便 JSON 序列化
    const responseData = progress.toObject();
    if (responseData.colorData && responseData.colorData.sparse) {
      responseData.colorData.sparse = Object.fromEntries(progress.colorData.sparse);
    }
    
    res.json(responseData);
  } catch (error) {
    console.error('获取进度错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取进度截图
router.get('/:pictureId/snapshot', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: '用户ID是必需的' });
    }
    
    const progress = await Progress.findOne({ 
      userId,
      pictureId: req.params.pictureId
    });
    
    if (!progress) {
      return res.status(404).json({ message: '进度不存在' });
    }
    
    if (!progress.snapshot || !progress.snapshot.imageUrl) {
      return res.status(404).json({ message: '截图不存在' });
    }
    
    res.json(progress.snapshot);
  } catch (error) {
    console.error('获取截图错误:', error);
    res.status(500).json({ error: error.message });
  }
});

// 管理员查看用户进度
router.get('/admin/:userId', async (req, res) => {
  try {
    const progress = await Progress.find({ userId: req.params.userId })
      .populate('pictureId')
      .sort('-lastSaved');
    
    // 转换所有记录中的 Map 为普通对象
    const responseData = progress.map(p => {
      const obj = p.toObject();
      if (obj.colorData && obj.colorData.sparse) {
        obj.colorData.sparse = Object.fromEntries(p.colorData.sparse);
      }
      return obj;
    });
    
    res.json(responseData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 