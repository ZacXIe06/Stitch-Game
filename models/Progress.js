const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  level: { type: Number, default: 1 },
  coloringData: Object,
  lastSaved: Date,
  completedTutorials: [String]
});

module.exports = mongoose.model('Progress', progressSchema); 