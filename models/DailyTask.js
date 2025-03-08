const mongoose = require('mongoose');

const dailyTaskSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  type: { type: String, required: true },
  target: { type: Number, required: true },
  progress: { type: Number, default: 0 },
  reward: { type: Number, required: true },
  status: { type: String, enum: ['ongoing', 'completed'], default: 'ongoing' },
  createdAt: { type: Date, default: Date.now, index: true }
});

module.exports = mongoose.model('DailyTask', dailyTaskSchema); 