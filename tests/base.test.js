const request = require('supertest');
const { app, server } = require('../app');
const mongoose = require('mongoose');

describe('基础功能测试', () => {
  // 测试前的设置
  beforeAll(async () => {
    // 确保数据库连接
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
      // 等待连接完成
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });

  // 测试后的清理
  afterAll(async () => {
    // 确保所有操作完成
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.connection.close();
    await server.close();
  });

  // 服务器状态测试
  test('服务器状态检查', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toContain('填色游戏服务器运行中');
  });

  // 数据库连接测试
  test('数据库连接检查', () => {
    expect(mongoose.connection.readyState).toBe(1);
  });

  // API密钥验证测试
  test('API密钥验证', async () => {
    const response = await request(app)
      .get('/api/pictures')
      .set('x-client-key', process.env.APP_SECRET_KEY);
    expect(response.status).not.toBe(403);
  });

  // 无效API密钥测试
  test('无效API密钥', async () => {
    const response = await request(app)
      .get('/api/pictures')
      .set('x-client-key', 'invalid-key');
    expect(response.status).toBe(403);
  });
}); 