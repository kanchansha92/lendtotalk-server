const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const CallSession = require('../models/CallSession');

// Store active socket connections
const userSockets = new Map(); // userId -> Set(socketId)
const socketUsers = new Map(); // socketId -> userId

/**
 * Initialize Socket.IO handlers
 */
const initializeSocketHandlers = (io) => {
    // Middleware for socket authentication
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select('-password');

            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }

            socket.userId = user._id.toString();
            socket.user = user;
            next();
        } catch (error) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.userId;
        console.log(`User connected: ${userId} (${socket.id})`);

        // Join user to their own room for multi-device broadcasting
        socket.join(userId);

        // Store socket connection
        if (!userSockets.has(userId)) {
            userSockets.set(userId, new Set());

            // First device connected: Update user online status
            updateUserOnlineStatus(userId, true);

            // Emit user online status to all connections
            socket.broadcast.emit('user_online', { userId });
        }

        userSockets.get(userId).add(socket.id);
        socketUsers.set(socket.id, userId);

        // ==================== MESSAGING EVENTS ====================

        /**
         * Send message event
         */
        socket.on('send_message', async (data) => {
            try {
                const { conversationId, messageType, content, fileUrl, fileName, fileSize, mimeType, replyTo, iv, isEncrypted } = data;

                // Create message
                const message = await Message.create({
                    conversationId,
                    sender: userId,
                    messageType,
                    content,
                    fileUrl,
                    fileName,
                    fileSize,
                    mimeType,
                    replyTo,
                    iv,
                    isEncrypted: isEncrypted || false,
                });

                // Update conversation
                const conversation = await Conversation.findById(conversationId);
                if (conversation) {
                    await conversation.updateLastMessage(message._id);

                    // Increment unread for other participants
                    const otherParticipants = conversation.participants.filter(
                        (p) => p.toString() !== userId
                    );

                    for (const participantId of otherParticipants) {
                        await conversation.incrementUnread(participantId);

                        // Emit to other participant's devices if online
                        const targetId = participantId.toString();
                        if (userSockets.has(targetId)) {
                            await message.populate('sender', 'name profilePicture');
                            io.to(targetId).emit('new_message', message);
                        }
                    }
                }

                // Confirm to sender
                await message.populate('sender', 'name profilePicture');
                socket.emit('message_sent', message);
            } catch (error) {
                console.error('Send message error:', error);
                socket.emit('message_error', { error: 'Failed to send message' });
            }
        });

        socket.on('status_check', () => {
            const onlineUsers = Array.from(userSockets.keys());
            console.log(`[Status Check] User ${socket.userId} requested online list:`, onlineUsers);
            socket.emit('status_response', {
                onlineUsers,
                myId: socket.userId,
                mySocketId: socket.id
            });
        });

        // ==================== CALLING EVENTS ====================

        /**
         * Call ringing event (receiver is alerted)
         */
        socket.on('call_ringing', (data) => {
            const { callId, callerId } = data;
            if (userSockets.has(callerId)) {
                console.log(`Call ringing: ${callId} acknowledged. Notifying caller devices: ${callerId}`);
                io.to(callerId).emit('call_ringing', { callId });
            }
        });

        /**
         * Message delivered event
         */
        socket.on('message_delivered', async (data) => {
            try {
                const { messageId } = data;

                const message = await Message.findById(messageId);
                if (message && message.status === 'sent') {
                    message.status = 'delivered';
                    await message.save();

                    // Notify sender devices
                    const senderId = message.sender.toString();
                    if (userSockets.has(senderId)) {
                        io.to(senderId).emit('message_status_update', {
                            messageId,
                            status: 'delivered',
                        });
                    }
                }
            } catch (error) {
                console.error('Message delivered error:', error);
            }
        });

        /**
         * Message read event
         */
        socket.on('message_read', async (data) => {
            try {
                const { messageId } = data;

                const message = await Message.findById(messageId);
                if (message) {
                    await message.markAsRead(userId);

                    // Notify sender devices
                    const senderId = message.sender.toString();
                    if (userSockets.has(senderId)) {
                        io.to(senderId).emit('message_status_update', {
                            messageId,
                            status: 'read',
                            readBy: userId,
                        });
                    }
                }
            } catch (error) {
                console.error('Message read error:', error);
            }
        });

        /**
         * Typing indicator - start
         */
        socket.on('typing_start', (data) => {
            const { conversationId, recipientId } = data;

            if (userSockets.has(recipientId)) {
                io.to(recipientId).emit('user_typing', {
                    conversationId,
                    userId,
                });
            }
        });

        /**
         * Typing indicator - stop
         */
        socket.on('typing_stop', (data) => {
            const { conversationId, recipientId } = data;

            const recipientSocketId = userSockets.get(recipientId);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('user_stopped_typing', {
                    conversationId,
                    userId,
                });
            }
        });

        // ==================== CALL EVENTS ====================

        /**
         * Initiate call
         */
        socket.on('call_initiate', async (data) => {
            try {
                const { callId, receiverId, callType } = data;

                const callSession = await CallSession.findOne({ callId });
                if (!callSession) {
                    return socket.emit('call_error', { error: 'Call session not found' });
                }

                // Update status to ringing
                callSession.status = 'ringing';
                await callSession.save();

                // Notify receiver devices
                console.log(`=== CALL DEBUG ===`);
                console.log(`Active users map size: ${userSockets.size}`);
                console.log(`All active userIds: ${Array.from(userSockets.keys()).join(', ')}`);
                console.log(`Call initiate: ${callId} from ${userId} to ${receiverId}. Status: ${userSockets.has(receiverId) ? 'ONLINE' : 'OFFLINE'}`);

                if (userSockets.has(receiverId)) {
                    await callSession.populate('caller', 'name profilePicture');
                    io.to(receiverId).emit('incoming_call', {
                        callId,
                        caller: callSession.caller,
                        callType,
                    });
                    console.log(`Sent incoming_call to Room: ${receiverId}`);
                } else {
                    // Receiver is offline
                    socket.emit('call_error', { error: 'User is offline' });
                }
            } catch (error) {
                console.error('Call initiate error:', error);
                socket.emit('call_error', { error: 'Failed to initiate call' });
            }
        });

        /**
         * Accept call
         */
        socket.on('call_accept', async (data) => {
            try {
                const { callId } = data;

                const callSession = await CallSession.findOne({ callId });
                if (!callSession) {
                    return socket.emit('call_error', { error: 'Call session not found' });
                }

                await callSession.answer();

                // Notify caller devices
                const callerId = callSession.caller.toString();
                if (userSockets.has(callerId)) {
                    io.to(callerId).emit('call_accepted', { callId });
                }
            } catch (error) {
                console.error('Call accept error:', error);
                socket.emit('call_error', { error: 'Failed to accept call' });
            }
        });

        /**
         * Reject call
         */
        socket.on('call_reject', async (data) => {
            try {
                const { callId } = data;

                const callSession = await CallSession.findOne({ callId });
                if (!callSession) {
                    return socket.emit('call_error', { error: 'Call session not found' });
                }

                await callSession.reject();

                // Notify caller devices
                const callerId = callSession.caller.toString();
                if (userSockets.has(callerId)) {
                    io.to(callerId).emit('call_rejected', { callId });
                }
            } catch (error) {
                console.error('Call reject error:', error);
                socket.emit('call_error', { error: 'Failed to reject call' });
            }
        });

        /**
         * End call
         */
        socket.on('call_end', async (data) => {
            try {
                const { callId } = data;

                const callSession = await CallSession.findOne({ callId });
                if (!callSession) {
                    return socket.emit('call_error', { error: 'Call session not found' });
                }

                const endReason = userId === callSession.caller.toString()
                    ? 'caller_ended'
                    : 'receiver_ended';

                await callSession.end(endReason);

                // Notify other participant
                const otherUserId = userId === callSession.caller.toString()
                    ? callSession.receiver.toString()
                    : callSession.caller.toString();

                if (userSockets.has(otherUserId)) {
                    io.to(otherUserId).emit('call_ended', { callId, endReason });
                }

                // Confirm to sender
                socket.emit('call_ended', { callId, endReason });
            } catch (error) {
                console.error('Call end error:', error);
                socket.emit('call_error', { error: 'Failed to end call' });
            }
        });

        // ==================== WebRTC SIGNALING ====================

        /**
         * WebRTC Offer
         */
        socket.on('webrtc_offer', (data) => {
            const { callId, offer, receiverId } = data;

            if (userSockets.has(receiverId)) {
                io.to(receiverId).emit('webrtc_offer', {
                    callId,
                    offer,
                    senderId: userId,
                });
            }
        });

        /**
         * WebRTC Answer
         */
        socket.on('webrtc_answer', (data) => {
            const { callId, answer, callerId } = data;

            if (userSockets.has(callerId)) {
                io.to(callerId).emit('webrtc_answer', {
                    callId,
                    answer,
                    senderId: userId,
                });
            }
        });

        /**
         * WebRTC ICE Candidate
         */
        socket.on('webrtc_ice_candidate', (data) => {
            const { callId, candidate, recipientId } = data;

            if (userSockets.has(recipientId)) {
                io.to(recipientId).emit('webrtc_ice_candidate', {
                    callId,
                    candidate,
                    senderId: userId,
                });
            }
        });

        // ==================== DISCONNECT ====================

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id} (User: ${userId})`);

            // Remove this socket from the user's set
            const sockets = userSockets.get(userId);
            if (sockets) {
                sockets.delete(socket.id);

                // If it was the last socket for this user
                if (sockets.size === 0) {
                    userSockets.delete(userId);

                    // Update user offline status
                    updateUserOnlineStatus(userId, false);

                    // Notify others
                    socket.broadcast.emit('user_offline', { userId });
                    console.log(`User totally offline: ${userId}`);
                }
            }

            socketUsers.delete(socket.id);
        });
    });
};

/**
 * Update user online status in database
 */
const updateUserOnlineStatus = async (userId, isOnline) => {
    try {
        await User.findByIdAndUpdate(userId, {
            isCurrentlyOnline: isOnline,
            lastActive: isOnline ? new Date() : new Date(),
        });
    } catch (error) {
        console.error('Update online status error:', error);
    }
};

/**
 * Get any active socket ID for a user (useful for single-target fallbacks)
 */
const getUserSocketId = (userId) => {
    const sockets = userSockets.get(userId);
    if (sockets && sockets.size > 0) {
        return Array.from(sockets)[0];
    }
    return null;
};

/**
 * Check if user is online
 */
const isUserOnline = (userId) => {
    return userSockets.has(userId) && userSockets.get(userId).size > 0;
};

module.exports = {
    initializeSocketHandlers,
    getUserSocketId,
    isUserOnline,
};
