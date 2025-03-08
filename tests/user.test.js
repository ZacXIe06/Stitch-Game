const request = require('supertest');
const { app, server } = require('../app');
const mongoose = require('mongoose');
const { testUser } = require('./config');
const User = require('../models/User');
const Achievement = require('../models/Achievement');
const bcrypt = require('bcryptjs');

describe('用户功能测试', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // 创建测试用户
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    const user = await User.create({
      email: testUser.email,
      password: hashedPassword,
      membership: {
        level: 'free',
        startDate: new Date(),
        endDate: null
      },
      coins: {
        balance: 100,
        transactions: []
      },
      tools: [
        { type: 'hint', count: 5 },
        { type: 'auto_fill', count: 3 }
      ]
    });
    userId = user._id;

    // 创建测试成就
    await Achievement.create({
      name: '完成新手教程',
      description: '完成所有新手引导步骤',
      type: 'completion',
      requirements: {
        type: 'tutorial',
        target: 1
      },
      rewards: {
        coins: 50,
        tools: [{ type: 'hint', count: 2 }]
      }
    });

    // 登录获取token
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });
    authToken = response.body.token;
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Achievement.deleteMany({});
    await mongoose.disconnect();
    server.close();
  });

  // 用户信息测试
  describe('用户信息', () => {
    test('获取用户资料', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('email', testUser.email);
      expect(response.body).toHaveProperty('membership');
      expect(response.body).toHaveProperty('coins');
      expect(response.body).toHaveProperty('tools');
    });
  });

  // 排行榜测试
  describe('排行榜', () => {
    test('获取全球排行榜', async () => {
      const response = await request(app)
        .get('/api/user/ranking')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ type: 'global' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('更新用户排名', async () => {
      const user = await User.findById(userId);
      await user.updateRanking(1000);

      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body.ranking.score).toBe(1000);
      expect(response.body.ranking).toHaveProperty('position');
    });
  });

  // 金豆系统测试
  describe('金豆系统', () => {
    test('购买金豆', async () => {
      const response = await request(app)
        .post('/api/user/coins/purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100,
          platform: 'ios'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('balance');
      expect(response.body.balance).toBeGreaterThan(100);
    });

    test('获取交易历史', async () => {
      const response = await request(app)
        .get('/api/user/coins/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('transactions');
      expect(response.body).toHaveProperty('balance');
      expect(response.body).toHaveProperty('pagination');
    });
  });

  // 工具系统测试
  describe('工具系统', () => {
    test('使用工具', async () => {
      const response = await request(app)
        .post('/api/user/tools/use')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          toolType: 'hint'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('toolCount');
      expect(response.body.toolCount).toBe(4); // 5 - 1
    });

    test('获取工具库存', async () => {
      const response = await request(app)
        .get('/api/user/tools')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.find(t => t.type === 'hint').count).toBe(4);
    });
  });

  // 会员系统测试
  describe('会员系统', () => {
    test('升级会员', async () => {
      const response = await request(app)
        .post('/api/user/membership/upgrade')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          level: 'premium',
          duration: 30 // 30天
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('level', 'premium');
      expect(response.body).toHaveProperty('startDate');
      expect(response.body).toHaveProperty('endDate');
    });
  });

  // 成就系统测试
  describe('成就系统', () => {
    test('获取成就列表', async () => {
      const response = await request(app)
        .get('/api/user/achievements')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('progress');
    });
  });
}); 