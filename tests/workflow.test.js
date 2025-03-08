const request = require('supertest');
const { app, server } = require('../app');
const { connect, disconnect } = require('../db');
const { testAdmin, testUser, testCategory, testPicture } = require('./config');
const User = require('../models/User');
const Picture = require('../models/Picture');
const Category = require('../models/Category');
const Progress = require('../models/Progress');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('系统功能总测试 - 版本2（完整工作流）', () => {
  let adminToken, userToken;
  let userId, categoryId, pictureId;

  beforeAll(async () => {
    await connect();
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
    test('用户注册流程', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: testUser.username,
          email: testUser.email,
          password: testUser.password
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      userToken = response.body.token;
      
      // 解析token获取userId
      const decoded = jwt.verify(userToken, process.env.JWT_SECRET);
      userId = decoded.userId;
    });

    test('用户登录流程', async () => {
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

    test('查看图片详情', async () => {
      // 需要先确保有图片存在
      const response = await request(app)
        .get(`/api/pictures/${pictureId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('x-client-key', process.env.APP_SECRET_KEY);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('title');
    });

    test('保存绘画进度', async () => {
      const response = await request(app)
        .post('/api/progress/save')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          userId,
          pictureId,
          coloringData: {
            colors: ['#FF0000', '#00FF00'],
            progress: 50
          }
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('coloringData');
    });

    test('完成图片', async () => {
      const response = await request(app)
        .post(`/api/pictures/${pictureId}/complete`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.isCompleted).toBe(true);
    });
  });

  // 2. 管理员完整流程测试
  describe('管理员完整流程', () => {
    test('管理员登录', async () => {
      // 先创建管理员账号
      const hashedPassword = await bcrypt.hash(testAdmin.password, 10);
      const admin = await User.create({
        ...testAdmin,
        password: hashedPassword
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testAdmin.email,
          password: testAdmin.password
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      adminToken = response.body.token;
    });

    test('创建分类', async () => {
      const response = await request(app)
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(testCategory);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      categoryId = response.body._id;
    });

    test('上传图片', async () => {
      const response = await request(app)
        .post('/api/admin/pictures')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', testPicture.title)
        .field('categoryId', categoryId)
        .field('difficulty', 'easy')
        .attach('image', Buffer.from('fake-image'), 'test.jpg');

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      pictureId = response.body._id;
    });

    test('管理图片状态', async () => {
      const response = await request(app)
        .put(`/api/admin/pictures/${pictureId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'inactive'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('inactive');
    });

    test('查看用户进度', async () => {
      const response = await request(app)
        .get(`/api/admin/progress/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('coloringData');
    });
  });

  // 3. 权限测试
  describe('权限控制测试', () => {
    test('普通用户访问管理接口', async () => {
      const response = await request(app)
        .get('/api/admin/categories')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    test('未登录用户访问受保护接口', async () => {
      const response = await request(app)
        .get('/api/pictures')
        .set('x-client-key', process.env.APP_SECRET_KEY);

      expect(response.status).toBe(401);
    });

    test('过期token测试', async () => {
      const expiredToken = jwt.sign(
        { userId: userId },
        process.env.JWT_SECRET,
        { expiresIn: '0s' }
      );

      const response = await request(app)
        .get('/api/pictures')
        .set('Authorization', `Bearer ${expiredToken}`)
        .set('x-client-key', process.env.APP_SECRET_KEY);

      expect(response.status).toBe(401);
    });
  });
}); 