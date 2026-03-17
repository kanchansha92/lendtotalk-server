const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middlewares/authMiddleware');
const { uploadChatImage, uploadChatFile } = require('../middlewares/uploadMiddleware');

// All routes require authentication
router.use(protect);

/**
 * @route   GET /api/chat/conversations
 * @desc    Get all conversations for logged-in user
 * @access  Private
 */
router.get('/conversations', chatController.getConversations);

/**
 * @route   GET /api/chat/conversations/:participantId
 * @desc    Get or create conversation with a specific user
 * @access  Private
 */
router.get('/conversations/:participantId', chatController.getOrCreateConversation);

/**
 * @route   GET /api/chat/messages/:conversationId
 * @desc    Get messages for a specific conversation
 * @access  Private
 */
router.get('/messages/:conversationId', chatController.getMessages);

/**
 * @route   POST /api/chat/messages/text
 * @desc    Send a text message
 * @access  Private
 */
router.post('/messages/text', chatController.sendTextMessage);

/**
 * @route   POST /api/chat/messages/image
 * @desc    Send an image message
 * @access  Private
 */
router.post('/messages/image', uploadChatImage, chatController.sendImageMessage);

/**
 * @route   POST /api/chat/messages/file
 * @desc    Send a file message
 * @access  Private
 */
router.post('/messages/file', uploadChatFile, chatController.sendFileMessage);

/**
 * @route   POST /api/chat/messages/audio
 * @desc    Send an audio message
 * @access  Private
 */
router.post('/messages/audio', uploadChatFile, chatController.sendAudioMessage);

/**
 * @route   PATCH /api/chat/messages/read
 * @desc    Mark messages as read
 * @access  Private
 */
router.patch('/messages/read', chatController.markMessagesAsRead);

/**
 * @route   DELETE /api/chat/messages/:messageId
 * @desc    Delete a message (soft delete)
 * @access  Private
 */
router.delete('/messages/:messageId', chatController.deleteMessage);

/**
 * @route   POST /api/chat/messages/bulk-delete
 * @desc    Delete multiple messages (bulk soft delete)
 * @access  Private
 */
router.post('/messages/bulk-delete', chatController.deleteMessagesBulk);


/**
 * @route   GET /api/chat/search/unified
 * @desc    Search both messages and connections
 * @access  Private
 */
router.get('/search/unified', chatController.searchUnified);

/**
 * @route   GET /api/chat/search/:conversationId
 * @desc    Search messages in a conversation
 * @access  Private
 */
router.get('/search/:conversationId', chatController.searchMessages);

/**
 * @route   DELETE /api/chat/messages/clear/:conversationId
 * @desc    Clear all messages in a conversation (soft delete)
 * @access  Private
 */
router.delete('/messages/clear/:conversationId', chatController.clearMessages);

/**
 * @route   PATCH /api/chat/conversations/archive/:conversationId
 * @desc    Archive a conversation
 * @access  Private
 */
router.patch('/conversations/archive/:conversationId', chatController.archiveConversation);

/**
 * @route   PATCH /api/chat/conversations/unarchive/:conversationId
 * @desc    Unarchive a conversation
 * @access  Private
 */
router.patch('/conversations/unarchive/:conversationId', chatController.unarchiveConversation);

/**
 * @route   GET /api/chat/media/:conversationId
 * @desc    Get all media for a specific conversation
 * @access  Private
 */
router.get('/media/:conversationId', chatController.getConversationMedia);

// E2EE Routes
/**
 * @route   PATCH /api/chat/public-key
 * @desc    Update user's E2EE public key
 * @access  Private
 */
router.patch('/public-key', chatController.updatePublicKey);

/**
 * @route   GET /api/chat/conversations/:conversationId/keys
 * @desc    Get encrypted symmetric keys for a conversation
 * @access  Private
 */
router.get('/conversations/:conversationId/keys', chatController.getConversationKeys);

/**
 * @route   POST /api/chat/conversations/:conversationId/keys
 * @desc    Update/Set encrypted symmetric keys for a conversation
 * @access  Private
 */
router.post('/conversations/:conversationId/keys', chatController.updateConversationKeys);

/**
 * @route   GET /api/chat/download-proxy
 * @desc    Proxy download a Cloudinary file through the backend (auth required)
 * @access  Private
 */
router.get('/download-proxy', chatController.downloadProxy);

module.exports = router;
