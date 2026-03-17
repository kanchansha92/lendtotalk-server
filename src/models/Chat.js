// models/Chat.js
const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    messages: [
      {
        sender: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        content: {
          type: String,
          required: true,
        },
        messageType: {
          type: String,
          enum: ['text', 'audio', 'video', 'image', 'file'],
          default: 'text',
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        isRead: {
          type: Boolean,
          default: false,
        },
      },
    ],
    lastMessage: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure unique chat between two participants
chatSchema.index({ participants: 1 }, { unique: true });

module.exports = mongoose.model('Chat', chatSchema);