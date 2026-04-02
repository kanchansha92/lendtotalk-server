
exports.searchUnified = async (req, res) => {
    try {
        const userId = req.user._id;
        const { query } = req.query;

        if (!query || query.trim().length === 0) {
            return res.json({ success: true, users: [], messages: [] });
        }

        const regex = new RegExp(query, 'i');

        // 1. Search Connections (Users)
        // Find accepted connections first
        const connections = await ConnectionRequest.find({
            $or: [
                { sender: userId, status: 'accepted' },
                { receiver: userId, status: 'accepted' }
            ]
        });

        const friendIds = connections.map(c =>
            c.sender.toString() === userId.toString() ? c.receiver : c.sender
        );

        // Search Users among friends
        const matchedUsers = await User.find({
            _id: { $in: friendIds },
            name: { $regex: regex }
        }).select('name profilePicture city state bio isCurrentlyOnline');


        // 2. Search Messages
        // Find conversations I am part of
        const conversations = await Conversation.find({
            participants: userId,
            isDeleted: false
        }).select('_id');

        const conversationIds = conversations.map(c => c._id);

        // Search messages in my conversations
        const matchedMessages = await Message.find({
            conversationId: { $in: conversationIds },
            messageType: 'text',
            content: { $regex: regex },
            isDeleted: false
        })
            .populate('sender', 'name profilePicture')
            .populate({
                path: 'conversationId',
                select: 'participants',
                populate: { path: 'participants', select: 'name profilePicture' }
            })
            .sort({ createdAt: -1 })
            .limit(20);

        // Format messages to include context (who it was with)
        const formattedMessages = matchedMessages.map(msg => {
            const conversation = msg.conversationId;
            let otherParticipant = null;
            if (conversation && conversation.participants) {
                otherParticipant = conversation.participants.find(
                    p => p._id.toString() !== userId.toString()
                );
            }

            return {
                _id: msg._id,
                content: msg.content,
                createdAt: msg.createdAt,
                sender: msg.sender,
                conversationId: conversation?._id,
                otherParticipant: otherParticipant ? {
                    _id: otherParticipant._id,
                    name: otherParticipant.name,
                    profilePicture: otherParticipant.profilePicture
                } : null
            };
        });

        res.json({
            success: true,
            users: matchedUsers,
            messages: formattedMessages
        });

    } catch (error) {
        console.error('Unified search error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search'
        });
    }
};


const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const ConnectionRequest = require('../models/ConnectionRequest');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

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
 * Helper function to check if either user has blocked the other
 */
const isBlocked = async (userId1, userId2) => {
    const user1 = await User.findById(userId1).select('blockedUsers');
    const user2 = await User.findById(userId2).select('blockedUsers');

    if (!user1 || !user2) return false;

    const user1Blocked2 = user1.blockedUsers.some(id => id.toString() === userId2.toString());
    const user2Blocked1 = user2.blockedUsers.some(id => id.toString() === userId1.toString());

    return user1Blocked2 || user2Blocked1;
};

/**
 * Get all conversations for the logged-in user
 */
exports.getConversations = async (req, res) => {
    try {
        const userId = req.user._id;

        const conversations = await Conversation.find({
            participants: userId,
            isDeleted: false,
        })
            .populate('participants', 'name profilePicture isCurrentlyOnline lastActive subscription')
            .populate('lastMessage')
            .sort({ lastMessageAt: -1 });

        let totalUnreadCount = 0;
        const formattedConversations = conversations.map((conv) => {
            const otherParticipant = conv.participants.find(
                (p) => p._id.toString() !== userId.toString()
            );

            const unread = conv.unreadCount.get(userId.toString()) || 0;
            totalUnreadCount += unread;

            return {
                _id: conv._id,
                participant: otherParticipant,
                lastMessage: conv.lastMessage,
                lastMessageAt: conv.lastMessageAt,
                unreadCount: unread,
                isMuted: conv.mutedBy.some(id => id.toString() === userId.toString()),
                isArchived: conv.archivedBy.some(id => id.toString() === userId.toString()),
            };
        });

        res.json({
            success: true,
            conversations: formattedConversations,
            totalUnreadCount,
        });
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch conversations',
        });
    }
};

