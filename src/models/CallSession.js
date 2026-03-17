const mongoose = require('mongoose');

const callSessionSchema = new mongoose.Schema(
    {
        callId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        caller: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        receiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        callType: {
            type: String,
            enum: ['audio', 'video'],
            required: true,
        },
        status: {
            type: String,
            enum: ['initiated', 'ringing', 'ongoing', 'ended', 'missed', 'rejected', 'busy', 'failed'],
            default: 'initiated',
        },
        // Call timing
        initiatedAt: {
            type: Date,
            default: Date.now,
        },
        answeredAt: {
            type: Date,
        },
        endedAt: {
            type: Date,
        },
        duration: {
            type: Number, // in seconds
            default: 0,
        },
        // WebRTC connection details (optional, for debugging)
        connectionQuality: {
            type: String,
            enum: ['excellent', 'good', 'fair', 'poor'],
        },
        // End reason
        endReason: {
            type: String,
            enum: ['completed', 'caller_ended', 'receiver_ended', 'timeout', 'connection_failed', 'rejected', 'busy'],
        },
        // Related conversation
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Conversation',
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for performance
callSessionSchema.index({ caller: 1, createdAt: -1 });
callSessionSchema.index({ receiver: 1, createdAt: -1 });
callSessionSchema.index({ status: 1 });

// Method to answer call
callSessionSchema.methods.answer = async function () {
    this.status = 'ongoing';
    this.answeredAt = new Date();
    await this.save();
    return this;
};

// Method to end call
callSessionSchema.methods.end = async function (endReason = 'completed') {
    this.status = 'ended';
    this.endedAt = new Date();
    this.endReason = endReason;

    // Calculate duration if call was answered
    if (this.answeredAt) {
        this.duration = Math.floor((this.endedAt - this.answeredAt) / 1000);
    }

    await this.save();
    return this;
};

// Method to reject call
callSessionSchema.methods.reject = async function () {
    this.status = 'rejected';
    this.endedAt = new Date();
    this.endReason = 'rejected';
    await this.save();
    return this;
};

// Method to mark as missed
callSessionSchema.methods.markAsMissed = async function () {
    this.status = 'missed';
    this.endedAt = new Date();
    this.endReason = 'timeout';
    await this.save();
    return this;
};

// Static method to get call history for a user
callSessionSchema.statics.getHistory = async function (userId, limit = 50) {
    return this.find({
        $or: [{ caller: userId }, { receiver: userId }],
    })
        .populate('caller', 'firstName lastName profilePicture')
        .populate('receiver', 'firstName lastName profilePicture')
        .sort({ createdAt: -1 })
        .limit(limit);
};

module.exports = mongoose.model('CallSession', callSessionSchema);
