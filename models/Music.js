const mongoose = require('mongoose');

const musicSchema = new mongoose.Schema({
  title: { type: String, required: true },
  artist: { type: String },
  category: { type: String, enum: ['background', 'effect', 'theme'] },
  url: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
  duration: Number,
  order: { type: Number, default: 0 }
});

module.exports = mongoose.model('Music', musicSchema); 