/**
 * Get or create a conversation with a specific user
 */
exports.getOrCreateConversation = async (req, res) => {
    try {
        const userId = req.user._id;
        const { participantId } = req.params;

        const participant = await User.findById(participantId);
        if (!participant) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        const isConnected = await areUsersConnected(userId, participantId);
        if (!isConnected) {
            return res.status(403).json({
                success: false,
                message: 'You must be connected with this user to start a conversation',
                needsConnection: true,
            });
        }

        // Create or find conversation (history is accessible even if blocked)
        const conversation = await Conversation.findOrCreate([userId, participantId]);
        await conversation.populate('participants', 'name profilePicture isCurrentlyOnline lastActive subscription');

        res.json({
            success: true,
            conversation,
        });
    } catch (error) {
        console.error('Get/create conversation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get conversation',
        });
    }
};

/**
 * Get messages for a specific conversation
 */
exports.getMessages = async (req, res) => {
    try {
        const userId = req.user._id;
        const { conversationId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId,
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found',
            });
        }

        // Get user's clearedAt timestamp for this conversation
        const clearedAt = conversation.clearedAt?.get(userId.toString());

        const query = {
            conversationId,
            isDeleted: false,
        };

        if (clearedAt) {
            query.createdAt = { $gt: clearedAt };
        }

        const messages = await Message.find(query)
            .populate('sender', 'name profilePicture')
            .populate('replyTo')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const totalMessages = await Message.countDocuments(query);

        res.json({
            success: true,
            messages: messages.reverse(),
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalMessages / limit),
                totalMessages,
            },
        });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch messages',
        });
    }
};

/**
 * Send a text message
 */
exports.sendTextMessage = async (req, res) => {
    try {
        const userId = req.user._id;
        const { conversationId, content, replyTo, iv, isEncrypted } = req.body;

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId,
        });

        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        const otherParticipant = conversation.participants.find(
            (p) => p.toString() !== userId.toString()
        );

        const isConnected = await areUsersConnected(userId, otherParticipant);
        if (!isConnected) {
            return res.status(403).json({
                success: false,
                message: 'You are no longer connected with this user',
                needsConnection: true,
            });
        }

        const blocked = await isBlocked(userId, otherParticipant);
        if (blocked) {
            return res.status(403).json({
                success: false,
                message: 'This message could not be sent because one of you has blocked the other',
            });
        }

        const message = await Message.create({
            conversationId,
            sender: userId,
            messageType: 'text',
            content,
            replyTo: replyTo || null,
            iv: iv || null,
            isEncrypted: isEncrypted || false,
        });

        await conversation.updateLastMessage(message._id);
        await conversation.incrementUnread(otherParticipant);

        await message.populate('sender', 'name profilePicture');
        if (replyTo) await message.populate('replyTo');

        res.status(201).json({ success: true, message });
    } catch (error) {
        console.error('Send text message error:', error);
        res.status(500).json({ success: false, message: 'Failed to send message' });
    }
};

/**
 * Send an image message
 */
