import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

interface CustomSocket extends Socket {
  userName?: string;
}

io.on('connection', (socket: CustomSocket) => {
  console.log('User connected:', socket.id);

  socket.on('create-room', (callback: (roomId: string) => void) => {
    const roomId = uuidv4();
    console.log(`Room created: ${roomId} by ${socket.id}`);
    callback(roomId);
  });

  socket.on('join-room', (roomId: string, userId: string, userName: string) => {
    socket.userName = userName; // Store username on socket
    socket.join(roomId);
    console.log(`${socket.id} (${userName}) joined room ${roomId}`);

    const users = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
      .filter((id) => id !== socket.id)
      .map((id) => ({
        userId: id,
        userName: (io.sockets.sockets.get(id) as CustomSocket)?.userName || 'Unknown',
      }));

    socket.emit('all-users', users);

    socket.to(roomId).emit('user-connected', { userId: socket.id, userName });

    socket.on('signal', (data: { userId: string; signal: any }) => {
      console.log(`Relaying signal from ${socket.id} to ${data.userId}:`, data.signal);
      io.to(data.userId).emit('signal', { userId: socket.id, signal: data.signal });
    });

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