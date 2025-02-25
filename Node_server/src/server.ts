import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

// Initialize Express app and create HTTP server with Socket.IO
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for CORS
    methods: ['GET', 'POST'], // Allowed HTTP methods
  },
});

// Extend Socket interface to include optional userName property
interface CustomSocket extends Socket {
  userName?: string;
}

// Define structure for chat messages
interface ChatMessage {
  id: string; // Unique message identifier
  sender: string; // Name of the sender
  time: string; // Timestamp of the message
  content: string; // Message content
  isLink?: boolean; // Flag to identify if content is a URL
}

// Handle new socket connections
io.on('connection', (socket: CustomSocket) => {
  console.log('User connected:', socket.id);

  // Handle room creation requests
  socket.on('create-room', (callback: (roomId: string) => void) => {
    const roomId = uuidv4(); // Generate unique room ID
    console.log(`Room created: ${roomId} by ${socket.id}`);
    callback(roomId); // Send room ID back to client
  });

  // Handle users joining a room
  socket.on('join-room', (roomId: string, userId: string, userName: string) => {
    socket.userName = userName; // Store username in socket
    socket.join(roomId); // Add socket to specified room
    console.log(`${socket.id} (${userName}) joined room ${roomId}`);

    // Get list of existing users in the room (excluding the new joiner)
    const users = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
      .filter((id) => id !== socket.id)
      .map((id) => ({
        userId: id,
        userName: (io.sockets.sockets.get(id) as CustomSocket)?.userName || 'Unknown',
      }));

    // Send existing users list to the new joiner and notify others of new connection
    socket.emit('all-users', users);
    socket.to(roomId).emit('user-connected', { userId: socket.id, userName, callerId: socket.id });

    // Handle WebRTC signaling between peers
    socket.on('signal', (data: { userId: string; signal: any }) => {
      console.log(`Relaying signal from ${socket.id} to ${data.userId}`);
      io.to(data.userId).emit('signal', { userId: socket.id, signal: data.signal });
    });

    // Handle incoming chat messages
    socket.on('send-message', (content: string) => {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const message: ChatMessage = {
        id: uuidv4(), // Generate unique message ID
        sender: socket.userName || 'Unknown',
        time,
        content,
        isLink: content.startsWith('http://') || content.startsWith('https://'), // Check if content is a link
      };
      console.log(`Received message from ${socket.id} (${socket.userName}) in room ${roomId}: ${content} (ID: ${message.id})`);
      console.log(`Broadcasting message to room ${roomId}`);
      io.to(roomId).emit('receive-message', message); // Broadcast message to everyone in the room
    });

    // Handle user disconnection from the room
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      socket.to(roomId).emit('user-disconnected', socket.id); // Notify room of disconnection
    });
  });
});

// Define server port and start listening
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});