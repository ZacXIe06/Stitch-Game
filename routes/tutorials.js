const express = require('express');
const router = express.Router();
const Tutorial = require('../models/Tutorial');
const Progress = require('../models/Progress');

// 获取所有教程
router.get('/', async (req, res) => {
  try {
    const tutorials = await Tutorial.find().sort('order');
    res.json(tutorials);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 标记教程完成
router.post('/complete/:userId/:tutorialId', async (req, res) => {
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

module.exports = router; 