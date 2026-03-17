const express = require("express");
const router = express.Router();
// const protect = require("../middleware/authMiddleware");
const { sendRequest, getIncomingRequests, acceptRequest, rejectRequest, getNotifications, markAsRead, getAcceptedConnections } = require("../controllers/requestController");
const { protect } = require("../middlewares/authMiddleware");

// const {
//   sendRequest,
//   getIncomingRequests,
//   acceptRequest,
//   rejectRequest,
// } = require("../controllers/requestController");

router.post("/send", protect, sendRequest);
router.get("/incoming", protect, getIncomingRequests);
router.get("/accepted", protect, getAcceptedConnections);
router.put("/accept/:requestId", protect, acceptRequest);
router.put("/reject/:requestId", protect, rejectRequest);
// Get all notifications (follow/unfollow)
router.get("/notifications", protect, getNotifications);

// Mark notification as read
router.put("/notifications/:notificationId/read", protect, markAsRead);

module.exports = router;
