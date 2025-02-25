import { useState } from 'react';
import { io } from 'socket.io-client';
import VideoCall from './components/VideoCall';
import global from 'global'
import * as process from "process";
import LandingPage from './pages/LandingPage/LandingPage';
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
    <>
      {roomId ? (
        <VideoCall socket={socket} roomId={roomId} userName={userName} />
      ) : (
        <LandingPage joinRoom={joinRoom} createRoom={createRoom} />
      )}
    </>
  );
}

export default App;