const mongoose = require('mongoose');

const completionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    picture: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Picture',
        required: true
    },
    timeSpent: {
        type: Number,
        required: true
    },
    accuracy: {
        type: Number,
        required: true
    },
    coinsEarned: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Completion', completionSchema); 