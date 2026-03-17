const User = require('../models/User');
const Report = require('../models/Report');

/**
 * Block a user
 */
exports.blockUser = async (req, res) => {
    try {
        const userId = req.user._id;
        const { targetUserId } = req.params;

        if (userId.toString() === targetUserId) {
            return res.status(400).json({ success: false, message: "You cannot block yourself" });
        }

        const user = await User.findById(userId);
        if (!user.blockedUsers.includes(targetUserId)) {
            user.blockedUsers.push(targetUserId);
            await user.save();
        }

        res.json({ success: true, message: "User blocked successfully" });
    } catch (error) {
        console.error("Block user error:", error);
        res.status(500).json({ success: false, message: "Failed to block user" });
    }
};

/**
 * Unblock a user
 */
exports.unblockUser = async (req, res) => {
    try {
        const userId = req.user._id;
        const { targetUserId } = req.params;

        const user = await User.findById(userId);
        user.blockedUsers = user.blockedUsers.filter(
            (id) => id.toString() !== targetUserId
        );
        await user.save();

        res.json({ success: true, message: "User unblocked successfully" });
    } catch (error) {
        console.error("Unblock user error:", error);
        res.status(500).json({ success: false, message: "Failed to unblock user" });
    }
};

/**
 * Report a user
 */
exports.reportUser = async (req, res) => {
    try {
        const reporterId = req.user._id;
        const { targetUserId } = req.params;
        const { reason, description } = req.body;

        if (!reason) {
            return res.status(400).json({ success: false, message: "Reason is required" });
        }

        const report = await Report.create({
            reporter: reporterId,
            reportedUser: targetUserId,
            reason,
            description,
        });

        res.json({ success: true, message: "Report submitted successfully", report });
    } catch (error) {
        console.error("Report user error:", error);
        res.status(500).json({ success: false, message: "Failed to submit report" });
    }
};

/**
 * Get blocked users
 */
exports.getBlockedUsers = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId).populate('blockedUsers', 'name profilePicture');

        res.json({ success: true, blockedUsers: user.blockedUsers });
    } catch (error) {
        console.error("Get blocked users error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch blocked users" });
    }
};