exports.sendImageMessage = async (req, res) => {
    try {
        const userId = req.user._id;
        const { conversationId, replyTo, content } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No image file provided' });
        }

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId,
        });

        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        const otherParticipant = conversation.participants.find(
            (p) => p.toString() !== userId.toString()
        );

        const isConnected = await areUsersConnected(userId, otherParticipant);
        if (!isConnected) {
            return res.status(403).json({
                success: false,
                message: 'You are no longer connected with this user',
                needsConnection: true,
            });
        }

        const uploadPromise = new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: 'chat_images', resource_type: 'image' },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
        });

        const uploadResult = await uploadPromise;

        // const message = await Message.create({
        //     conversationId,
        //     sender: userId,
        //     messageType: 'image',
        //     fileUrl: uploadResult.secure_url,
        //     fileName: req.file.originalname,
        //     fileSize: req.file.size,
        //     mimeType: req.file.mimetype,
        //     cloudinaryPublicId: uploadResult.public_id,
        //     replyTo: replyTo || null,
        // });

        const message = await Message.create({
            conversationId,
            sender: userId,
            messageType: 'image',
            fileUrl: uploadResult.secure_url,
            fileName: req.file.originalname,
            fileSize: uploadResult.bytes, // 🔥 BEST SOURCE
            mimeType: req.file.mimetype,
            cloudinaryPublicId: uploadResult.public_id,
            replyTo: replyTo || null,
            content: content || null,
        });


        await conversation.updateLastMessage(message._id);
        await conversation.incrementUnread(otherParticipant);
        await message.populate('sender', 'name profilePicture');

        res.status(201).json({ success: true, message });
    } catch (error) {
        console.error('Send image message error:', error);
        res.status(500).json({ success: false, message: 'Failed to send image' });
    }
};

/**
 * Send a file message
 */
exports.sendFileMessage = async (req, res) => {
    try {
        const userId = req.user._id;
        const { conversationId, replyTo } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file provided' });
        }

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId,
        });

        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        const otherParticipant = conversation.participants.find(
            (p) => p.toString() !== userId.toString()
        );

        const isConnected = await areUsersConnected(userId, otherParticipant);
        if (!isConnected) {
            return res.status(403).json({
                success: false,
                message: 'You are no longer connected with this user',
                needsConnection: true,
            });
        }

        const uploadPromise = new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: 'chat_files', resource_type: 'raw' },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
        });

        const uploadResult = await uploadPromise;

        const message = await Message.create({
            conversationId,
            sender: userId,
            messageType: 'file',
            fileUrl: uploadResult.secure_url,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            cloudinaryPublicId: uploadResult.public_id,
            replyTo: replyTo || null,
        });

        await conversation.updateLastMessage(message._id);
        await conversation.incrementUnread(otherParticipant);
        await message.populate('sender', 'name profilePicture');

        res.status(201).json({ success: true, message });
    } catch (error) {
        console.error('Send file message error:', error);
        res.status(500).json({ success: false, message: 'Failed to send file' });
    }
};

/**
 * Send an audio/voice message
 */
exports.sendAudioMessage = async (req, res) => {
    try {
        const userId = req.user._id;
        const { conversationId, replyTo } = req.body;

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No audio file provided' });
        }

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId,
        }).populate('participants', 'subscription');

        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        const sender = await User.findById(userId);
        const otherParticipantId = conversation.participants.find(
            (p) => p._id.toString() !== userId.toString()
        );
        const receiver = await User.findById(otherParticipantId);

        // ✅ VIP Logic: Both must be VIP
        const isSenderVip = sender.subscription?.type === 'vip';
        const isReceiverVip = receiver.subscription?.type === 'vip';

        if (!isSenderVip) {
            return res.status(403).json({
                success: false,
                message: 'Voice notes are a VIP feature. Please upgrade to VIP to send voice notes.',
            });
        }

        if (!isReceiverVip) {
            return res.status(403).json({
                success: false,
                message: 'The receiver must also be a VIP member to receive voice notes.',
            });
        }

        const isConnected = await areUsersConnected(userId, otherParticipantId);
        if (!isConnected) {
            return res.status(403).json({
                success: false,
                message: 'You are no longer connected with this user',
                needsConnection: true,
            });
        }

        // Upload to Cloudinary
        const uploadPromise = new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: 'chat_audio', resource_type: 'video' },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
        });

        const uploadResult = await uploadPromise;

        const message = await Message.create({
            conversationId,
            sender: userId,
            messageType: 'audio',
            fileUrl: uploadResult.secure_url,
            fileName: 'voice_note.m4a',
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            cloudinaryPublicId: uploadResult.public_id,
            replyTo: replyTo || null,
        });

        await conversation.updateLastMessage(message._id);
        await conversation.incrementUnread(otherParticipantId);
        await message.populate('sender', 'name profilePicture');

        res.status(201).json({ success: true, message });
    } catch (error) {
        console.error('Send audio message error:', error);
        res.status(500).json({ success: false, message: 'Failed to send voice note' });
    }
};

