const mongoose = require('mongoose');

// 在所有测试开始前运行
beforeAll(async () => {
  // 使用测试数据库
  const dbName = 'coloring_game_test';
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
});

// 在所有测试结束后运行
afterAll(async () => {
  await mongoose.connection.close();
}); 