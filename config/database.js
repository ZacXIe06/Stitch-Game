const mongoose = require('mongoose');

// MongoDB连接配置
const connectDB = async () => {
    try {
        // 使用环境变量或默认值
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/coloring-game';
        
        const conn = await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 5000, // 5秒超时
            socketTimeoutMS: 45000,         // Socket超时
        });

        console.log(`MongoDB连接成功: ${conn.connection.host}`);
        
        // 监听连接事件
        mongoose.connection.on('connected', () => {
            console.log('MongoDB连接已建立，可以通过Compass访问');
        });

        mongoose.connection.on('error', (err) => {
            console.error('MongoDB连接错误:', err);
        });

        return conn;

    } catch (error) {
        console.error(`MongoDB连接错误: ${error.message}`);
        throw error;
    }
};

module.exports = connectDB; 