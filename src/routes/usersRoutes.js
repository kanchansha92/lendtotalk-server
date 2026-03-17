// routes/users.js
const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const router = express.Router();
const userController = require('../controllers/userController');
// const { protect } = require('../middleware/auth');
// const {updateProfile} = require('../controllers/userProfileController');
// router.get('/profile', protect, userController.getProfile);
// router.put('/update-profile', protect, userProfileController.updateProfile);
// router.get('/dashboard', protect, userController.getDashboard);
// router.get('/random', protect, userController.getRandomUsers);
// router.post('/upgrade', protect, userController.upgradeToPremium);
router.put('/update-profile', protect, require('../controllers/userProfileController').updateProfile);

// Block/Report routes
router.post('/block/:targetUserId', protect, userController.blockUser);
router.post('/unblock/:targetUserId', protect, userController.unblockUser);
router.post('/report/:targetUserId', protect, userController.reportUser);
router.get('/blocked', protect, userController.getBlockedUsers);

module.exports = router;