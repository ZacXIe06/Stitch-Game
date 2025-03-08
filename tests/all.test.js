const request = require('supertest');
const { app, server } = require('../app');
const { connect, disconnect } = require('../db');
const { testAdmin, testUser, testCategory, testPicture } = require('./config');
const User = require('../models/User');
const Picture = require('../models/Picture');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const Experiment = require('../models/Experiment');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('系统功能总测试 - 版本1', () => {
  let adminToken, userToken;

  beforeAll(async () => {
    // 设置环境变量
    process.env.APP_SECRET_KEY = 'your-custom-secret-key-123456';
    process.env.JWT_SECRET = 'test-jwt-secret-123456';

    await connect();
    
    // 创建测试管理员和用户
    const admin = await User.create({
      ...testAdmin,
    });
    
    const user = await User.create({
      ...testUser,
    });

    // 生成令牌
    adminToken = jwt.sign(
      { userId: admin._id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET
    );
    
    userToken = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET
    );

    // 创建一个测试分类
    const category = await Category.create(testCategory);
    categoryId = category._id;
  }, 30000);  // 增加超时时间到 30 秒

  afterAll(async () => {
    await User.deleteMany({});
    await Picture.deleteMany({});
    await Category.deleteMany({});
    await Transaction.deleteMany({});
    await Experiment.deleteMany({});
    await disconnect();
    server.close();
  }, 30000);  // 增加超时时间到 30 秒

  // 1. 基础功能测试
  describe('基础功能', () => {
    test('服务器状态检查', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('填色游戏服务器运行中');
    });

    test('API密钥验证', async () => {
      const response = await request(app)
        .get('/api/pictures')
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-client-key', process.env.APP_SECRET_KEY);

      expect(response.status).toBe(200);
    });
  });

  // 2. 认证功能测试
  describe('认证功能', () => {
    test('用户注册', async () => {
      const newUser = {
        username: 'testuser2',
        email: 'test2@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(newUser);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
    });

    test('用户登录', async () => {
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

  // 3. 管理员功能测试
  describe('管理员功能', () => {
    let categoryId;

    test('创建分类', async () => {
      const uniqueCategory = {
        ...testCategory,
        name: `测试分类_${Date.now()}`  // 添加时间戳确保唯一性
      };
      
      const response = await request(app)
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-client-key', process.env.APP_SECRET_KEY)
        .set('Content-Type', 'application/json')
        .send(uniqueCategory);

      expect(response.status).toBe(201);
      categoryId = response.body._id;
    });

    test('上传图片', async () => {
      const response = await request(app)
        .post('/api/admin/pictures')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-client-key', process.env.APP_SECRET_KEY)
        .send({
          title: testPicture.title,
          categoryId: categoryId,
          difficulty: 'easy',
          imageUrl: 'test.jpg'
        });

      expect(response.status).toBe(201);
    });
  });

  // 4. 图片功能测试
  describe('图片功能', () => {
    test('获取图片列表', async () => {
      const response = await request(app)
        .get('/api/pictures')
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-client-key', process.env.APP_SECRET_KEY);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // 5. 支付功能测试
  describe('支付功能', () => {
    test('创建支付订单', async () => {
      const response = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-client-key', process.env.APP_SECRET_KEY)
        .send({
          productId: 'test_product',
          amount: 100,
          platform: 'ios'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('orderId');
    });
  });

  // 6. 实验功能测试
  describe('实验功能', () => {
    test('创建AB测试', async () => {
      const response = await request(app)
        .post('/api/experiments')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-client-key', process.env.APP_SECRET_KEY)
        .send({
          name: 'test_experiment',
          type: 'ab_test',
          variants: [
            { name: 'control', weight: 50 },
            { name: 'variant', weight: 50 }
          ]
        });

      expect(response.status).toBe(201);
    });
  });

  // 7. 权限测试
  describe('权限控制', () => {
    test('非管理员访问限制', async () => {
      const response = await request(app)
        .get('/api/admin/banners')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    test('未登录用户访问限制', async () => {
      const response = await request(app)
        .get('/api/admin/banners');

      expect(response.status).toBe(401);
    });
  });
}); 