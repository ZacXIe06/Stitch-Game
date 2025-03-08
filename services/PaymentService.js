const { google } = require('googleapis');
const androidpublisher = google.androidpublisher('v3');
const paymentConfig = require('../config/payment');
const https = require('https');
const fs = require('fs');
const path = require('path');

// 支付服务：处理所有支付相关的业务逻辑
class PaymentService {
  constructor() {
    if (process.env.GOOGLE_PLAY_SERVICE_ACCOUNT) {
      this.initGooglePlayClient();
    }
    this.config = paymentConfig;
    // 读取 Apple Pay 证书和密钥
    if (process.env.APPLE_PAY_CERTIFICATE && process.env.APPLE_PAY_KEY) {
      this.appleCert = fs.readFileSync(process.env.APPLE_PAY_CERTIFICATE);
      this.appleKey = fs.readFileSync(process.env.APPLE_PAY_KEY);
    }
  }

  async initGooglePlayClient() {
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT,
        scopes: ['https://www.googleapis.com/auth/androidpublisher']
      });
      this.client = await auth.getClient();
      google.options({ auth: this.client });
    } catch (error) {
      console.warn('Google Play client initialization warning:', error.message);
      // 继续初始化其他功能
    }
  }

  // Apple Pay相关方法
  async validateApplePayMerchant(validationURL, merchantId, certificate) {
    try {
      // 验证商户ID
      if (merchantId !== this.config.applePay.merchantId) {
        throw new Error('Invalid merchant ID');
      }
      
      const validationData = {
        merchantIdentifier: merchantId,
        domainName: this.config.applePay.domainName,
        displayName: this.config.applePay.merchantName
      };

      const options = {
        method: 'POST',
        cert: this.appleCert,
        key: this.appleKey,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      return new Promise((resolve, reject) => {
        const req = https.request(validationURL, options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(JSON.parse(data)));
        });
        
        req.on('error', reject);
        req.write(JSON.stringify(validationData));
        req.end();
      });
    } catch (error) {
      console.error('Apple Pay merchant validation error:', error);
      throw error;
    }
  }

  async verifyApplePayment(paymentData) {
    try {
      const { transactionId, paymentMethod, amount, currency } = paymentData;
      
      if (!transactionId || !paymentMethod || !amount || !currency) {
        throw new Error('Missing required payment data');
      }
      
      const verificationEndpoint = `${this.config.applePay.verificationEndpoint}/${transactionId}`;
      
      const options = {
        method: 'POST',
        cert: this.appleCert,
        key: this.appleKey,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.applePay.secretKey}`
        }
      };

      const verificationResult = await new Promise((resolve, reject) => {
        const req = https.request(verificationEndpoint, options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(JSON.parse(data)));
        });
        
        req.on('error', reject);
        req.write(JSON.stringify(paymentData));
        req.end();
      });

      return {
        isValid: verificationResult.status === 'SUCCESS',
        transactionId,
        amount,
        currency
      };
    } catch (error) {
      console.error('Apple Pay verification error:', error);
      throw error;
    }
  }

  async processApplePayment(paymentData) {
    try {
      // 1. 验证支付数据
      const verificationResult = await this.verifyApplePayment(paymentData);
      if (!verificationResult.isValid) {
        throw new Error('Payment verification failed');
      }
      
      const { transactionId, amount, currency, productId } = paymentData;
      
      const paymentEndpoint = this.config.applePay.paymentEndpoint;
      
      const paymentResult = await new Promise((resolve, reject) => {
        const req = https.request(paymentEndpoint, {
          method: 'POST',
          cert: this.appleCert,
          key: this.appleKey,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.applePay.secretKey}`
          }
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(JSON.parse(data)));
        });
        
        req.on('error', reject);
        req.write(JSON.stringify({
          transactionId,
          amount,
          currency,
          productId
        }));
        req.end();
      });

      return {
        success: true,
        transactionId,
        orderId: paymentResult.orderId,
        amount,
        currency
      };
    } catch (error) {
      console.error('Apple Pay processing error:', error);
      throw error;
    }
  }

  // Google Play相关方法
  async verifyGooglePlayPurchase(packageName, productId, purchaseToken, productType) {
    // 验证包名是否匹配
    if (packageName !== this.config.googlePlay.packageName) {
      throw new Error('Invalid package name');
    }

    if (productType === 'inapp') {
      const purchase = await androidpublisher.purchases.products.get({
        packageName,
        productId,
        token: purchaseToken
      });
      return purchase.data;
    } else {
      const subscription = await androidpublisher.purchases.subscriptions.get({
        packageName,
        subscriptionId: productId,
        token: purchaseToken
      });
      return subscription.data;
    }
  }

  async handleSubscriptionChange(notificationType, purchaseToken) {
    // 实现订阅状态变更
  }
}

module.exports = new PaymentService(); 