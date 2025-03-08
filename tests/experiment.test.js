const request = require('supertest');
const { app, server } = require('../app');
const mongoose = require('mongoose');
const { testUser } = require('./config');
const User = require('../models/User');
const Experiment = require('../models/Experiment');
const ExperimentResult = require('../models/ExperimentResult');
const bcrypt = require('bcryptjs');

describe('实验功能测试', () => {
  let authToken;
  let testExperimentId;

  beforeAll(async () => {
    // 清理已存在的实验
    await Experiment.deleteMany({});
    await ExperimentResult.deleteMany({});

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
    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await User.deleteOne({ email: testUser.email });
    await Experiment.deleteOne({ _id: testExperimentId });
    await ExperimentResult.deleteMany({ experimentId: testExperimentId });
    await mongoose.connection.close();
    await server.close();
  });

  // AB测试
  describe('AB测试', () => {
    test('创建AB测试', async () => {
      const response = await request(app)
        .post('/api/experiments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'payment_button_test',
          type: 'ab_test',
          description: '测试不同支付按钮样式的转化率',
          status: 'active',
          variants: [
            { name: 'control', weight: 50, config: { buttonColor: 'blue' } },
            { name: 'variant_a', weight: 50, config: { buttonColor: 'green' } }
          ],
          metrics: [
            { name: 'click_rate', type: 'percentage', goal: 10 },
            { name: 'conversion_rate', type: 'percentage', goal: 5 }
          ]
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      testExperimentId = response.body._id;
    });

    test('获取用户实验变体', async () => {
      const response = await request(app)
        .get('/api/experiments/assignment')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ experimentName: 'payment_button_test' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('variant');
    });

    test('记录实验指标', async () => {
      const response = await request(app)
        .post('/api/experiments/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          experimentId: testExperimentId,
          metricName: 'click_rate',
          value: 1
        });

      expect(response.status).toBe(200);
    });
  });

  // 灰度发布
  describe('灰度发布', () => {
    test('创建灰度发布实验', async () => {
      const response = await request(app)
        .post('/api/experiments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'new_feature_rollout',
          type: 'gradual_rollout',
          description: '新功能灰度发布',
          status: 'active',
          variants: [
            { name: 'control', weight: 90 },
            { name: 'new_feature', weight: 10 }
          ]
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
    });

    test('检查用户是否在灰度范围内', async () => {
      const response = await request(app)
        .get('/api/experiments/rollout-check')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ featureName: 'new_feature_rollout' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('enabled');
    });
  });
}); 