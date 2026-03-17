const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'
    },
    status: {
        type: String,
        enum: ['pending', 'success', 'failed'],
        default: 'pending'
    },
    plan: {
        type: String,
        enum: ['basic', 'premium', 'vip'],
        required: true
    },
    paymentGateway: {
        type: String,
        default: 'simulated'
    },
    transactionId: {
        type: String,
        unique: true,
        required: true
    },
    metadata: {
        type: Object,
        default: {}
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Transaction', TransactionSchema);
