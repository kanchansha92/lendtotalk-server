const ConnectionRequest = require("../models/ConnectionRequest");
const Notification = require("../models/Notification");
const User = require("../models/User");
/* ================= SEND REQUEST ================= */
exports.sendRequest = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { receiverId } = req.body;

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: "Receiver ID required",
      });
    }

    if (senderId === receiverId) {
      return res.status(400).json({
        success: false,
        message: "You cannot send request to yourself",
      });
    }

    const exists = await ConnectionRequest.findOne({
      sender: senderId,
      receiver: receiverId,
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Request already sent",
      });
    }

    // ✅ FREE USER CONNECTION LIMIT CHECK
    const sender = await User.findById(senderId).select("subscription");
    const isFreeUser = !sender?.subscription?.type || sender.subscription.type === "free";
    console.log("[LIMIT CHECK] senderId:", senderId, "| isFreeUser:", isFreeUser, "| subscription:", sender?.subscription?.type);
    if (isFreeUser) {
      // Count ALL non-rejected connections (pending + accepted) in both directions
      const connectionCount = await ConnectionRequest.countDocuments({
        $or: [
          { sender: senderId, status: { $in: ["pending", "accepted"] } },
          { receiver: senderId, status: { $in: ["pending", "accepted"] } },
        ],
      });
      console.log("[LIMIT CHECK] connectionCount (pending+accepted):", connectionCount, "| limit: 5");
      if (connectionCount >= 5) {
        console.log("[LIMIT CHECK] ❌ BLOCKED — limit reached");
        return res.status(403).json({
          success: false,
          connectionLimitReached: true,
          message:
            "You have reached the 5 connection limit for free accounts. Upgrade to connect with more people.",
        });
      }
      console.log("[LIMIT CHECK] ✅ ALLOWED — under limit");
    }

    await ConnectionRequest.create({
      sender: senderId,
      receiver: receiverId,
    });

    return res.status(201).json({
      success: true,
      message: "Request sent successfully",
    });
  } catch (error) {
    console.error("Send request error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};



/* ================= GET ALL NOTIFICATIONS ================= */
// exports.getNotifications = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     // Fetch all follow/unfollow notifications for the user
//     const notifications = await Notification.find({
//       receiver: userId,
//       type: { $in: ["follow", "unfollow"] },
//     })
//       .populate("sender", "name profilePicture bio")
//       .sort({ createdAt: -1 })
//       .limit(50); // Limit to last 50 notifications

//     return res.status(200).json({
//       success: true,
//       count: notifications.length,
//       data: notifications,
//     });
//   } catch (error) {
//     console.error("Get notifications error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const notifications = await Notification.find({
      receiver: userId,
      type: { $in: ["follow", "unfollow", "requestAccepted"] },
    })
      .populate("sender", "name profilePicture bio")
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ================= MARK NOTIFICATION AS READ ================= */
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    const notification = await Notification.findOne({
      _id: notificationId,
      receiver: userId,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    notification.read = true;
    await notification.save();

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Mark as read error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ================= ACCEPT REQUEST ================= */
// exports.acceptRequest = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { requestId } = req.params;

//     const request = await ConnectionRequest.findOne({
//       _id: requestId,
//       receiver: userId,
//       status: "pending",
//     });

//     if (!request) {
//       return res.status(404).json({
//         success: false,
//         message: "Request not found",
//       });
//     }

//     request.status = "accepted";
//     await request.save();

//     // FOLLOW NOTIFICATION
//     await Notification.create({
//       sender: request.sender,
//       receiver: userId,
//       type: "follow",
//       message: "started following you",
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Request accepted",
//     });

//   } catch (error) {
//     console.error("Accept request error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };
exports.acceptRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    const request = await ConnectionRequest.findOne({
      _id: requestId,
      receiver: userId,
      status: "pending",
    }).populate("sender receiver");

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    // Update status
    request.status = "accepted";
    await request.save();

    // ✅ Notify ORIGINAL SENDER (who sent request)
    await Notification.create({
      sender: userId, // person who accepted
      receiver: request.sender._id, // person who sent request
      type: "requestAccepted",
      message: `${request.receiver.name} accepted your connection request`,
    });

    return res.status(200).json({
      success: true,
      message: "Request accepted",
    });
  } catch (error) {
    console.error("Accept request error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ================= REJECT REQUEST ================= */
// exports.rejectRequest = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { requestId } = req.params;

//     const request = await ConnectionRequest.findOne({
//       _id: requestId,
//       receiver: userId,
//       status: "pending",
//     });

//     if (!request) {
//       return res.status(404).json({
//         success: false,
//         message: "Request not found",
//       });
//     }

//     request.status = "rejected";
//     await request.save();

//     // UNFOLLOW NOTIFICATION
//     await Notification.create({
//       sender: request.sender,
//       receiver: userId,
//       type: "unfollow",
//       message: "unfollowed you",
//     });

//     return res.status(200).json({
//       success: true,
//       message: "Request rejected",
//     });

//   } catch (error) {
//     console.error("Reject request error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// };


exports.rejectRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    const request = await ConnectionRequest.findOne({
      _id: requestId,
      receiver: userId,
      status: "pending",
    }).populate("sender receiver");

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    request.status = "rejected";
    await request.save();

    await Notification.create({
      sender: userId,
      receiver: request.sender._id,
      type: "unfollow",
      message: `${request.receiver.name} rejected your request`,
    });

    return res.status(200).json({
      success: true,
      message: "Request rejected",
    });
  } catch (error) {
    console.error("Reject request error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/* ================= GET INCOMING REQUESTS ================= */
exports.getIncomingRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const requests = await ConnectionRequest.find({
      receiver: userId,
      status: "pending",
    })
      .populate("sender", "name profilePicture bio")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error("Incoming requests error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


/* ================= GET ACCEPTED CONNECTIONS ================= */
exports.getAcceptedConnections = async (req, res) => {
  try {
    const userId = req.user.id;

    const connections = await ConnectionRequest.find({
      $or: [
        { sender: userId, status: "accepted" },
        { receiver: userId, status: "accepted" },
      ],
    })
      .populate("sender", "name profilePicture bio isCurrentlyOnline")
      .populate("receiver", "name profilePicture bio isCurrentlyOnline")
      .sort({ updatedAt: -1 });

    // Format to return the OTHER person's info
    const friends = connections.map((conn) => {
      const isSender = conn.sender._id.toString() === userId.toString();
      const person = isSender ? conn.receiver : conn.sender;
      return {
        _id: person._id,
        name: person.name,
        profilePicture: person.profilePicture,
        bio: person.bio,
        isCurrentlyOnline: person.isCurrentlyOnline,
      };
    });

    return res.status(200).json({
      success: true,
      count: friends.length,
      data: friends,
    });
  } catch (error) {
    console.error("Get accepted connections error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
