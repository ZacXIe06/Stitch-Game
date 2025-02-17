// 引入必要的模块
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
require('dotenv').config();  // 在最上面添加这行
require('./db');

// 创建 Express 应用
const app = express();
app.use(express.json());
// 设置静态文件服务
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// 配置CORS，适用于移动应用
app.use(cors());  // 简单配置即可

// 引入图片模型
const Picture = require('./models/Picture');

// 引入新的模型
const Progress = require('./models/Progress');
const Tutorial = require('./models/Tutorial');
const DailyTask = require('./models/DailyTask');
const Music = require('./models/Music');

// 配置文件上传的存储设置
const storage = multer.diskStorage({
  // 设置文件存储目录
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  // 设置文件名格式：时间戳-原始文件名
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// API 路由部分
// 1. 基础路由 - 服务器状态检查
app.get('/', (req, res) => {
  res.send('填色游戏服务器运行中...');
});

// 2. 搜索功能 - 根据关键词搜索图片
// 使用方法：GET /api/pictures/search?keyword=关键词
app.get('/api/pictures/search', async (req, res) => {
  try {
    const { keyword } = req.query;
    const searchRegex = new RegExp(keyword, 'i'); // i 表示不区分大小写
    
    const pictures = await Picture.find({
      $or: [
        { title: searchRegex },    // 搜索标题
        { category: searchRegex }  // 搜索分类
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
    const picture = new Picture({
      title: req.body.title,
      category: req.body.category,
      imageUrl: `/uploads/${req.file.filename}`,
      isCompleted: false  // 新增图片默认未完成
    });
    await picture.save();
    res.status(201).json(picture);
  } catch (error) {
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
app.delete('/api/pictures/:id',async (req, res) => {
  try {
    const picture = await Picture.findByIdAndDelete(req.params.id);
    if (!picture) {
      return res.status(404).json({ message: '图片不存在' });
    }
    res.json({ message: '图片已删除' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 自动保存和进度恢复相关API
app.post('/api/progress/save', async (req, res) => {
  try {
    const { userId, level, coloringData } = req.body;
    let progress = await Progress.findOne({ userId });
    
    if (progress) {
      progress.level = level;
      progress.coloringData = coloringData;
      progress.lastSaved = new Date();
      await progress.save();
    } else {
      progress = new Progress({
        userId,
        level,
        coloringData,
        lastSaved: new Date()
      });
      await progress.save();
    }
    
    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/progress/:userId', async (req, res) => {
  try {
    const progress = await Progress.findOne({ userId: req.params.userId });
    res.json(progress || { level: 1, coloringData: null });
  } catch (error) {
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

// 添加更新图片完成状态的路由
app.post('/api/pictures/:id/complete', async (req, res) => {
  try {
    const picture = await Picture.findByIdAndUpdate(
      req.params.id,
      { isCompleted: true },
      { new: true }
    );
    if (!picture) {
      return res.status(404).json({ message: '图片不存在' });
    }
    res.json(picture);
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

const validateApp = (req, res, next) => {
  const clientKey = req.headers['x-client-key'];
  
  if (!clientKey || clientKey !== process.env.APP_SECRET_KEY) {
    return res.status(403).json({ message: '无效的应用密钥' });
  }
  
  next();
};

app.use('/api', validateApp);

// 启动服务器，监听指定端口
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});