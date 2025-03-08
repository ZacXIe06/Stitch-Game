// 测试环境配置
module.exports = {
  testUser: {
    username: 'testuser',
    email: 'user@example.com',
    password: 'password123',
    role: 'user'
  },
  testAdmin: {
    username: 'admin',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin'
  },
  testProducts: {
    coins: {
      id: 'com.yourapp.coins.100',
      amount: 100
    },
    membership: {
      id: 'com.yourapp.sub.monthly',
      duration: 30
    }
  },
  testImage: {
    path: './tests/fixtures/test-image.jpg',
    title: '测试图片',
    category: 'test',
    tags: ['测试', '简单']
  },
  testCategory: {
    name: '测试分类',
    description: '这是一个测试分类',
    order: 1,
    status: 'active'
  },
  testPicture: {
    title: '测试图片',
    description: '这是一个测试图片',
    tags: ['test', 'new'],
    difficulty: 'easy',
    position: 1
  },
  testPayment: {
    amount: 100,
    currency: 'CNY',
    productId: 'test_product'
  }
}; 