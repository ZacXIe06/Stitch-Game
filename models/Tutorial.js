const mongoose = require('mongoose');

const tutorialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  order: { type: Number, required: true },
  type: { type: String, enum: ['basic', 'advanced'] }
});

module.exports = mongoose.model('Tutorial', tutorialSchema); 