const mongoose = require('mongoose');

const experimentResultSchema = new mongoose.Schema({
  experimentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Experiment',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  variant: {
    type: String,
    required: true
  },
  metrics: [{
    name: String,
    value: Number,
    timestamp: Date
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ExperimentResult', experimentResultSchema); 