/**
 * Mark messages as read
 */
exports.markMessagesAsRead = async (req, res) => {
    try {
        const userId = req.user._id;
        const { conversationId, participantId } = req.body;

        let targetConversationId = conversationId;

        if (!targetConversationId && participantId) {
            // Find conversation by participants
            const conversation = await Conversation.findOne({
                participants: { $all: [userId, participantId] },
                isDeleted: false
            });

            if (conversation) {
                targetConversationId = conversation._id;
            }
        }

        if (!targetConversationId) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        // Validate conversation access
        const conversation = await Conversation.findOne({
            _id: targetConversationId,
            participants: userId,
        });

        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        // Mark all unread messages as read
        await Message.updateMany(
            {
                conversationId: targetConversationId,
                sender: { $ne: userId },
                status: { $ne: 'read' },
            },
            {
                $set: { status: 'read' },
                $push: {
                    readBy: {
                        userId,
                        readAt: new Date(),
                    },
                },
            }
        );

        // Reset unread count
        await conversation.resetUnread(userId);

        res.json({ success: true, message: 'Messages marked as read' });
    } catch (error) {
        console.error('Mark messages as read error:', error);
        res.status(500).json({ success: false, message: 'Failed to mark messages as read' });
    }
};


/**
 * Delete a message (soft delete)
 */
exports.deleteMessage = async (req, res) => {
    try {
        const userId = req.user._id;
        const { messageId } = req.params;

        const message = await Message.findOne({
            _id: messageId,
            sender: userId,
        });

        if (!message) {
            return res.status(404).json({ success: false, message: 'Message not found' });
        }

        await message.softDelete(userId);

        res.json({ success: true, message: 'Message deleted' });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete message' });
    }
};

/**
 * Search messages in a conversation
 */
exports.searchMessages = async (req, res) => {
    try {
        const userId = req.user._id;
        const { conversationId } = req.params;
        const { query } = req.query;

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId,
        });

        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        const messages = await Message.find({
            conversationId,
            messageType: 'text',
            content: { $regex: query, $options: 'i' },
            isDeleted: false,
        })
            .populate('sender', 'name profilePicture')
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({ success: true, messages });
    } catch (error) {
        console.error('Search messages error:', error);
        res.status(500).json({ success: false, message: 'Failed to search messages' });
    }
};

/**
 * Delete multiple messages (bulk soft delete)
 */
exports.deleteMessagesBulk = async (req, res) => {
    try {
        const userId = req.user._id;
        const { messageIds } = req.body;

        if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No message IDs provided' });
        }

        // Only allow deleting messages sent by the user
        const result = await Message.updateMany(
            {
                _id: { $in: messageIds },
                sender: userId,
            },
            {
                $set: {
                    isDeleted: true,
                    deletedAt: new Date(),
                    deletedBy: userId,
                },
            }
        );

        res.json({
            success: true,
            message: `${result.modifiedCount} messages deleted`,
            deletedCount: result.modifiedCount,
        });
    } catch (error) {
        console.error('Bulk delete messages error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete messages' });
    }
};

/**
 * Clear all messages in a conversation (soft delete)
 */
// exports.clearMessages = async (req, res) => {
//     try {
//         const userId = req.user._id;
//         const { conversationId } = req.params;

