const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
    {
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
        ],
        // Conversation type (for future group chat support)
        type: {
            type: String,
            enum: ['private', 'group'],
            default: 'private',
        },
        // Group chat metadata (for future)
        groupName: {
            type: String,
        },
        groupAvatar: {
            type: String,
        },
        groupAdmin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        // Last message reference
        lastMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message',
        },
        lastMessageAt: {
            type: Date,
            default: Date.now,
        },
        // Unread count per participant
        unreadCount: {
            type: Map,
            of: Number,
            default: {},
        },
        // Muted status per participant
        mutedBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        // Archive status per participant
        archivedBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        // Clear history status per participant
        clearedAt: {
            type: Map,
            of: Date,
            default: {},
        },
        // Soft delete
        isDeleted: {
            type: Boolean,
            default: false,
        },
        // E2EE fields: List of encrypted symmetric keys for each participant
        encryptedSymmetricKeys: [
            {
                userId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },
                encryptedKey: {
                    type: String,
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

// Compound index to ensure unique conversations between participants
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });

// Method to increment unread count
conversationSchema.methods.incrementUnread = async function (userId) {
    const currentCount = this.unreadCount.get(userId.toString()) || 0;
    this.unreadCount.set(userId.toString(), currentCount + 1);
    await this.save();
    return this;
};

// Method to reset unread count
conversationSchema.methods.resetUnread = async function (userId) {
    this.unreadCount.set(userId.toString(), 0);
    await this.save();
    return this;
};

// Method to update last message
conversationSchema.methods.updateLastMessage = async function (messageId) {
    this.lastMessage = messageId;
    this.lastMessageAt = new Date();
    await this.save();
    return this;
};

// Static method to find or create conversation
conversationSchema.statics.findOrCreate = async function (participantIds) {
    // Sort participant IDs for consistent querying
    const sortedIds = participantIds.sort();

    let conversation = await this.findOne({
        participants: { $all: sortedIds, $size: sortedIds.length },
        type: 'private',
    });

    if (!conversation) {
        conversation = await this.create({
            participants: sortedIds,
            type: 'private',
        });
    }

    return conversation;
};

module.exports = mongoose.model('Conversation', conversationSchema);
