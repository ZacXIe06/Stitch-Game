const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true, 
    index: true 
  },
  pictureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Picture',
    required: true
  },
  progress: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0
  },
  colorData: {
    type: Object,
    required: true
  },
  lastSaved: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Progress', progressSchema); 