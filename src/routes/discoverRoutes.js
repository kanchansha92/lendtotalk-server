const express = require("express");
const router = express.Router();

// const { protect } = require("../middlewares/authMiddleware");
// const {
//   getNewPeople,
//   getSuggestions,
// } = require("../controllers/discoverController");
const { protect } = require("../middlewares/authMiddleware");
const { getNewPeople, getSuggestions, searchUsers, getUserProfile } = require("../controllers/discoverController");

// 🔹 New People (recently joined users)
router.get("/new-people", protect, getNewPeople);

// 🔹 Suggestions list (based on onboarding preferences)
router.get("/suggestions", protect, getSuggestions);
router.get("/search", protect, searchUsers);
router.get('/profile/:id', protect, getUserProfile);
module.exports = router;
