import { useState } from 'react';
import { io } from 'socket.io-client';
import VideoCall from './components/VideoCall';
import LandingPage from './components/LandingPage';
import global from 'global'
import * as process from "process";
global.process = process;

const socket = io('http://localhost:5000');

function App() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');

  const joinRoom = (name: string, room: string) => {
    setUserName(name);
    setRoomId(room);
  };

  const createRoom = (name: string) => {
    setUserName(name);
    socket.emit('create-room', (newRoomId: string) => {
      setRoomId(newRoomId);
    });
  };

  return (
    <div>
      {roomId ? (
        <VideoCall socket={socket} roomId={roomId} userName={userName} />
      ) : (
        <LandingPage joinRoom={joinRoom} createRoom={createRoom} />
      )}
    </div>
  );
}

export default App;