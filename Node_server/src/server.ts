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

interface ChatMessage {
  id: string;
  sender: string;
  time: string;
  content: string;
  isLink?: boolean;
}

io.on('connection', (socket: CustomSocket) => {
  console.log('User connected:', socket.id);

  socket.on('create-room', (callback: (roomId: string) => void) => {
    const roomId = uuidv4();
    console.log(`Room created: ${roomId} by ${socket.id}`);
    callback(roomId);
  });

  socket.on('join-room', (roomId: string, userId: string, userName: string) => {
    socket.userName = userName;
    socket.join(roomId);
    console.log(`${socket.id} (${userName}) joined room ${roomId}`);

    const users = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
      .filter((id) => id !== socket.id)
      .map((id) => ({
        userId: id,
        userName: (io.sockets.sockets.get(id) as CustomSocket)?.userName || 'Unknown',
      }));

    socket.emit('all-users', users);
    socket.to(roomId).emit('user-connected', { userId: socket.id, userName, callerId: socket.id });

    socket.on('signal', (data: { userId: string; signal: any }) => {
      console.log(`Relaying signal from ${socket.id} to ${data.userId}`);
      io.to(data.userId).emit('signal', { userId: socket.id, signal: data.signal });
    });

    socket.on('send-message', (content: string) => {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const message: ChatMessage = {
        id: uuidv4(),
        sender: socket.userName || 'Unknown',
        time,
        content,
        isLink: content.startsWith('http://') || content.startsWith('https://'),
      };
      console.log(`Received message from ${socket.id} (${socket.userName}) in room ${roomId}: ${content} (ID: ${message.id})`);
      console.log(`Broadcasting message to room ${roomId}`);
      io.to(roomId).emit('receive-message', message); // Broadcast to all in the room, including sender
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