//         // Validate conversation access
//         const conversation = await Conversation.findOne({
//             _id: conversationId,
//             participants: userId,
//         });

//         if (!conversation) {
//             return res.status(404).json({ success: false, message: 'Conversation not found' });
//         }

//         // Set the clearedAt timestamp for the current user
//         if (!conversation.clearedAt) {
//             conversation.clearedAt = new Map();
//         }
//         conversation.clearedAt.set(userId.toString(), new Date());
//         await conversation.save();

//         res.json({
//             success: true,
//             message: 'Chat history cleared for you',
//         });
//     } catch (error) {
//         console.error('Clear messages error:', error);
//         res.status(500).json({ success: false, message: 'Failed to clear chat history' });
//     }
// };



exports.clearMessages = async (req, res) => {
    try {
        const userId = req.user._id;
        const { conversationId } = req.params;

        // Validate conversation access
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId,
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found'
            });
        }

        // Set the clearedAt timestamp for the current user
        if (!conversation.clearedAt) {
            conversation.clearedAt = new Map();
        }
        conversation.clearedAt.set(userId.toString(), new Date());

        // Mark as modified to ensure Mongoose saves the Map
        conversation.markModified('clearedAt');

        await conversation.save();

        res.json({
            success: true,
            message: 'Chat history cleared for you',
        });
    } catch (error) {
        console.error('Clear messages error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to clear chat history'
        });
    }
};

/**
 * Archive a conversation for the current user
 */
exports.archiveConversation = async (req, res) => {
    try {
        const userId = req.user._id;
        const { conversationId } = req.params;

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId,
        });

        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        // Add user to archivedBy if not already there
        if (!conversation.archivedBy.includes(userId)) {
            conversation.archivedBy.push(userId);
            await conversation.save();
        }

        res.json({ success: true, message: 'Conversation archived' });
    } catch (error) {
        console.error('Archive conversation error:', error);
        res.status(500).json({ success: false, message: 'Failed to archive conversation' });
    }
};

/**
 * Unarchive a conversation for the current user
 */
exports.unarchiveConversation = async (req, res) => {
    try {
        const userId = req.user._id;
        const { conversationId } = req.params;

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId,
        });

        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found' });
        }

        // Remove user from archivedBy
        conversation.archivedBy = conversation.archivedBy.filter(
            (id) => id.toString() !== userId.toString()
        );
        await conversation.save();

        res.json({ success: true, message: 'Conversation unarchived' });
    } catch (error) {
        console.error('Unarchive conversation error:', error);
        res.status(500).json({ success: false, message: 'Failed to unarchive conversation' });
    }
};

/**
 * Get all media (images and files) for a conversation
 */
exports.getConversationMedia = async (req, res) => {
    try {
        const userId = req.user._id;
        const { conversationId } = req.params;

        // Verify user is part of conversation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId,
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found',
            });
        }

        // Fetch messages of type image or file
        const mediaMessages = await Message.find({
            conversationId,
            messageType: { $in: ['image', 'file'] },
            isDeleted: false,
        })
            .populate('sender', 'name profilePicture')
            .sort({ createdAt: -1 });

        // Separate into images and documents
        const images = mediaMessages.filter(msg => msg.messageType === 'image');
        const documents = mediaMessages.filter(msg => msg.messageType === 'file');

        res.json({
            success: true,
            images,
            documents,
        });
    } catch (error) {
        console.error('Get conversation media error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch conversation media',
        });
    }
};

/**
 * Update user's E2EE public key
 */
exports.updatePublicKey = async (req, res) => {
    try {
        const userId = req.user._id;
        const { publicKey } = req.body;

        if (!publicKey) {
            return res.status(400).json({
                success: false,
                message: 'Public key is required',
            });
        }

        await User.findByIdAndUpdate(userId, { publicKey });

        res.json({
            success: true,
            message: 'Public key updated successfully',
        });
    } catch (error) {
        console.error('Update public key error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update public key',
        });
    }
};

