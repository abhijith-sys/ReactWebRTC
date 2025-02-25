import { useState } from 'react';

interface Props {
  joinRoom: (name: string, room: string) => void;
  createRoom: (name: string) => void;
}

const LandingPage: React.FC<Props> = ({ joinRoom, createRoom }) => {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');

  const handleCreateRoom = () => {
    if (name) {
      createRoom(name);
    }
  };

  const handleJoinRoom = () => {
    if (name && roomId) {
      joinRoom(name, roomId);
    }
  };

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>Multi-Peer Video Call</h1>
      <input
        type="text"
        placeholder="Enter your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{ display: 'block', margin: '10px auto', padding: '5px' }}
      />
      <div>
        <h3>Create a New Room</h3>
        <button onClick={handleCreateRoom} disabled={!name}>
          Create Room
        </button>
      </div>
      <div style={{ marginTop: '20px' }}>
        <h3>Join an Existing Room</h3>
        <input
          type="text"
          placeholder="Enter room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          style={{ display: 'block', margin: '10px auto', padding: '5px' }}
        />
        <button onClick={handleJoinRoom} disabled={!name || !roomId}>
          Join Room
        </button>
      </div>
    </div>
  );
};

export default LandingPage;