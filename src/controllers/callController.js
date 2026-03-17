const CallSession = require('../models/CallSession');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const ConnectionRequest = require('../models/ConnectionRequest');
const { v4: uuidv4 } = require('uuid');

/**
 * Helper function to check if two users are connected
 */
const areUsersConnected = async (userId1, userId2) => {
    const connection = await ConnectionRequest.findOne({
        $or: [
            { sender: userId1, receiver: userId2, status: 'accepted' },
            { sender: userId2, receiver: userId1, status: 'accepted' }
        ]
    });
    return !!connection;
};

/**
 * Initiate a call
 */
exports.initiateCall = async (req, res) => {
    try {
        const userId = req.user._id;
        const { receiverId, callType } = req.body;

        // Validate call type
        if (!['audio', 'video'].includes(callType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid call type. Must be "audio" or "video"',
            });
        }

        // Validate receiver exists
        const receiver = await User.findById(receiverId);
        if (!receiver) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Check if receiver is the same as caller
        if (userId.toString() === receiverId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot call yourself',
            });
        }

        // Check if users are connected
        const isConnected = await areUsersConnected(userId, receiverId);
        if (!isConnected) {
            return res.status(403).json({
                success: false,
                message: 'You must be connected with this user to start a call',
            });
        }

        // Find or create conversation
        const conversation = await Conversation.findOrCreate([userId, receiverId]);

        // Generate unique call ID
        const callId = uuidv4();

        // Create call session
        const callSession = await CallSession.create({
            callId,
            caller: userId,
            receiver: receiverId,
            callType,
            status: 'initiated',
            conversationId: conversation._id,
        });

        // Populate caller and receiver details
        await callSession.populate('caller', 'name profilePicture');
        await callSession.populate('receiver', 'name profilePicture');

        res.status(201).json({
            success: true,
            callSession,
        });
    } catch (error) {
        console.error('Initiate call error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initiate call',
        });
    }
};

/**
 * Get call history
 */
exports.getCallHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 50 } = req.query;

        const callHistory = await CallSession.find({
            $or: [{ caller: userId }, { receiver: userId }],
        })
            .populate('caller', 'name profilePicture')
            .populate('receiver', 'name profilePicture')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const totalCalls = await CallSession.countDocuments({
            $or: [{ caller: userId }, { receiver: userId }],
        });

        res.json({
            success: true,
            callHistory,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalCalls / limit),
                totalCalls,
            },
        });
    } catch (error) {
        console.error('Get call history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch call history',
        });
    }
};

/**
 * End a call
 */
exports.endCall = async (req, res) => {
    try {
        const userId = req.user._id;
        const { callId } = req.params;
        const { endReason = 'completed' } = req.body;

        const callSession = await CallSession.findOne({
            callId,
            $or: [{ caller: userId }, { receiver: userId }],
        });

        if (!callSession) {
            return res.status(404).json({
                success: false,
                message: 'Call session not found',
            });
        }

        // Determine who ended the call
        const actualEndReason = userId.toString() === callSession.caller.toString()
            ? 'caller_ended'
            : 'receiver_ended';

        await callSession.end(endReason || actualEndReason);

        res.json({
            success: true,
            callSession,
        });
    } catch (error) {
        console.error('End call error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to end call',
        });
    }
};

/**
 * Accept a call
 */
exports.acceptCall = async (req, res) => {
    try {
        const userId = req.user._id;
        const { callId } = req.params;

        const callSession = await CallSession.findOne({
            callId,
            receiver: userId,
        });

        if (!callSession) {
            return res.status(404).json({
                success: false,
                message: 'Call session not found',
            });
        }

        if (callSession.status !== 'initiated' && callSession.status !== 'ringing') {
            return res.status(400).json({
                success: false,
                message: 'Call cannot be accepted in current state',
            });
        }

        await callSession.answer();

        res.json({
            success: true,
            callSession,
        });
    } catch (error) {
        console.error('Accept call error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to accept call',
        });
    }
};

/**
 * Reject a call
 */
exports.rejectCall = async (req, res) => {
    try {
        const userId = req.user._id;
        const { callId } = req.params;

        const callSession = await CallSession.findOne({
            callId,
            receiver: userId,
        });

        if (!callSession) {
            return res.status(404).json({
                success: false,
                message: 'Call session not found',
            });
        }

        await callSession.reject();

        res.json({
            success: true,
            callSession,
        });
    } catch (error) {
        console.error('Reject call error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reject call',
        });
    }
};
