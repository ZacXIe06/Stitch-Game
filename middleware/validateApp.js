const validateApp = (req, res, next) => {
  const clientKey = req.headers['x-client-key'];
  if (!clientKey || clientKey !== process.env.APP_SECRET_KEY) {
    return res.status(403).json({ message: '无效的应用密钥' });
  }
  next();
};

module.exports = validateApp; 