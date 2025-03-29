const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// 导入模型
const User = require('./models/User');
const Category = require('./models/Category');
const Picture = require('./models/Picture');

const initializeDB = async () => {
    try {
        // 连接数据库
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB连接成功');

        // 创建管理员用户
        const adminExists = await User.findOne({ username: 'admin' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await User.create({
                username: 'admin',
                password: hashedPassword,
                email: 'admin@example.com',
                role: 'admin'
            });
            console.log('管理员用户创建成功');
        }

        // 创建示例分类
        const categoryExists = await Category.findOne({ name: '示例分类' });
        if (!categoryExists) {
            const category = await Category.create({
                name: '示例分类',
                description: '这是一个示例分类',
                order: 1
            });
            console.log('示例分类创建成功');

            // 创建示例图片
            const pictureExists = await Picture.findOne({ title: '示例图片' });
            if (!pictureExists) {
                await Picture.create({
                    title: '示例图片',
                    description: '这是一个示例图片',
                    category: category._id,
                    imageUrl: 'https://picsum.photos/400/400',
                    thumbnailUrl: 'https://picsum.photos/200/200',
                    difficulty: 'easy',
                    status: 'active'
                });
                console.log('示例图片创建成功');
            }
        }

        console.log('数据库初始化完成');
        process.exit(0);
    } catch (error) {
        console.error('数据库初始化失败:', error);
        process.exit(1);
    }
};

initializeDB(); 