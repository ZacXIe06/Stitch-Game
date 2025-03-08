const request = require('supertest');
const { app, server } = require('../app');
const { connect, disconnect } = require('../db');
const { testAdmin, testUser } = require('./config');
const User = require('../models/User');
const Picture = require('../models/Picture');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('模块集成测试', () => {
  let adminToken, userToken;
  let testCategoryId, testPictureId;

  beforeAll(async () => {
    await connect();
    
    // 创建管理员和用户
    const hashedAdminPassword = await bcrypt.hash(testAdmin.password, 10);
    const admin = await User.create({
      ...testAdmin,
      password: hashedAdminPassword
    });
    
    const hashedUserPassword = await bcrypt.hash(testUser.password, 10);
    const user = await User.create({
      ...testUser,
      password: hashedUserPassword
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
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Picture.deleteMany({});
    await Category.deleteMany({});
    await Transaction.deleteMany({});
    await disconnect();
    server.close();
  });

  test('管理员创建分类和图片，用户购买并使用', async () => {
    // 1. 管理员创建分类
    const categoryResponse = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: '测试分类',
        description: '测试描述'
      });

    expect(categoryResponse.status).toBe(201);
    testCategoryId = categoryResponse.body._id;

    // 2. 管理员上传图片
    const pictureResponse = await request(app)
      .post('/api/admin/pictures')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('title', '测试图片')
      .field('categoryId', testCategoryId)
      .field('difficulty', 'easy')
      .attach('image', Buffer.from('fake-image'), 'test.jpg');

    expect(pictureResponse.status).toBe(201);
    testPictureId = pictureResponse.body._id;

    // 3. 用户购买金币
    const purchaseResponse = await request(app)
      .post('/api/user/coins/purchase')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        amount: 100,
        platform: 'ios'
      });

    expect(purchaseResponse.status).toBe(200);
    expect(purchaseResponse.body.balance).toBeGreaterThan(0);

    // 4. 用户使用工具
    const toolResponse = await request(app)
      .post('/api/user/tools/use')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        toolType: 'hint',
        pictureId: testPictureId
      });

    expect(toolResponse.status).toBe(200);
  });
}); 