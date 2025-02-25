import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Adjust for production (e.g., 'http://localhost:3000')
    methods: ['GET', 'POST'],
  },
});
// Extend the Socket type to include userName
interface CustomSocket extends Socket {
  userName?: string;
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle room creation
  socket.on('create-room', (callback: (roomId: string) => void) => {
    const roomId = uuidv4();
    console.log(`Room created: ${roomId} by ${socket.id}`);
    callback(roomId);
  });

  // User joins a room
  socket.on('join-room', (roomId: string, userId: string) => {
    socket.join(roomId);
    console.log(`${socket.id} joined room ${roomId}`);

    // Get all users in the room except the new joiner
    const users = Array.from(io.sockets.adapter.rooms.get(roomId) || []).filter(
      (id) => id !== socket.id
    );
    console.log(`Users in room ${roomId} before join:`, users);

    // Send existing users to the new joiner first (initiators will send offers)
    socket.emit('all-users', users);

    // Notify existing users of the new joiner (receivers will wait for offers)
    socket.to(roomId).emit('user-connected', socket.id);

    // Handle signaling data
    socket.on('signal', (data: { userId: string; signal: any }) => {
      console.log(`Relaying signal from ${socket.id} to ${data.userId}:`, data.signal);
      io.to(data.userId).emit('signal', { userId: socket.id, signal: data.signal });
    });

    // User disconnects
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      socket.to(roomId).emit('user-disconnected', socket.id);
    });
  });
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});