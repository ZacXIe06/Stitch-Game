require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/coloring-game'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: '7d'
  },
  app: {
    secretKey: process.env.APP_SECRET_KEY
  },
  upload: {
    maxSize: 10 * 1024 * 1024, // 10MB
    types: {
      image: ['image/jpeg', 'image/png', 'image/gif'],
      audio: ['audio/mpeg', 'audio/wav', 'audio/ogg']
    }
  },
  payment: {
    applePay: {
      merchantId: process.env.APPLE_MERCHANT_ID,
      merchantName: '填色游戏'
    },
    googlePay: {
      packageName: process.env.ANDROID_PACKAGE_NAME,
      products: {
        coins_100: {
          id: 'com.game.coins.100',
          type: 'inapp',
          price: '￥6.00'
        }
      }
    }
  }
}; 