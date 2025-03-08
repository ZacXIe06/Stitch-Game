const request = require('supertest');
const { app, server } = require('../app');
const mongoose = require('mongoose');
const Picture = require('../models/Picture');
const { testUser, testPicture } = require('./config');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

describe('图片功能测试', () => {
  let authToken;
  let testPictureId;

  beforeAll(async () => {
    // 创建测试用户
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    await User.findOneAndUpdate(
      { email: testUser.email },
      { 
        email: testUser.email,
        password: hashedPassword
      },
      { upsert: true, new: true }
    );

    // 登录获取token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });
    console.log('登录响应:', loginResponse.body);
    authToken = loginResponse.body.token;

    if (!authToken) {
      throw new Error('登录失败，未获取到token');
    }

    // 确保数据库连接
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // 确保测试图片存在
    const fixturesDir = path.join(__dirname, 'fixtures');
    const imagePath = path.join(fixturesDir, 'test-image.png');
    
    // 打印当前目录结构
    console.log('当前工作目录:', process.cwd());
    console.log('测试目录:', __dirname);
    console.log('fixtures目录:', fixturesDir);
    console.log('目标图片路径:', imagePath);
    
    // 检查目录内容
    if (fs.existsSync(fixturesDir)) {
      console.log('fixtures目录内容:', fs.readdirSync(fixturesDir));
    }
    
    // 验证图片是否存在且可访问
    if (!fs.existsSync(imagePath)) {
      throw new Error(`测试图片不存在: ${imagePath}`);
    }

    // 检查图片文件
    try {
      const stats = fs.statSync(imagePath);
      console.log('图片文件信息:', {
        exists: true,
        size: stats.size,
        permissions: stats.mode,
        isFile: stats.isFile()
      });
    } catch (error) {
      console.error('图片文件检查失败:', error);
      throw error;
    }
  });

  afterAll(async () => {
    // 清理测试数据
    await User.deleteOne({ email: testUser.email });
    await Picture.deleteOne({ _id: testPictureId });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.connection.close();
    await server.close();
  });

  test('上传新图片', async () => {
    const maxRetries = 3;
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const imagePath = path.join(__dirname, 'fixtures/test-image.png');
        console.log(`尝试上传图片 (第${i + 1}次):`, {
          path: imagePath,
          exists: fs.existsSync(imagePath),
          size: fs.statSync(imagePath).size
        });

        const response = await request(app)
          .post('/api/pictures')
          .set('Authorization', `Bearer ${authToken}`)
          .set('x-client-key', process.env.APP_SECRET_KEY)
          .field('title', testPicture.title)
          .field('category', testPicture.category)
          .attach('image', imagePath)
          .timeout(60000);  // 增加超时时间到60秒

        console.log('上传响应:', response.body);
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('imageUrl');
        testPictureId = response.body._id;
        return;  // 成功后退出
      } catch (error) {
        console.error(`上传失败 (第${i + 1}次):`, {
          error: error.message,
          stack: error.stack,
          response: error.response?.body
        });
        lastError = error;
        await new Promise(resolve => setTimeout(resolve, 1000));  // 等待1秒后重试
      }
    }
    throw lastError;  // 所有重试都失败后抛出最后一个错误
  });

  test('获取图片列表', async () => {
    const response = await request(app)
      .get('/api/pictures')
      .set('x-client-key', process.env.APP_SECRET_KEY);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('获取单个图片', async () => {
    const response = await request(app)
      .get(`/api/pictures/${testPictureId}`)
      .set('x-client-key', process.env.APP_SECRET_KEY);

    expect(response.status).toBe(200);
    expect(response.body.title).toBe(testPicture.title);
  });
}); 