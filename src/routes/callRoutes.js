const express = require('express');
const router = express.Router();
const callController = require('../controllers/callController');
const { protect } = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(protect);

/**
 * @route   POST /api/calls/initiate
 * @desc    Initiate a call (audio or video)
 * @access  Private
 */
router.post('/initiate', callController.initiateCall);

/**
 * @route   GET /api/calls/history
 * @desc    Get call history for logged-in user
 * @access  Private
 */
router.get('/history', callController.getCallHistory);

/**
 * @route   PATCH /api/calls/:callId/end
 * @desc    End a call
 * @access  Private
 */
router.patch('/:callId/end', callController.endCall);

/**
 * @route   PATCH /api/calls/:callId/accept
 * @desc    Accept a call
 * @access  Private
 */
router.patch('/:callId/accept', callController.acceptCall);

/**
 * @route   PATCH /api/calls/:callId/reject
 * @desc    Reject a call
 * @access  Private
 */
router.patch('/:callId/reject', callController.rejectCall);

module.exports = router;
