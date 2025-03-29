const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const connectDB = require('./config/database');
const User = require('./models/User');
const Category = require('./models/Category');
const Picture = require('./models/Picture');
const Completion = require('./models/Completion');

const app = express();
const port = process.env.PORT || 3000;

// 连接数据库
connectDB();

// 中间件
app.use(cors());
app.use(express.json());

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET;

// 身份验证中间件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: '未提供认证令牌' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: '认证令牌无效' });
        }
        req.user = user;
        next();
    });
};

// 登录路由
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const user = await User.findOne({ username });
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({ error: '权限不足' });
        }

        const token = jwt.sign(
            { userId: user._id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 仪表盘数据路由
app.get('/api/admin/dashboard', authenticateToken, async (req, res) => {
    try {
        const [
            totalCategories,
            totalPictures,
            totalUsers,
            totalCompletions
        ] = await Promise.all([
            Category.countDocuments(),
            Picture.countDocuments(),
            User.countDocuments(),
            Completion.countDocuments()
        ]);

        res.json({
            totalCategories,
            totalPictures,
            totalUsers,
            totalCompletions
        });
    } catch (error) {
        console.error('获取仪表盘数据错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 用户列表路由
app.get('/api/admin/users', authenticateToken, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        console.error('获取用户列表错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 分类列表路由
app.get('/api/admin/categories', authenticateToken, async (req, res) => {
    try {
        const categories = await Category.find();
        res.json(categories);
    } catch (error) {
        console.error('获取分类列表错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 图片列表路由
app.get('/api/admin/pictures', authenticateToken, async (req, res) => {
    try {
        const pictures = await Picture.find().populate('category');
        res.json(pictures);
    } catch (error) {
        console.error('获取图片列表错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 分类管理API
// 创建分类
app.post('/api/admin/categories', authenticateToken, async (req, res) => {
    try {
        const { name, description, order } = req.body;
        const category = await Category.create({
            name,
            description,
            order: order || 0
        });
        res.status(201).json(category);
    } catch (error) {
        console.error('创建分类错误:', error);
        if (error.code === 11000) { // MongoDB重复键错误
            return res.status(400).json({ error: '分类名称已存在' });
        }
        res.status(500).json({ error: '服务器错误' });
    }
});

// 更新分类
app.put('/api/admin/categories/:id', authenticateToken, async (req, res) => {
    try {
        const { name, description, order, status } = req.body;
        const category = await Category.findByIdAndUpdate(
            req.params.id,
            { name, description, order, status },
            { new: true, runValidators: true }
        );
        if (!category) {
            return res.status(404).json({ error: '分类不存在' });
        }
        res.json(category);
    } catch (error) {
        console.error('更新分类错误:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: '分类名称已存在' });
        }
        res.status(500).json({ error: '服务器错误' });
    }
});

// 删除分类
app.delete('/api/admin/categories/:id', authenticateToken, async (req, res) => {
    try {
        // 检查分类下是否有图片
        const pictureCount = await Picture.countDocuments({ category: req.params.id });
        if (pictureCount > 0) {
            return res.status(400).json({ error: '该分类下还有图片，无法删除' });
        }

        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) {
            return res.status(404).json({ error: '分类不存在' });
        }
        res.json({ message: '分类删除成功' });
    } catch (error) {
        console.error('删除分类错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 图片管理API
// 创建图片
app.post('/api/admin/pictures', authenticateToken, async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            imageUrl,
            thumbnailUrl,
            difficulty,
            unlockType,
            unlockValue
        } = req.body;

        // 验证分类是否存在
        const categoryExists = await Category.findById(category);
        if (!categoryExists) {
            return res.status(400).json({ error: '分类不存在' });
        }

        const picture = await Picture.create({
            title,
            description,
            category,
            imageUrl,
            thumbnailUrl,
            difficulty,
            unlockType,
            unlockValue
        });

        // 更新分类的图片数量
        await Category.findByIdAndUpdate(category, {
            $inc: { pictureCount: 1 }
        });

        res.status(201).json(picture);
    } catch (error) {
        console.error('创建图片错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 更新图片
app.put('/api/admin/pictures/:id', authenticateToken, async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            imageUrl,
            thumbnailUrl,
            difficulty,
            unlockType,
            unlockValue,
            status
        } = req.body;

        const picture = await Picture.findById(req.params.id);
        if (!picture) {
            return res.status(404).json({ error: '图片不存在' });
        }

        // 如果更改了分类
        if (category && category !== picture.category.toString()) {
            // 验证新分类是否存在
            const categoryExists = await Category.findById(category);
            if (!categoryExists) {
                return res.status(400).json({ error: '分类不存在' });
            }

            // 更新原分类和新分类的图片数量
            await Promise.all([
                Category.findByIdAndUpdate(picture.category, {
                    $inc: { pictureCount: -1 }
                }),
                Category.findByIdAndUpdate(category, {
                    $inc: { pictureCount: 1 }
                })
            ]);
        }

        const updatedPicture = await Picture.findByIdAndUpdate(
            req.params.id,
            {
                title,
                description,
                category,
                imageUrl,
                thumbnailUrl,
                difficulty,
                unlockType,
                unlockValue,
                status
            },
            { new: true, runValidators: true }
        ).populate('category');

        res.json(updatedPicture);
    } catch (error) {
        console.error('更新图片错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 删除图片
app.delete('/api/admin/pictures/:id', authenticateToken, async (req, res) => {
    try {
        const picture = await Picture.findById(req.params.id);
        if (!picture) {
            return res.status(404).json({ error: '图片不存在' });
        }

        // 检查是否有用户完成记录
        const completionCount = await Completion.countDocuments({ picture: req.params.id });
        if (completionCount > 0) {
            // 如果有完成记录，只将状态设置为inactive
            await Picture.findByIdAndUpdate(req.params.id, { status: 'inactive' });
            return res.json({ message: '图片已设置为不可用状态' });
        }

        // 如果没有完成记录，可以真正删除
        await Picture.findByIdAndDelete(req.params.id);
        
        // 更新分类的图片数量
        await Category.findByIdAndUpdate(picture.category, {
            $inc: { pictureCount: -1 }
        });

        res.json({ message: '图片删除成功' });
    } catch (error) {
        console.error('删除图片错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 用户管理API
// 获取用户详情
app.get('/api/admin/users/:id', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }
        res.json(user);
    } catch (error) {
        console.error('获取用户详情错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 更新用户
app.put('/api/admin/users/:id', authenticateToken, async (req, res) => {
    try {
        const { email, role, coins } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { email, role, coins },
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }
        res.json(user);
    } catch (error) {
        console.error('更新用户错误:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: '邮箱已被使用' });
        }
        res.status(500).json({ error: '服务器错误' });
    }
});

// 删除用户
app.delete('/api/admin/users/:id', authenticateToken, async (req, res) => {
    try {
        // 检查是否为管理员自己
        if (req.params.id === req.user.userId) {
            return res.status(400).json({ error: '不能删除自己的账号' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }

        // 检查是否有完成记录
        const completionCount = await Completion.countDocuments({ user: req.params.id });
        if (completionCount > 0) {
            // 如果有完成记录，不允许删除
            return res.status(400).json({ error: '该用户有游戏记录，无法删除' });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: '用户删除成功' });
    } catch (error) {
        console.error('删除用户错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 创建初始管理员账户
const createAdminUser = async () => {
    try {
        const adminExists = await User.findOne({ username: 'admin' });
        if (!adminExists) {
            await User.create({
                username: 'admin',
                password: 'admin123',
                email: 'admin@example.com',
                role: 'admin'
            });
            console.log('初始管理员账户创建成功');
        }
    } catch (error) {
        console.error('创建管理员账户错误:', error);
    }
};

// 启动服务器
app.listen(port, '0.0.0.0', () => {
    console.log(`API服务器运行在 http://0.0.0.0:${port}`);
    createAdminUser();
}); 