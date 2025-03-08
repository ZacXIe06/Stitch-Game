const express = require('express');
const router = express.Router();
const Experiment = require('../models/Experiment');
const ExperimentResult = require('../models/ExperimentResult');
const { authenticateUser } = require('../middleware/auth');

// 创建实验
router.post('/', authenticateUser, async (req, res) => {
  try {
    console.log('创建实验请求:', req.body);
    // 检查实验名称是否已存在
    const existingExperiment = await Experiment.findOne({ name: req.body.name });
    if (existingExperiment) {
      throw new Error('实验名称已存在');
    }

    const experiment = new Experiment(req.body);
    console.log('准备保存实验:', experiment);
    await experiment.save();
    res.status(201).json(experiment);
  } catch (error) {
    console.error('创建实验失败:', error);
    // 区分验证错误和其他错误
    if (error.name === 'ValidationError') {
      res.status(400).json({ error: '实验数据验证失败', details: error.message });
    } else if (error.code === 11000) {
      res.status(409).json({ error: '实验名称已存在' });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

// 获取用户的实验变体
router.get('/assignment', authenticateUser, async (req, res) => {
  try {
    console.log('获取变体请求:', req.query);
    const { experimentName } = req.query;
    const experiment = await Experiment.findOne({ 
      name: experimentName,
      status: 'active'
    });

    if (!experiment) {
      console.log('实验未找到:', experimentName);
      throw new Error('实验不存在或未激活');
    }

    // 根据用户ID和实验配置分配变体
    const userId = req.user.userId;
    console.log('用户ID:', userId);
    const hash = hashCode(userId + experimentName);
    const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
    const randomValue = Math.abs(hash % totalWeight);

    let accumulatedWeight = 0;
    let selectedVariant;
    for (const variant of experiment.variants) {
      accumulatedWeight += variant.weight;
      if (randomValue < accumulatedWeight) {
        selectedVariant = variant;
        break;
      }
    }

    if (!selectedVariant) {
      throw new Error('无法分配变体');
    }

    // 记录分配结果
    await ExperimentResult.findOneAndUpdate(
      { experimentId: experiment._id, userId },
      { variant: selectedVariant.name },
      { upsert: true }
    );

    res.json({ variant: selectedVariant });
  } catch (error) {
    console.error('获取变体失败:', error);
    res.status(400).json({ error: error.message });
  }
});

// 记录实验指标
router.post('/metrics', authenticateUser, async (req, res) => {
  try {
    const { experimentId, metricName, value } = req.body;
    const userId = req.user.userId;

    await ExperimentResult.findOneAndUpdate(
      { experimentId, userId },
      {
        $push: {
          metrics: {
            name: metricName,
            value,
            timestamp: new Date()
          }
        }
      }
    );

    res.json({ status: 'success' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 检查灰度发布状态
router.get('/rollout-check', authenticateUser, async (req, res) => {
  try {
    const { featureName } = req.query;
    const experiment = await Experiment.findOne({
      name: featureName,
      type: 'gradual_rollout',
      status: 'active'
    });

    if (!experiment) {
      return res.json({ enabled: false });
    }

    // 检查用户是否在灰度范围内
    const userId = req.user.userId;
    const hash = hashCode(userId + featureName);
    const rolloutPercentage = experiment.variants.find(v => v.name === 'new_feature')?.weight || 0;
    const enabled = (Math.abs(hash % 100) < rolloutPercentage);

    res.json({ enabled });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 检查用户是否在灰度范围内
router.get('/feature-flags', authenticateUser, async (req, res) => {
  try {
    const { features } = req.query;
    const featureList = features.split(',');
    
    const results = {};
    for (const feature of featureList) {
      const experiment = await Experiment.findOne({
        name: feature,
        type: 'gradual_rollout',
        status: 'active'
      });
      
      if (!experiment) {
        results[feature] = false;
        continue;
      }
      
      const userId = req.user.userId;
      const hash = hashCode(userId + feature);
      const rolloutPercentage = experiment.variants.find(v => v.name === 'enabled')?.weight || 0;
      results[feature] = (Math.abs(hash % 100) < rolloutPercentage);
    }
    
    res.json(results);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 辅助函数：生成哈希值
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

module.exports = router; 