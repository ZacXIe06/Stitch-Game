// 支付平台配置：定义支付相关的常量和配置项
const paymentConfig = {
  // iOS端支付配置
  applePay: {
    merchantIdentifier: process.env.APPLE_MERCHANT_ID,
    merchantName: "填色游戏",
    supportedNetworks: ['visa', 'masterCard', 'amex', 'discover'],
    merchantCapabilities: ['supports3DS', 'supportsCredit', 'supportsDebit'],
    countryCode: 'CN',
    currencyCode: 'CNY'
  },
  
  // Android端商品配置
  googlePlay: {
    packageName: process.env.ANDROID_PACKAGE_NAME,
    products: {
      coins: {
        '100_coins': {
          id: 'com.yourapp.coins.100',
          type: 'inapp',
          amount: 100
        },
        '500_coins': {
          id: 'com.yourapp.coins.500',
          type: 'inapp',
          amount: 500
        }
      },
      membership: {
        'monthly': {
          id: 'com.yourapp.sub.monthly',
          type: 'subs',
          duration: 30
        },
        'yearly': {
          id: 'com.yourapp.sub.yearly',
          type: 'subs',
          duration: 365
        }
      }
    }
  }
};

module.exports = paymentConfig; 