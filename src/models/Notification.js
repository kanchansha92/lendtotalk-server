const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["follow", "unfollow", "like", "comment", "invite", "join","requestAccepted"],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    // Optional: For event-related notifications
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
notificationSchema.index({ receiver: 1, createdAt: -1 });
notificationSchema.index({ read: 1 });

module.exports = mongoose.model("Notification", notificationSchema);