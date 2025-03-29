const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log(`MongoDB连接成功: ${conn.connection.host}`);
        
        // 获取所有集合
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('\n数据库中的集合:');
        collections.forEach(collection => {
            console.log(`- ${collection.name}`);
        });
        
        // 获取每个集合的文档数量
        for (const collection of collections) {
            const count = await mongoose.connection.db.collection(collection.name).countDocuments();
            console.log(`${collection.name} 集合中有 ${count} 个文档`);
        }
        
        process.exit(0);
    } catch (error) {
        console.error(`MongoDB连接错误: ${error.message}`);
        process.exit(1);
    }
};

connectDB(); 