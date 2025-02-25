import { useState } from 'react';
import styles from './LandingPage.module.css';
import meetingImg from "../../assets/change.svg"

interface Props {
  joinRoom: (name: string, room: string) => void;
  createRoom: (name: string) => void;
}

const LandingPage: React.FC<Props> = ({ joinRoom, createRoom }) => {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');

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

  return (
    <div className={styles.container}>
      <div className={styles.leftSection}>
        <h1 className={styles.title}>Video calls and meetings for everyone</h1>
        <p className={styles.subtitle}>
          Connect, collaborate, and celebrate from anywhere with LikUp.
        </p>
        <div className={styles.inputContainer}>
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={styles.inputName}
          />
        </div>
        <div className={styles.actions}>
          <button className={styles.newMeetingBtn} onClick={handleCreateRoom} disabled={!name}>
            New meeting
          </button>
          <input
            type="text"
            placeholder="Enter a code "
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className={styles.input}
          />
          <button className={styles.joinBtn} onClick={handleJoinRoom} disabled={!name || !roomId}>
            Join
          </button>
        </div>
      </div>
      <div className={styles.rightSection}>
        <img src={meetingImg} alt="Plan ahead" className={styles.image} />
        <p className={styles.planText}>
          
        </p>
      </div>
    </div>
  );
};

export default LandingPage;
