const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/ColoringLocalDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, '数据库连接错误：'));
db.once('open', () => {
  console.log('数据库连接成功！');
});

module.exports = db;