const mongoose = require('mongoose');

const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true
    });
    console.log('Connected to MongoDB Atlas');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const disconnect = async () => {
  try {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('MongoDB disconnection error:', error);
  }
};

// 监听数据库连接事件
mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});

module.exports = { connect, disconnect };