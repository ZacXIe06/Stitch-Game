const jwt = require('jsonwebtoken');

// 用户认证中间件
const authenticateUser = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: '请先登录' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded) {
      return res.status(401).json({ error: 'token无效' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error('认证错误:', error);
    res.status(401).json({ error: '认证失败: ' + error.message });
  }
};

// 验证管理员权限
const authorizeAdmin = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: '需要管理员权限' });
    }
    next();
  } catch (error) {
    res.status(401).json({ error: '认证失败' });
  }
};

module.exports = {
  authenticateUser,
  authorizeAdmin
}; 