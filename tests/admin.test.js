const request = require('supertest');
const { app, server } = require('../app');
const { connect, disconnect } = require('../db');
const { testAdmin, testCategory, testPicture, testUser } = require('./config');
const User = require('../models/User');
const Banner = require('../models/Banner');
const Category = require('../models/Category');
const Picture = require('../models/Picture');
const bcrypt = require('bcryptjs');
const path = require('path');
const jwt = require('jsonwebtoken');

describe('管理员功能测试', () => {
  let adminToken;
  let userToken;  // 在顶层定义 userToken
  
  beforeAll(async () => {
    await connect();
  });

  beforeEach(async () => {
    // 清理所有测试数据
    await User.deleteMany({});
    await Banner.deleteMany({});
    await Category.deleteMany({});
    await Picture.deleteMany({});

    // 创建测试管理员
    const hashedPassword = await bcrypt.hash(testAdmin.password, 10);
    const admin = await User.create({
      username: testAdmin.username,
      email: testAdmin.email,
      password: hashedPassword,
      role: testAdmin.role
    });

    // 生成管理员 token
    adminToken = jwt.sign(
      { 
        userId: admin._id.toString(),
        email: admin.email,
        role: admin.role
      },
      process.env.JWT_SECRET
    );

    // 创建普通用户
    const hashedPasswordUser = await bcrypt.hash(testUser.password, 10);
    const user = await User.create({
      username: testUser.username,
      email: testUser.email,
      password: hashedPasswordUser,
      role: testUser.role
    });

    // 生成普通用户的 token
    userToken = jwt.sign(
      { 
        userId: user._id.toString(),
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET
    );

    // 打印调试信息
    console.log('Generated admin token:', adminToken);
    console.log('Generated user token:', userToken);
  });

  afterAll(async () => {
    // 清理所有数据
    await User.deleteMany({});
    await Banner.deleteMany({});
    await Category.deleteMany({});
    await Picture.deleteMany({});
    // 关闭连接
    await disconnect();
    server.close();
  });

  describe('Banner管理', () => {
    test('创建Banner', async () => {
      const testImage = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, // JPEG SOI marker
        0x00, 0x10, 'JFIF', 0x00, // JFIF marker
        0x01, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, // JFIF parameters
        0x00, 0x00,
        0xFF, 0xD9 // JPEG EOI marker
      ]);

      const response = await request(app)
        .post('/api/admin/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', '测试Banner')
        .field('link', 'https://example.com')
        .field('position', 1)
        .attach('image', testImage, {
          filename: 'test-banner.jpg',
          contentType: 'image/jpeg'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body.image).toHaveProperty('url');
      expect(response.body.image).toHaveProperty('publicId');
    });

    test('获取Banner列表', async () => {
      const response = await request(app)
        .get('/api/admin/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    test('更新Banner排序', async () => {
      // 先创建一个Banner
      const banner = await Banner.create({
        title: '测试Banner',
        image: {
          url: 'test.jpg',
          publicId: 'test'
        },
        link: 'https://example.com',
        position: 1
      });

      const response = await request(app)
        .put('/api/admin/sort/banners')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [
            { id: banner._id, position: 2 }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    });
  });

  // 分类管理测试
  describe('分类管理', () => {
    let testCategoryId;

    beforeEach(async () => {
      // 在每个测试前创建一个测试分类
      const category = await Category.create({
        name: testCategory.name,
        description: testCategory.description,
        position: testCategory.position
      });
      testCategoryId = category._id;
    });

    test('创建分类', async () => {
      const response = await request(app)
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '新测试分类',
          description: '这是一个新的测试分类',
          position: 2
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
    });

    test('获取分类树', async () => {
      const response = await request(app)
        .get('/api/admin/categories/tree')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('更新分类', async () => {
      const response = await request(app)
        .put(`/api/admin/categories/${testCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '更新后的分类',
          position: 2
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('更新后的分类');
    });

    test('删除分类', async () => {
      const response = await request(app)
        .delete(`/api/admin/categories/${testCategoryId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');

      // 验证分类已被删除
      const deletedCategory = await Category.findById(testCategoryId);
      expect(deletedCategory).toBeNull();
    });
  });

  // 图片管理测试
  describe('图片管理', () => {
    let testCategoryId;
    let testPictureId;

    beforeEach(async () => {
      // 创建测试分类
      const category = await Category.create({
        name: testCategory.name,
        description: testCategory.description,
        position: testCategory.position
      });
      testCategoryId = category._id;
    });

    test('上传图片', async () => {
      // 创建测试图片数据
      const testImage = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, // JPEG SOI marker
        0x00, 0x10, 'JFIF', 0x00, // JFIF marker
        0x01, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, // JFIF parameters
        0x00, 0x00,
        0xFF, 0xD9 // JPEG EOI marker
      ]);

      const response = await request(app)
        .post('/api/admin/pictures')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('title', testPicture.title)
        .field('description', testPicture.description)
        .field('categoryId', testCategoryId.toString())
        .field('tags', testPicture.tags.join(','))
        .field('difficulty', testPicture.difficulty)
        .field('position', testPicture.position)
        .attach('image', testImage, {
          filename: 'test-picture.jpg',
          contentType: 'image/jpeg'
        });

      // 如果测试失败，输出错误信息
      if (response.status !== 201) {
        console.error('Upload picture failed:', response.body);
      }

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('_id');
      expect(response.body.image).toHaveProperty('url');
      expect(response.body.image).toHaveProperty('publicId');
      testPictureId = response.body._id;
    });

    test('获取图片列表（带筛选和分页）', async () => {
      // 先创建一个测试图片
      const picture = await Picture.create({
        title: testPicture.title,
        description: testPicture.description,
        category: testCategoryId,
        tags: testPicture.tags,
        difficulty: testPicture.difficulty,
        position: testPicture.position,
        image: {
          url: 'http://test-url.com/test-image.jpg',
          publicId: 'test-public-id'
        }
      });

      const response = await request(app)
        .get('/api/admin/pictures')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({
          category: testCategoryId.toString(),
          tags: testPicture.tags[0],
          difficulty: testPicture.difficulty,
          page: 1,
          limit: 20
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('pictures');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pictures).toHaveLength(1);
      expect(response.body.pictures[0].title).toBe(testPicture.title);
    });

    test('更新图片排序', async () => {
      // 先创建一个测试图片
      const picture = await Picture.create({
        title: testPicture.title,
        description: testPicture.description,
        category: testCategoryId,
        tags: testPicture.tags,
        difficulty: testPicture.difficulty,
        position: testPicture.position,
        image: {
          url: 'http://test-url.com/test-image.jpg',
          publicId: 'test-public-id'
        }
      });

      const response = await request(app)
        .put('/api/admin/sort/pictures')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [
            { id: picture._id, position: 2 }
          ]
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');

      // 验证排序是否更新
      const updatedPicture = await Picture.findById(picture._id);
      expect(updatedPicture.position).toBe(2);
    });
  });

  // 权限测试
  describe('权限控制', () => {
    test('非管理员无法访问Banner管理接口', async () => {
      const response = await request(app)
        .get('/api/admin/banners')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    test('非管理员无法访问分类管理接口', async () => {
      const response = await request(app)
        .get('/api/admin/categories/tree')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    test('非管理员无法访问图片管理接口', async () => {
      const response = await request(app)
        .get('/api/admin/pictures')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    test('未登录用户无法访问管理接口', async () => {
      const response = await request(app)
        .get('/api/admin/banners');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('管理员可以访问所有管理接口', async () => {
      const responses = await Promise.all([
        request(app)
          .get('/api/admin/banners')
          .set('Authorization', `Bearer ${adminToken}`),
        request(app)
          .get('/api/admin/categories/tree')
          .set('Authorization', `Bearer ${adminToken}`),
        request(app)
          .get('/api/admin/pictures')
          .set('Authorization', `Bearer ${adminToken}`)
      ]);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
}); 