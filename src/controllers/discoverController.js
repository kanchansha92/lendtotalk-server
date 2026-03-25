

const User = require("../models/User");
const ConnectionRequest = require("../models/ConnectionRequest");

/**
 * Helper function to get connection status for multiple users
 */
async function getConnectionStatuses(currentUserId, userIds) {
  const requests = await ConnectionRequest.find({
    $or: [
      { sender: currentUserId, receiver: { $in: userIds } },
      { sender: { $in: userIds }, receiver: currentUserId },
    ],
  }).select("sender receiver status");

  const statusMap = {};

  requests.forEach((req) => {
    if (req.sender.toString() === currentUserId.toString()) {
      // Current user sent the request
      statusMap[req.receiver.toString()] = req.status === "accepted" ? "accepted" : "pending";
    } else {
      // Current user received the request
      statusMap[req.sender.toString()] = req.status === "accepted" ? "accepted" : "pending";
    }
  });

  return statusMap;
}

/**
 * @desc    Get New People with connection status
 * @route   GET /api/discover/new-people
 * @access  Private
 */
exports.getNewPeople = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const users = await User.find({
      _id: { $ne: currentUserId },
      isActive: true,
      profileCompleted: true,
      profilePicture: { $ne: "" },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("name profilePicture city country createdAt");

    // Get connection statuses
    const userIds = users.map((u) => u._id);
    const statusMap = await getConnectionStatuses(currentUserId, userIds);

    res.json({
      success: true,
      data: users.map((u) => ({
        id: u._id,
        name: u.name,
        profilePicture: u.profilePicture,
        location: `${u.city}, ${u.country}`,
        joinedAt: u.createdAt,
        connectionStatus: statusMap[u._id.toString()] || "none",
      })),
    });
  } catch (error) {
    console.error("New People Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


exports.getUserProfile = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const userId = req.params.id;

    const user = await User.findById(userId).select(
      "name bio interests city country age profilePicture"
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check ANY connection (pending / accepted / rejected)
    const connection = await ConnectionRequest.findOne({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId },
      ],
    });

    let connectionStatus = "none";

    if (connection) {
      connectionStatus = connection.status; // pending | accepted | rejected
    }
    // ✅ ADD THIS BLOCK HERE
    // If rejected, treat as no connection (allow resend)
    if (connection?.status === "rejected") {
      connectionStatus = "none";
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        bio: user.bio,
        interests: user.interests,
        address: `${user.city}, ${user.country}`,
        age: user.age,
        profilePicture: user.profilePicture,

        // NEW
        connectionStatus,
      },
    });
  } catch (err) {
    console.error("Profile Fetch Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};




exports.getSuggestions = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    const page = Number(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const query = {
      _id: { $ne: currentUser._id },
      gender: currentUser.preferences.showMe === "everyone"
        ? { $in: ["male", "female"] }
        : currentUser.preferences.showMe,
      age: {
        $gte: currentUser.preferences.ageRange.min,
        $lte: currentUser.preferences.ageRange.max,
      },
      isActive: true,
      isBlocked: false,
      profileCompleted: true,
      profilePicture: { $ne: "" },
      city: currentUser.city, // Same city
    };

    // Filter by distance if user has location (within 40km)
    if (currentUser.location && currentUser.location.coordinates &&
      currentUser.location.coordinates[0] !== 0 && currentUser.location.coordinates[1] !== 0) {
      query.location = {
        $geoWithin: {
          $centerSphere: [currentUser.location.coordinates, 40 / 6378.1],
        },
      };
    }

    const users = await User.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .select("name profilePicture city state country createdAt isCurrentlyOnline lastActive subscription");

    const userIds = users.map((u) => u._id);
    const statusMap = await getConnectionStatuses(currentUser._id, userIds);

    // If current user has a subscription, sort VIP/subscribed users first
    const isCurrentUserSubscribed = currentUser.subscription?.type && currentUser.subscription.type !== 'free';
    let displayUsers = users;
    if (isCurrentUserSubscribed) {
      displayUsers = [...users].sort((a, b) => {
        const aIsVip = a.subscription?.type && a.subscription.type !== 'free' ? 1 : 0;
        const bIsVip = b.subscription?.type && b.subscription.type !== 'free' ? 1 : 0;
        return bIsVip - aIsVip; // VIP first
      });
    }

    res.json({
      success: true,
      page,
      data: displayUsers.map((u) => ({
        id: u._id,
        name: u.name,
        profilePicture: u.profilePicture,
        location: `${u.city}, ${u.country}`,
        joinedAt: u.createdAt,
        connectionStatus: statusMap[u._id.toString()] || "none",
        isOnline: u.isCurrentlyOnline,
        lastActive: u.lastActive,
        isVip: u.subscription?.type && u.subscription.type !== 'free'
      })),
    });
  } catch (error) {
    console.error("Suggestions Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
/**
 * @desc    Search Users with connection status
 * @route   GET /api/discover/search
 * @access  Private
 */
exports.searchUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { query } = req.query;

    if (!query || query.trim().length === 0) {
      return res.json({ success: true, data: [] });
    }

    const users = await User.find({
      _id: { $ne: currentUserId },
      isActive: true,
      $or: [
        { name: { $regex: query, $options: "i" } },
        { city: { $regex: query, $options: "i" } },
        { country: { $regex: query, $options: "i" } },
      ],
    })
      .limit(20)
      .select("name profilePicture city bio country createdAt");

    // Get connection statuses
    const userIds = users.map((u) => u._id);
    const statusMap = await getConnectionStatuses(currentUserId, userIds);

    res.json({
      success: true,
      data: users.map((u) => ({
        id: u._id,
        name: u.name,
        bio: u.bio,
        profilePicture: u.profilePicture,
        location: `${u.city}, ${u.country}`,
        joinedAt: u.createdAt,
        connectionStatus: statusMap[u._id.toString()] || "none",
      })),
    });
  } catch (error) {
    console.error("Search Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};