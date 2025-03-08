const fs = require('fs');

const content = `# 填色游戏 API 文档

> 版本：v1.0  
> 更新日期：2024-03-08  
> 作者：谢瑞翔

## 目录
- [用户系统](#用户系统)
  - [认证相关](#认证相关)
  - [用户信息](#用户信息)
- [图片系统](#图片系统)
  - [图片浏览](#图片浏览)
  - [进度管理](#进度管理)
- [支付系统](#支付系统)
  - [支付配置](#支付配置)
  - [支付处理](#支付处理)
  - [交易记录](#交易记录)

## 基础信息

- Base URL: \`http://your-api-domain.com\`
- 认证方式: Bearer Token
- 数据格式: JSON
- 开发环境: \`development\`

## 用户系统

### 认证相关

#### 用户注册
\`POST /api/auth/register\`

注册新用户并返回访问令牌

**请求参数**
\`\`\`json
{
    "email": "user@example.com",     // 邮箱
    "password": "password123",       // 密码
    "name": "User Name"             // 用户名
}
\`\`\`

**响应结果**
\`\`\`json
{
    "code": 200,
    "data": {
        "token": "eyJhbGciOiJ...",
        "user": {
            "id": "user_id",
            "email": "user@example.com",
            "name": "User Name"
        }
    }
}
\`\`\`

#### 用户登录
\`POST /api/auth/login\`

用户登录并获取访问令牌

**请求参数**
\`\`\`json
{
    "email": "user@example.com",     // 邮箱
    "password": "password123"        // 密码
}
\`\`\`

**响应结果**
\`\`\`json
{
    "code": 200,
    "data": {
        "token": "eyJhbGciOiJ...",
        "user": {
            "id": "user_id",
            "email": "user@example.com"
        }
    }
}
\`\`\`

### 用户信息

#### 获取用户信息
\`GET /api/user/profile\`

获取当前用户的基本信息

**响应结果**
\`\`\`json
{
    "code": 200,
    "data": {
        "id": "user_id",
        "email": "user@example.com",
        "name": "User Name",
        "coins": 100,
        "level": 1
    }
}
\`\`\`

#### 获取排行榜
\`GET /api/user/ranking\`

获取用户排行榜数据

**响应结果**
\`\`\`json
{
    "code": 200,
    "data": {
        "rankings": [
            {
                "userId": "user_id",
                "name": "User Name",
                "score": 1000,
                "rank": 1
            }
        ]
    }
}
\`\`\`

#### 获取金币历史
\`GET /api/user/coins/history\`

获取用户金币交易记录

**响应结果**
\`\`\`json
{
    "code": 200,
    "data": {
        "transactions": [
            {
                "id": "transaction_id",
                "amount": 100,
                "type": "earn",
                "description": "完成图片",
                "createdAt": "2024-03-08T12:00:00Z"
            }
        ]
    }
}
\`\`\`

#### 获取工具库存
\`GET /api/user/tools\`

获取用户的工具库存信息

**响应结果**
\`\`\`json
{
    "code": 200,
    "data": {
        "tools": [
            {
                "id": "tool_id",
                "name": "自动填充",
                "quantity": 5
            }
        ]
    }
}
\`\`\`

#### 获取成就列表
\`GET /api/user/achievements\`

获取用户已解锁的成就

**响应结果**
\`\`\`json
{
    "code": 200,
    "data": {
        "achievements": [
            {
                "id": "achievement_id",
                "name": "首次完成",
                "description": "完成第一张图片",
                "unlockedAt": "2024-03-08T12:00:00Z"
            }
        ]
    }
}
\`\`\`

## 图片系统

### 图片浏览

#### 获取图片列表
\`GET /api/pictures\`

获取图片列表，支持分页和筛选

**Query 参数**
\`\`\`
category    // 图片分类：animals, nature, cartoon...
difficulty  // 难度等级：easy, medium, hard
page        // 页码，默认 1
limit       // 每页数量，默认 10
\`\`\`

**响应结果**
\`\`\`json
{
    "code": 200,
    "data": {
        "pictures": [
            {
                "id": "picture_id",
                "title": "可爱的小猫",
                "imageUrl": "https://...",
                "category": "animals",
                "difficulty": "easy",
                "isLocked": false
            }
        ],
        "pagination": {
            "total": 100,
            "page": 1,
            "limit": 10
        }
    }
}
\`\`\`

#### 获取图片详情
\`GET /api/pictures/:id\`

获取单张图片的详细信息

**响应结果**
\`\`\`json
{
    "code": 200,
    "data": {
        "id": "picture_id",
        "title": "可爱的小猫",
        "imageUrl": "https://...",
        "category": "animals",
        "difficulty": "easy",
        "segments": [],
        "isLocked": false
    }
}
\`\`\`

#### 搜索图片
\`GET /api/pictures/search\`

搜索特定图片

**Query 参数**
\`\`\`
keyword     // 搜索关键词
\`\`\`

**响应结果**
\`\`\`json
{
    "code": 200,
    "data": {
        "pictures": [
            {
                "id": "picture_id",
                "title": "可爱的小猫",
                "imageUrl": "https://..."
            }
        ]
    }
}
\`\`\`

### 进度管理

#### 保存进度
\`POST /api/progress\`

保存绘画进度

**请求参数**
\`\`\`json
{
    "pictureId": "picture_id",
    "progress": 75,
    "timeSpent": 300,
    "coloredSegments": [
        {
            "segmentId": "1",
            "color": "#FF0000"
        }
    ]
}
\`\`\`

**响应结果**
\`\`\`json
{
    "code": 200,
    "data": {
        "id": "progress_id",
        "pictureId": "picture_id",
        "progress": 75,
        "timeSpent": 300,
        "updatedAt": "2024-03-08T12:00:00Z"
    }
}
\`\`\`

## 支付系统

### 支付配置

#### 获取支付配置
\`GET /api/payments/config\`

获取支付相关配置信息

**响应结果**
\`\`\`json
{
    "code": 200,
    "data": {
        "applePay": {
            "merchantId": "merchant.com.yourapp"
        },
        "googlePlay": {
            "packageName": "com.yourapp.package"
        }
    }
}
\`\`\`

### 支付处理

#### Apple Pay 支付
\`POST /api/payments/apple-pay\`

处理 Apple Pay 支付请求

**请求参数**
\`\`\`json
{
    "productId": "com.yourapp.coins100",
    "receipt": "base64_encoded_receipt"
}
\`\`\`

**响应结果**
\`\`\`json
{
    "code": 200,
    "data": {
        "transactionId": "ap_transaction_id",
        "status": "success"
    }
}
\`\`\`

#### Google Play 验证
\`POST /api/payments/google-play/verify\`

验证 Google Play 支付

**请求参数**
\`\`\`json
{
    "productId": "com.yourapp.coins100",
    "purchaseToken": "purchase_token"
}
\`\`\`

**响应结果**
\`\`\`json
{
    "code": 200,
    "data": {
        "transactionId": "gp_transaction_id",
        "status": "success"
    }
}
\`\`\`

### 交易记录

#### 获取交易历史
\`GET /api/transactions\`

获取用户的交易记录

**响应结果**
\`\`\`json
{
    "code": 200,
    "data": {
        "transactions": [
            {
                "id": "transaction_id",
                "type": "purchase",
                "amount": 100,
                "currency": "CNY",
                "status": "success",
                "createdAt": "2024-03-08T12:00:00Z"
            }
        ]
    }
}
\`\`\`

## 错误响应

当发生错误时，API 将返回对应的错误信息：

\`\`\`json
{
    "code": 400,
    "message": "Invalid parameters",
    "details": "Email is required"
}
\`\`\`

**常见错误码**
\`\`\`
400  // 请求参数错误
401  // 未认证或 token 过期
403  // 权限不足
404  // 资源不存在
500  // 服务器错误
\`\`\`

## 更新历史

### v1.0 - 2024-03-08
- 初始版本
- 完整的用户系统 API
- 完整的图片系统 API
- 完整的支付系统 API`;

fs.writeFileSync('api-docs.md', content, 'utf8');
console.log('API文档已成功写入！');