/**
 * Get encrypted symmetric keys for a conversation
 */
exports.getConversationKeys = async (req, res) => {
    try {
        const userId = req.user._id;
        const { conversationId } = req.params;

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId,
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found',
            });
        }

        const userKey = conversation.encryptedSymmetricKeys.find(
            (k) => k.userId.toString() === userId.toString()
        );

        res.json({
            success: true,
            encryptedKey: userKey ? userKey.encryptedKey : null,
        });
    } catch (error) {
        console.error('Get conversation keys error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch conversation keys',
        });
    }
};

/**
 * Update/Set encrypted symmetric keys for a conversation
 */
exports.updateConversationKeys = async (req, res) => {
    try {
        const userId = req.user._id;
        const { conversationId } = req.params;
        const { keys } = req.body; // Array of { userId, encryptedKey }

        if (!Array.isArray(keys) || keys.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Keys array is required',
            });
        }

        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId,
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'Conversation not found',
            });
        }

        // Update or add keys
        keys.forEach((newKey) => {
            const index = conversation.encryptedSymmetricKeys.findIndex(
                (k) => k.userId.toString() === newKey.userId.toString()
            );

            if (index !== -1) {
                conversation.encryptedSymmetricKeys[index].encryptedKey = newKey.encryptedKey;
            } else {
                conversation.encryptedSymmetricKeys.push(newKey);
            }
        });

        await conversation.save();

        res.json({
            success: true,
            message: 'Conversation keys updated successfully',
        });
    } catch (error) {
        console.error('Update conversation keys error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update conversation keys',
        });
    }
};

/**
 * Proxy download a file from Cloudinary through the backend.
 * This solves 401 errors caused by Cloudinary access restrictions on direct downloads.
 */
exports.downloadProxy = async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return res.status(400).json({ success: false, message: 'Missing url parameter' });
        }

        // Security: Only allow Cloudinary URLs to prevent open proxy abuse
        const allowedHosts = ['res.cloudinary.com', 'cloudinary.com'];
        let parsedUrl;
        try {
            parsedUrl = new URL(url);
        } catch {
            return res.status(400).json({ success: false, message: 'Invalid URL' });
        }

        const isAllowed = allowedHosts.some((host) => parsedUrl.hostname.endsWith(host));
        if (!isAllowed) {
            return res.status(403).json({ success: false, message: 'URL not allowed' });
        }

        console.log('Proxying download for:', url);

        // Use the built-in https module to fetch the file
        const https = require('https');
        const http = require('http');
        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        protocol.get(url, (cloudinaryRes) => {
            if (cloudinaryRes.statusCode !== 200) {
                console.error('Cloudinary returned:', cloudinaryRes.statusCode, 'for', url);
                res.status(cloudinaryRes.statusCode).json({
                    success: false,
                    message: `Cloudinary returned ${cloudinaryRes.statusCode}`,
                });
                cloudinaryRes.resume(); // discard response body
                return;
            }

            // Forward content-type header
            const contentType = cloudinaryRes.headers['content-type'] || 'application/octet-stream';
            res.setHeader('Content-Type', contentType);

            if (cloudinaryRes.headers['content-length']) {
                res.setHeader('Content-Length', cloudinaryRes.headers['content-length']);
            }

            // Extract filename from URL path
            const urlPath = parsedUrl.pathname;
            const filename = urlPath.split('/').pop() || 'download';
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

            // Stream directly — no buffering needed
            cloudinaryRes.pipe(res);
        }).on('error', (err) => {
            console.error('Proxy fetch error:', err);
            if (!res.headersSent) {
                res.status(500).json({ success: false, message: 'Failed to fetch file' });
            }
        });

    } catch (error) {
        console.error('Download proxy error:', error);
        res.status(500).json({ success: false, message: 'Proxy error' });
    }
};
