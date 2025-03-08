// models/Picture.js
const mongoose = require('mongoose');

const pictureSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, required: true, index: true },
  imageUrl: { type: String, required: true },
  thumbnailUrl: { type: String },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'] },
  tags: [String],
  isCompleted: { type: Boolean, default: false, index: true },
  completedCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Picture', pictureSchema);