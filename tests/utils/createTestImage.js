const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// 创建一个200x200的测试图片
const canvas = createCanvas(200, 200);
const ctx = canvas.getContext('2d');

// 填充背景
ctx.fillStyle = '#f0f0f0';
ctx.fillRect(0, 0, 200, 200);

// 画一些图形
ctx.fillStyle = '#ff0000';
ctx.fillRect(50, 50, 100, 100);

// 保存图片
const buffer = canvas.toBuffer('image/png');
const imagePath = path.join(__dirname, '../fixtures/test-image.png');

// 确保目录存在
if (!fs.existsSync(path.dirname(imagePath))) {
  fs.mkdirSync(path.dirname(imagePath), { recursive: true });
}

fs.writeFileSync(imagePath, buffer);
console.log('测试图片已创建:', imagePath);

async function resizeTestImage() {
  const imagePath = path.join(__dirname, '../fixtures/test-image.png');
  await sharp(imagePath)
    .resize(200, 200)
    .toFile(path.join(__dirname, '../fixtures/test-image-small.png'));
}

module.exports = { resizeTestImage }; 