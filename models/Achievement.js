const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  type: {
    type: String,
    enum: ['completion', 'collection', 'social', 'special'],
    required: true
  },
  requirements: {
    type: { type: String },
    target: Number,
    conditions: Object
  },
  rewards: {
    coins: Number,
    tools: [{
      type: String,
      count: Number
    }]
  },
  icon: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Achievement', achievementSchema); 