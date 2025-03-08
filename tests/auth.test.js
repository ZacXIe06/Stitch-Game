const request = require('supertest');
const { app, server } = require('../app');
const mongoose = require('mongoose');
const User = require('../models/User');
const { testUser } = require('./config');

describe('认证功能测试', () => {
  beforeAll(async () => {
    // 清理测试用户
    await User.deleteOne({ email: testUser.email });
    // 确保数据库连接
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });

  afterAll(async () => {
    // 清理测试数据
    await User.deleteOne({ email: testUser.email });
    // 确保所有操作完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.connection.close();
    await server.close();
  });

  test('注册新用户', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user.email).toBe(testUser.email);
  });

  test('登录用户', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });
}); 