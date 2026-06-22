const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// Get list of active conversations (for Admin Dashboard use)
router.get('/admin/conversations', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Admin only' });
    }

    // Find all messages involving the admin
    const messages = await Message.find({
      $or: [
        { senderId: req.user._id },
        { receiverId: req.user._id }
      ]
    }).sort({ createdAt: -1 });

    // Extract unique user IDs that the admin has had conversations with
    const conversationsMap = {};
    for (const msg of messages) {
      const otherId = msg.senderId.toString() === req.user._id.toString() 
        ? msg.receiverId.toString() 
        : msg.senderId.toString();

      if (!conversationsMap[otherId]) {
        conversationsMap[otherId] = {
          lastMessage: msg.message,
          lastMessageAt: msg.createdAt,
          unreadCount: 0
        };
      }

      // Count unread messages sent to admin by this user
      if (msg.receiverId.toString() === req.user._id.toString() && !msg.isRead) {
        conversationsMap[otherId].unreadCount += 1;
      }
    }

    // Populate user names
    const userIds = Object.keys(conversationsMap);
    const users = await User.find({ _id: { $in: userIds } }).select('name email');

    const conversations = users.map(user => ({
      userId: user._id,
      name: user.name,
      email: user.email,
      lastMessage: conversationsMap[user._id].lastMessage,
      lastMessageAt: conversationsMap[user._id].lastMessageAt,
      unreadCount: conversationsMap[user._id].unreadCount
    })).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get messages with the support admin
router.get('/messages/admin', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      return res.json([]);
    }

    // Find all messages between current user and the support admin
    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: adminUser._id },
        { senderId: adminUser._id, receiverId: userId }
      ]
    }).sort({ createdAt: 1 });

    // Mark admin's messages to current user as read
    await Message.updateMany(
      { senderId: adminUser._id, receiverId: userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get messages between current user and another user
router.get('/messages/:otherUserId', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { otherUserId } = req.params;

    // Find all messages between them
    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ]
    }).sort({ createdAt: 1 });

    // Mark messages from other user to current user as read
    await Message.updateMany(
      { senderId: otherUserId, receiverId: userId, isRead: false },
      { $set: { isRead: true } }
    );

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Send a message (to another user or support admin)
router.post('/', protect, async (req, res) => {
  try {
    const { receiverId, message } = req.body;
    const senderId = req.user._id;

    if (!message || message.trim() === '') {
      return res.status(400).json({ message: 'Message content is required' });
    }

    let targetReceiverId = receiverId;

    // If receiverId is not provided, send to support admin
    if (!targetReceiverId) {
      const adminUser = await User.findOne({ role: 'admin' });
      if (!adminUser) {
        return res.status(404).json({ message: 'Support Support is currently unavailable. No admin found.' });
      }
      targetReceiverId = adminUser._id;
    }

    const newMessage = new Message({
      senderId,
      receiverId: targetReceiverId,
      message
    });

    const savedMessage = await newMessage.save();
    res.status(201).json(savedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
