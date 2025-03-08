const fs = require('fs');
const path = require('path');

const createTestImages = () => {
  // 确保目录存在
  const fixturesDir = path.join(__dirname, '../fixtures');
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  // 创建一个简单的 1x1 像素的 JPEG 图片
  const bannerImagePath = path.join(fixturesDir, 'test-banner.jpg');
  const pictureImagePath = path.join(fixturesDir, 'test-picture.jpg');

  // 最小的有效 JPEG 文件的二进制数据
  const minimalJpeg = Buffer.from([
    0xFF, 0xD8,                    // SOI marker
    0xFF, 0xE0, 0x00, 0x10,       // APP0 marker
    0x4A, 0x46, 0x49, 0x46, 0x00, // 'JFIF\0'
    0x01, 0x01,                    // version
    0x00,                          // units
    0x00, 0x01,                    // X density
    0x00, 0x01,                    // Y density
    0x00, 0x00                     // thumbnail
  ]);

  fs.writeFileSync(bannerImagePath, minimalJpeg);
  fs.writeFileSync(pictureImagePath, minimalJpeg);
};

module.exports = createTestImages;
