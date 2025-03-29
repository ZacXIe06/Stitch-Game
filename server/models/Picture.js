const mongoose = require('mongoose');

const pictureSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    thumbnailUrl: {
        type: String,
        required: true
    },
    difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard'],
        default: 'medium'
    },
    unlockType: {
        type: String,
        enum: ['free', 'coins', 'level'],
        default: 'free'
    },
    unlockValue: {
        type: Number,
        default: 0
    },
    completedCount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Picture', pictureSchema); 