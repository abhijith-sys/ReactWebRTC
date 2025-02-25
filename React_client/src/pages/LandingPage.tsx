import { useState } from 'react';
import meetingImg from "../assets/change.svg"
import { useNavigate } from 'react-router-dom';
import { Socket } from 'socket.io-client';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
 socket: Socket;
}

const LandingPage: React.FC<Props> = ({ socket }) => {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const navigate = useNavigate();

  const handleJoinRoom = () => {
    if (name && roomId) {
      joinRoom(name, roomId);
    }
  };

  const handleCreateRoom = () => {
    if (name) {
      createRoom(name);
    }
  };

  const joinRoom = (name: string, room: string) => {
    navigate(`/room/${room}/${name}`);
  };

  const createRoom = (name: string) => {
    socket.emit('create-room', (newRoomId: string) => {
      navigate(`/room/${newRoomId}/${name}`);
    });
  };

  return (
    <div className=" bg-gray-100 dark:bg-gray-900  transition-colors duration-300">
      <div className="absolute right-3 top-4">
        <ModeToggle />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 items-center justify-center min-h-screen p-4 gap-10 max-w-7xl mx-auto ">
        <div className="p-4">
          <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            Video calls and meetings for everyone
          </h1>
          <p className="text-lg mb-6 text-gray-700 dark:text-gray-300">
            Connect, collaborate, and celebrate from anywhere with LinkUp.
          </p>
          <div className="mb-4">
            <Input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3">
            <Button
              className="bg-blue-500 w-full"
              onClick={handleCreateRoom}
              disabled={!name}
            >
              New meeting
            </Button>
            <Input
              type="text"
              placeholder="Enter a code"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="w-full"
            />
            <Button
              className="bg-green-500 w-full"
              onClick={handleJoinRoom}
              disabled={!name || !roomId}
            >
              Join
            </Button>
          </div>
        </div>
        <div className="p-4">
          <img src={meetingImg} alt="Plan ahead" className="w-full h-auto" />
          <p className="text-center mt-4 text-gray-700 dark:text-gray-300">
            {/* Additional text can go here */}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
