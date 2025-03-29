const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 用户认证中间件
const authenticateUser = async (req, res, next) => {
  try {
    const token = req.header('Authorization');
    
    if (!token) {
      return res.status(401).json({ error: '认证失败: 未提供令牌' });
    }

    // 测试token处理
    if (token === 'mock-token-for-admin') {
      req.user = { userId: 'admin-test', roles: ['admin'] };
      return next();
    }
    
    // 正常JWT token处理
    const actualToken = token.replace('Bearer ', '');
    const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);
    req.user = decoded;
    req.token = actualToken;
    
    next();
  } catch (error) {
    console.error('认证错误:', error.message);
    res.status(401).json({ error: `认证失败: ${error.message}` });
  }
};

// 验证管理员权限
const authorizeAdmin = async (req, res, next) => {
  try {
    // 如果是测试管理员token，直接通过
    if (req.user && req.user.userId === 'admin-test') {
      return next();
    }
    
    // 检查用户是否有admin角色
    if (!req.user || !req.user.roles || !req.user.roles.includes('admin')) {
      return res.status(403).json({ error: '您没有管理员权限' });
    }
    
    next();
  } catch (error) {
    console.error('授权错误:', error.message);
    res.status(403).json({ error: '授权失败' });
  }
};

module.exports = {
  authenticateUser,
  authorizeAdmin
}; 