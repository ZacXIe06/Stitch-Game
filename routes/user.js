const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Achievement = require('../models/Achievement');
const { authenticateUser } = require('../middleware/auth');

// 获取用户信息
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password')
      .populate('achievements.id');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取排行榜
router.get('/ranking', authenticateUser, async (req, res) => {
  try {
    const { type = 'global', page = 1, limit = 20 } = req.query;
    
    let query = {};
    if (type === 'friends') {
      // TODO: 实现好友系统后添加好友查询
      query = { _id: { $in: req.user.friends } };
    }
    
    const rankings = await User.find(query)
      .sort({ 'ranking.score': -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('nickname ranking');
      
    res.json(rankings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取金豆交易历史
router.get('/coins/history', authenticateUser, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const user = await User.findById(req.user.userId);
    
    const transactions = user.coins.transactions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice((page - 1) * limit, page * limit);
      
    res.json({
      balance: user.coins.balance,
      transactions,
      pagination: {
        total: user.coins.transactions.length,
        page: parseInt(page),
        pages: Math.ceil(user.coins.transactions.length / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取工具库存
router.get('/tools', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    res.json(user.tools);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取成就列表
router.get('/achievements', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('achievements.id');
      
    const allAchievements = await Achievement.find();
    
    const achievements = allAchievements.map(achievement => {
      const userAchievement = user.achievements
        .find(a => a.id.toString() === achievement._id.toString());
        
      return {
        ...achievement.toObject(),
        progress: userAchievement?.progress || 0,
        unlockedAt: userAchievement?.unlockedAt
      };
    });
    
    res.json(achievements);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 金豆相关
router.post('/coins/purchase', authenticateUser, async (req, res) => {
  try {
    const { amount, platform } = req.body;
    const user = await User.findById(req.user.userId);
    
    // 记录交易
    user.coins.transactions.push({
      type: 'earn',
      amount,
      reason: 'purchase',
      timestamp: new Date()
    });
    user.coins.balance += amount;
    
    // 记录支付
    user.payments.history.push({
      orderId: `ORD${Date.now()}`,
      platform,
      amount,
      status: 'completed'
    });
    
    await user.save();
    res.json({ balance: user.coins.balance });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 工具相关
router.post('/tools/use', authenticateUser, async (req, res) => {
  try {
    const { toolType } = req.body;
    const user = await User.findById(req.user.userId);
    
    const tool = user.tools.find(t => t.type === toolType);
    if (!tool || tool.count <= 0) {
      throw new Error('工具数量不足');
    }
    
    tool.count--;
    await user.save();
    
    res.json({ toolCount: tool.count });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 会员等级相关
router.post('/membership/upgrade', authenticateUser, async (req, res) => {
  try {
    const { level, duration } = req.body;
    const user = await User.findById(req.user.userId);
    
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + duration);
    
    user.membership = {
      level,
      startDate,
      endDate
    };
    
    await user.save();
    res.json(user.membership);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router; 