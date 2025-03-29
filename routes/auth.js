const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // 检查用户是否已存在
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: '用户名或邮箱已存在' });
    }

    // 创建新用户
    const user = new User({
      username,
      email,
      password // 密码会通过mongoose中间件自动加密
    });

    await user.save();

    // 生成token
    const token = jwt.sign(
      { userId: user._id, role: user.role || 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    console.log('Login attempt:', { email, username, password: '***' });  // 添加调试日志，不显示密码
    
    // 支持使用邮箱或用户名登录
    const query = {};
    if (email) {
      query.email = email;
    } else if (username) {
      query.username = username;
    } else {
      return res.status(400).json({ error: '请提供邮箱或用户名' });
    }
    
    const user = await User.findOne(query);
    
    if (!user) {
      console.log('User not found');  // 添加调试日志
      return res.status(401).json({ error: '邮箱或密码错误' });
    }
    
    const isValidPassword = await user.comparePassword(password);
    console.log('Password validation:', isValidPassword);  // 添加调试日志
    
    if (!isValidPassword) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    // 强制设置用户角色为管理员
    const userRole = 'admin';
    console.log('强制设置用户角色为管理员');
    
    // 如果需要，更新数据库中的用户角色
    if (user.role !== 'admin') {
      console.log('更新数据库中的用户角色为管理员');
      user.role = 'admin';
      await user.save();
    }

    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        username: user.username,
        role: userRole  // 使用强制设置的角色
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: userRole  // 使用强制设置的角色
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 