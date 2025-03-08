const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const { authenticateUser } = require('../middleware/auth');

// 创建支付订单
router.post('/create-order', authenticateUser, async (req, res) => {
  try {
    console.log('创建订单请求:', req.body);
    console.log('用户信息:', req.user);  // 调试用
    const { productId, amount, platform } = req.body;
    
    if (!['ios', 'android'].includes(platform)) {
      throw new Error('不支持的支付平台');
    }
    
    const transaction = new Transaction({
      userId: req.user.userId,
      productId,
      amount,
      platform,
      paymentMethod: platform === 'ios' ? 'apple_pay' : 'google_play',
      orderId: `${platform}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    console.log('准备保存交易:', transaction);
    await transaction.save();
    console.log('交易保存成功');
    res.status(201).json({ orderId: transaction._id });
  } catch (error) {
    console.error('创建订单失败:', error);
    res.status(400).json({ error: error.message });
  }
});

// 获取交易历史
router.get('/transactions', authenticateUser, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.userId })
      .sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取订单状态
router.get('/orders/:orderId', authenticateUser, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.orderId);
    if (!transaction) {
      return res.status(404).json({ message: '订单不存在' });
    }
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Apple Pay回调处理
router.post('/callback/apple', async (req, res) => {
  try {
    const { orderId, status, transactionId } = req.body;
    const transaction = await Transaction.findByIdAndUpdate(
      orderId,
      { 
        status: status === 'success' ? 'completed' : 'failed',
        transactionId
      },
      { new: true }
    );
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 