const request = require('supertest');
const { app, server } = require('../app');
const mongoose = require('mongoose');
const { testUser, testProducts } = require('./config');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const bcrypt = require('bcryptjs');

describe('支付功能测试', () => {
  let authToken;
  let testTransactionId;

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
    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await User.deleteOne({ email: testUser.email });
    await Transaction.deleteOne({ _id: testTransactionId });
    await mongoose.connection.close();
    await server.close();
  });

  // iOS支付测试
  describe('Apple Pay', () => {
    test('创建iOS订单', async () => {
      const response = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-client-key', process.env.APP_SECRET_KEY)
        .send({
          productId: testProducts.coins.id,
          amount: testProducts.coins.amount,
          platform: 'ios',
          orderId: `ios_${Date.now()}`,
          currency: 'CNY'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('orderId');
      testTransactionId = response.body.orderId;
    });

    test('验证支付结果', async () => {
      const response = await request(app)
        .post('/api/payments/apple-pay/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: testTransactionId,
          paymentData: {
            transactionId: 'test_transaction_id',
            paymentToken: 'test_payment_token',
            amount: testProducts.coins.amount,
            currency: 'CNY'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('completed');
    });
  });

  // Android支付测试
  describe('Google Play Billing', () => {
    test('获取商品列表', async () => {
      const response = await request(app)
        .get('/api/payments/google-play/products')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('coins');
      expect(response.body).toHaveProperty('membership');
    });

    test('创建Android订单', async () => {
      const response = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-client-key', process.env.APP_SECRET_KEY)
        .send({
          productId: testProducts.coins.id,
          amount: testProducts.coins.amount,
          platform: 'android'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('orderId');
    });

    test('验证购买凭证', async () => {
      const response = await request(app)
        .post('/api/payments/google-play/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          orderId: testTransactionId,
          purchaseToken: 'test_purchase_token',
          productId: testProducts.coins.id,
          packageName: process.env.ANDROID_PACKAGE_NAME
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('completed');
    });
  });

  // 交易记录测试
  test('获取交易历史', async () => {
    const response = await request(app)
      .get('/api/payments/transactions')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
}); 