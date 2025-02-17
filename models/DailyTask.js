const mongoose = require('mongoose');

const dailyTaskSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  type: { type: String, required: true },
  target: { type: Number, required: true },
  progress: { type: Number, default: 0 },
  reward: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DailyTask', dailyTaskSchema); 