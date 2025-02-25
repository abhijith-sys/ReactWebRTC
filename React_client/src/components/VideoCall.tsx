import { useEffect, useRef, useState } from 'react';
import SimplePeer from 'simple-peer';
import { Socket } from 'socket.io-client';

interface Props {
  socket: Socket;
  roomId: string;
  userName: string;
}

interface PeerData {
  peer: SimplePeer.Instance;
  userId: string;
  userName: string;
}

const VideoCall: React.FC<Props> = ({ socket, roomId, userName }) => {
  const [peers, setPeers] = useState<PeerData[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const myVideo = useRef<HTMLVideoElement>(null);
  const peersRef = useRef<PeerData[]>([]);
  const processedSignals = useRef<Set<string>>(new Set());

  useEffect(() => {
    const init = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setStream(mediaStream);
        socket.emit('join-room', roomId, socket.id, userName);

        socket.on('all-users', (users: { userId: string; userName: string }[]) => {
          if (!mediaStream) {
            setError('Stream unavailable');
            return;
          }
          const newPeers: PeerData[] = [];
          const uniqueUsers = users.filter((u) => u.userId !== socket.id);
          uniqueUsers.forEach(({ userId, userName }) => {
            if (!peersRef.current.some((p) => p.userId === userId)) {
              const peer = createPeer(userId, socket.id, mediaStream);
              newPeers.push({ peer, userId, userName });
              peersRef.current.push({ peer, userId, userName });
            }
          });
          setPeers(newPeers);
        });

        socket.on('user-connected', ({ userId, userName }: { userId: string; userName: string }) => {
          if (!mediaStream || userId === socket.id) return;
          if (!peersRef.current.some((p) => p.userId === userId)) {
            const peer = addPeer(userId, socket.id, mediaStream);
            peersRef.current.push({ peer, userId, userName });
            setPeers((prev) => [...prev, { peer, userId, userName }]);
          }
        });

        socket.on('signal', (data: { userId: string; signal: any }) => {
          const item = peersRef.current.find((p) => p.userId === data.userId);
          if (item && !item.peer.destroyed) {
            const signalKey = data.signal.sdp || JSON.stringify(data.signal.candidate);
            if (!processedSignals.current.has(signalKey)) {
              processedSignals.current.add(signalKey);
              item.peer.signal(data.signal);
            }
          } else if (data.signal.type === 'offer') {
            const peer = addPeer(data.userId, socket.id, mediaStream);
            const unknownUserName = 'Unknown';
            peersRef.current.push({ peer, userId: data.userId, userName: unknownUserName });
            peer.signal(data.signal);
            setPeers((prev) => [...prev, { peer, userId: data.userId, userName: unknownUserName }]);
          }
        });

        socket.on('user-disconnected', (userId: string) => {
          const peerObj = peersRef.current.find((p) => p.userId === userId);
          if (peerObj) peerObj.peer.destroy();
          peersRef.current = peersRef.current.filter((p) => p.userId !== userId);
          setPeers((prev) => prev.filter((p) => p.userId !== userId));
        });
      } catch (err) {
        console.error('Failed to initialize media stream:', err);
        setError('Could not access camera/microphone. Please check permissions.');
      }
    };

    init();

    return () => {
      stream?.getTracks().forEach((track) => track.stop());
      socket.off('all-users');
      socket.off('user-connected');
      socket.off('signal');
      socket.off('user-disconnected');
    };
  }, [socket, roomId, userName]);

  useEffect(() => {
    if (myVideo.current && stream) {
      myVideo.current.srcObject = stream;
      myVideo.current.play().catch((err) => console.error('Failed to play local video:', err));
    }
  }, [stream]);

  const createPeer = (userToSignal: string, callerId: string, stream: MediaStream) => {
    const peer = new SimplePeer({
      initiator: true,
      trickle: true,
      stream,
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
    });

    peer.on('signal', (signal) => {
      socket.emit('signal', { userId: userToSignal, signal });
    });

    peer.on('error', (err) => console.error('Peer error in createPeer:', err));
    return peer;
  };

  const addPeer = (incomingUserId: string, callerId: string, stream: MediaStream) => {
    const peer = new SimplePeer({
      initiator: false,
      trickle: true,
      stream,
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] },
    });

    peer.on('signal', (signal) => {
      socket.emit('signal', { userId: incomingUserId, signal });
    });

    peer.on('error', (err) => console.error('Peer error in addPeer:', err));
    return peer;
  };

  const toggleAudio = () => {
    if (stream) {
      stream.getAudioTracks()[0].enabled = !audioEnabled;
      setAudioEnabled(!audioEnabled);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks()[0].enabled = !videoEnabled;
      setVideoEnabled(!videoEnabled);
    }
  };

  const leaveCall = () => {
    stream?.getTracks().forEach((track) => track.stop());
    socket.disconnect();
    window.location.reload();
  };

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Room: {roomId}</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '10px',
          justifyItems: 'center',
        }}
      >
        {stream && (
          <div>
            <video ref={myVideo} autoPlay muted style={{ width: '100%', maxWidth: '300px' }} />
            <p>{userName} (You)</p>
          </div>
        )}
        {peers.map((peer) => (
          <Video key={peer.userId} peer={peer.peer} userName={peer.userName} />
        ))}
      </div>
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <button onClick={toggleAudio} disabled={!stream}>
          {audioEnabled ? 'Mute' : 'Unmute'}
        </button>
        <button onClick={toggleVideo} disabled={!stream}>
          {videoEnabled ? 'Stop Video' : 'Start Video'}
        </button>
        <button onClick={leaveCall}>Leave Call</button>
      </div>
    </div>
  );
};

const Video: React.FC<{ peer: SimplePeer.Instance; userName: string }> = ({ peer, userName }) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleStream = (stream: MediaStream) => {
      if (ref.current) {
        ref.current.srcObject = stream;
        ref.current.play().catch((err) => console.error(`Failed to play video for ${userName}:`, err));
      }
    };

    const handleError = (err: Error) => {
      console.error(`Video component peer error for ${userName}:`, err);
    };

    peer.on('stream', handleStream);
    peer.on('error', handleError);

    return () => {
      // Remove specific listeners using their references
      peer.off('stream', handleStream);
      peer.off('error', handleError);
    };
  }, [peer, userName]);

  return (
    <div>
      <video ref={ref} autoPlay style={{ width: '100%', maxWidth: '300px' }} />
      <p>{userName}</p>
    </div>
  );
};

export default VideoCall;