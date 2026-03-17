const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
    {
        conversationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Conversation',
            required: true,
            index: true,
        },
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        messageType: {
            type: String,
            enum: ['text', 'image', 'file', 'audio', 'video'],
            default: 'text',
            required: true,
        },
        content: {
            type: String,
            required: function () {
                return this.messageType === 'text';
            },
        },
        // For images and files
        fileUrl: {
            type: String,
            required: function () {
                return ['image', 'file', 'audio', 'video'].includes(this.messageType);
            },
        },
        fileName: {
            type: String,
        },
        fileSize: {
            type: Number, // in bytes
        },
        mimeType: {
            type: String,
        },
        // Cloudinary public_id for deletion
        cloudinaryPublicId: {
            type: String,
        },
        // Message status
        status: {
            type: String,
            enum: ['sent', 'delivered', 'read'],
            default: 'sent',
        },
        // Read by (for group chats in future)
        readBy: [
            {
                userId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },
                readAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        // Reply functionality
        replyTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message',
        },
        // Soft delete
        isDeleted: {
            type: Boolean,
            default: false,
        },
        deletedAt: {
            type: Date,
        },
        deletedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        // E2EE fields
        iv: {
            type: String,
        },
        isEncrypted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for performance
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, status: 1 });

// Virtual for checking if message is read
messageSchema.virtual('isRead').get(function () {
    return this.status === 'read';
});

// Method to mark as read
messageSchema.methods.markAsRead = async function (userId) {
    if (this.status !== 'read') {
        this.status = 'read';
        this.readBy.push({
            userId,
            readAt: new Date(),
        });
        await this.save();
    }
    return this;
};

// Method to soft delete
messageSchema.methods.softDelete = async function (userId) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = userId;
    await this.save();
    return this;
};

module.exports = mongoose.model('Message', messageSchema);
