// lib/socket.js
const { Server } = require("socket.io");
const Message = require("../models/Message"); // The schema we created earlier
const ConnectionRequest = require("../models/ConnectionRequest");

// Map to track online users: Key = userId, Value = socketId
const onlineUsers = new Map();

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: { origin: "*" }, // Adjust to your frontend URL
  });

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // 1. JOIN: Identify user and map their socket
    socket.on("join", (userId) => {
      socket.userId = userId;
      onlineUsers.set(userId, socket.id);
      console.log(`User ${userId} is now online.`);
      io.emit("user_online", userId); // Notify friends
    });

    // 2. TEXT/MEDIA MESSAGING
    socket.on("send_message", async (data) => {
      const { senderId, receiverId, messageType, text, fileUrl, fileDetails } = data;

      try {
        // Save to DB for persistence
        const newMessage = await Message.create({
          sender: senderId,
          receiver: receiverId,
          messageType,
          text,
          fileUrl,
          fileDetails,
        });

        // Emit to receiver if online
        const receiverSocketId = onlineUsers.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receive_message", newMessage);
        }
      } catch (err) {
        console.error("Message Error:", err);
      }
    });

    // 3. WEBRTC SIGNALING (For Audio/Video Calls)
    // Caller sends offer to specific user
    socket.on("call_user", (data) => {
      const { userToCall, signalData, from, name, type } = data;
      const receiverSocketId = onlineUsers.get(userToCall);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("incoming_call", { 
          signal: signalData, 
          from, 
          name, 
          type // 'audio' or 'video'
        });
      }
    });

    // Receiver answers the call
    socket.on("answer_call", (data) => {
      const callerSocketId = onlineUsers.get(data.to);
      if (callerSocketId) {
        io.to(callerSocketId).emit("call_accepted", data.signal);
      }
    });

    // 4. CALL STATUS UPDATES (Logging missed/rejected calls)
    socket.on("end_call", async ({ senderId, receiverId, type, status, duration }) => {
      await Message.create({
        sender: senderId,
        receiver: receiverId,
        messageType: type === 'video' ? 'video_call' : 'audio_call',
        callStatus: status,
        callDuration: duration
      });
    });

    // 5. DISCONNECT
    socket.on("disconnect", () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        io.emit("user_offline", socket.userId);
      }
      console.log("Client disconnected");
    });
  });

  return io;
};

module.exports = initializeSocket;