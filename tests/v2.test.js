const request = require('supertest');
const { app, server } = require('../app');
const { connect, disconnect } = require('../db');
const { testAdmin, testUser, testCategory, testPicture } = require('./config');
const User = require('../models/User');
const Picture = require('../models/Picture');
const Category = require('../models/Category');
const Progress = require('../models/Progress');
const jwt = require('jsonwebtoken');

describe('系统功能总测试 - 版本2', () => {
  let adminToken, userToken, expiredToken;
  let userId, pictureId, categoryId;

  beforeAll(async () => {
    // 设置环境变量
    process.env.APP_SECRET_KEY = 'your-custom-secret-key-123456';
    process.env.JWT_SECRET = 'test-jwt-secret-123456';

    await connect();
    
    // 创建测试用户
    const user = await User.create(testUser);
    userId = user._id;

    // 创建测试管理员
    const admin = await User.create(testAdmin);

    // 生成令牌
    adminToken = jwt.sign(
      { userId: admin._id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET
    );
    
    userToken = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET
    );

    // 生成过期token
    expiredToken = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '0s' }
    );
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Picture.deleteMany({});
    await Category.deleteMany({});
    await Progress.deleteMany({});
    await disconnect();
    server.close();
  });

  // 1. 用户完整流程测试
  describe('用户完整流程', () => {
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

    test('浏览图片列表', async () => {
      const response = await request(app)
        .get('/api/pictures')
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-client-key', process.env.APP_SECRET_KEY);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    // 先创建测试图片
    beforeAll(async () => {
      // 先创建分类
      const category = await Category.create({
        name: 'Test Category',
        description: 'Test Description'
      });
      categoryId = category._id;

      // 然后创建图片
      const picture = await Picture.create({
        title: 'Test Picture',
        category: categoryId,
        imageUrl: 'http://test-url.com/test-image.jpg',
        thumbnailUrl: 'http://test-url.com/test-thumbnail.jpg'
      });
      pictureId = picture._id;
    });

    test('保存和获取绘画进度', async () => {
      const progress = {
        pictureId: pictureId,
        progress: 50,
        colorData: { 
          areas: [{ id: 1, color: '#FF0000' }],
          version: '1.0'
        }
      };

      const saveResponse = await request(app)
        .post('/api/progress')
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-client-key', process.env.APP_SECRET_KEY)
        .send(progress);

      expect(saveResponse.status).toBe(201);

      // 然后获取进度
      const getResponse = await request(app)
        .get(`/api/progress/${pictureId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-client-key', process.env.APP_SECRET_KEY);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.progress).toBe(50);
    });

    test('完成图片', async () => {
      const response = await request(app)
        .post(`/api/pictures/${pictureId}/complete`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-client-key', process.env.APP_SECRET_KEY);

      expect(response.status).toBe(200);
      expect(response.body.isCompleted).toBe(true);
    });

    describe('支付功能', () => {
      let orderId;
      
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
        orderId = response.body.orderId;
      });

      test('查询订单状态', async () => {
        const response = await request(app)
          .get(`/api/payments/orders/${orderId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .set('x-client-key', process.env.APP_SECRET_KEY);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status');
      });

      test('获取支付配置', async () => {
        const response = await request(app)
          .get('/api/payments/config')
          .set('Authorization', `Bearer ${userToken}`)
          .set('x-client-key', process.env.APP_SECRET_KEY);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('applePay');
        expect(response.body).toHaveProperty('googlePay');
      });

      test('查看交易历史', async () => {
        const response = await request(app)
          .get('/api/transactions')
          .set('Authorization', `Bearer ${userToken}`)
          .set('x-client-key', process.env.APP_SECRET_KEY);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });

      test('支付回调处理', async () => {
        const response = await request(app)
          .post('/api/payments/callback/apple')
          .set('x-client-key', process.env.APP_SECRET_KEY)
          .send({
            orderId: orderId,
            status: 'success',
            transactionId: 'test_transaction_123'
          });

        expect(response.status).toBe(200);
        
        // 验证订单状态已更新
        const orderResponse = await request(app)
          .get(`/api/payments/orders/${orderId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .set('x-client-key', process.env.APP_SECRET_KEY);

        expect(orderResponse.body.status).toBe('completed');
      });
    });
  });

  // 2. 管理员完整流程测试
  describe('管理员完整流程', () => {
    test('管理员登录', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testAdmin.email,
          password: testAdmin.password
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
    });

    test('创建分类', async () => {
      const response = await request(app)
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-client-key', process.env.APP_SECRET_KEY)
        .send({
          name: `测试分类_${Date.now()}`,
          description: '这是一个测试分类',
          order: 1
        });

      expect(response.status).toBe(201);
      categoryId = response.body._id;
    });

    test('上传图片', async () => {
      const response = await request(app)
        .post('/api/admin/pictures')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-client-key', process.env.APP_SECRET_KEY)
        .send({
          title: '测试图片',
          categoryId: categoryId,
          difficulty: 'easy',
          imageUrl: 'test.jpg'
        });

      expect(response.status).toBe(201);
      pictureId = response.body._id;
    });

    test('查看用户进度', async () => {
      const response = await request(app)
        .get(`/api/admin/progress/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('x-client-key', process.env.APP_SECRET_KEY);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // 3. 权限测试
  describe('权限控制', () => {
    test('普通用户访问管理接口', async () => {
      const response = await request(app)
        .get('/api/admin/progress/123')
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-client-key', process.env.APP_SECRET_KEY);

      expect(response.status).toBe(403);
    });

    test('未登录用户访问受保护接口', async () => {
      const response = await request(app)
        .get('/api/pictures');

      expect(response.status).toBe(401);
    });

    test('使用过期token', async () => {
      const response = await request(app)
        .get('/api/pictures')
        .set('Authorization', `Bearer ${expiredToken}`)
        .set('x-client-key', process.env.APP_SECRET_KEY);

      expect(response.status).toBe(401);
    });
  });
}); 