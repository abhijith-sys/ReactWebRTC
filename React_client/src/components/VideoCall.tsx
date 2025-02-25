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
}

const VideoCall: React.FC<Props> = ({ socket, roomId, userName }) => {
  const [peers, setPeers] = useState<PeerData[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const myVideo = useRef<HTMLVideoElement>(null);
  const peersRef = useRef<PeerData[]>([]);
  const processedSignals = useRef<Set<string>>(new Set()); // Track processed signal SDPs

  useEffect(() => {
    const init = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        console.log('Media stream acquired:', mediaStream);
        console.log('Stream tracks:', mediaStream.getTracks());
        setStream(mediaStream);

        socket.emit('join-room', roomId, socket.id);

        socket.on('all-users', (users: string[]) => {
          console.log('All users received:', users);
          if (!mediaStream) {
            console.error('Stream not available for all-users');
            setError('Stream unavailable');
            return;
          }
          const newPeers: PeerData[] = [];
          const uniqueUsers = [...new Set(users)].filter((id) => id !== socket.id);
          uniqueUsers.forEach((userId) => {
            if (!peersRef.current.some((p) => p.userId === userId)) {
              try {
                const peer = createPeer(userId, socket.id, mediaStream);
                newPeers.push({ peer, userId });
                peersRef.current.push({ peer, userId });
              } catch (err) {
                console.error(`Failed to create peer for ${userId}:`, err);
              }
            }
          });
          console.log('Setting peers from all-users:', newPeers);
          setPeers(newPeers);
        });

        socket.on('user-connected', (userId: string) => {
          console.log('User connected:', userId);
          if (!mediaStream || userId === socket.id) return;
          if (!peersRef.current.some((p) => p.userId === userId)) {
            const peer = addPeer(userId, socket.id, mediaStream);
            peersRef.current.push({ peer, userId });
            setPeers((prev) => {
              const updated = [...prev, { peer, userId }];
              console.log('Updated peers after user-connected:', updated);
              return updated;
            });
          } else {
            console.log(`Peer ${userId} already exists, skipping`);
          }
        });

        socket.on('signal', (data: { userId: string; signal: any }) => {
          console.log('Received signal for:', data.userId, 'Signal:', data.signal);
          const item = peersRef.current.find((p) => p.userId === data.userId);
          if (item) {
            if (item.peer.destroyed) {
              console.warn(`Skipping signal for destroyed peer ${data.userId}`);
              return;
            }
            const signalKey = data.signal.sdp || JSON.stringify(data.signal.candidate);
            if (processedSignals.current.has(signalKey)) {
              console.log(`Duplicate signal ignored for ${data.userId}:`, data.signal);
              return;
            }
            processedSignals.current.add(signalKey);
            const signalingState = item.peer._pc.signalingState;
            console.log(`Peer ${data.userId} signaling state before signal:`, signalingState);
            try {
              item.peer.signal(data.signal);
            } catch (err) {
              console.error(`Failed to signal peer ${data.userId}:`, err);
            }
          } else if (data.signal.type === 'offer') {
            console.log(`No peer found for ${data.userId}, creating new peer`);
            const peer = addPeer(data.userId, socket.id, mediaStream);
            peersRef.current.push({ peer, userId: data.userId });
            peer.signal(data.signal);
            setPeers((prev) => [...prev, { peer, userId: data.userId }]);
          }
        });

        socket.on('user-disconnected', (userId: string) => {
          console.log('User disconnected:', userId);
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
      console.log('Cleaning up VideoCall');
      stream?.getTracks().forEach((track) => track.stop());
      socket.off('all-users');
      socket.off('user-connected');
      socket.off('signal');
      socket.off('user-disconnected');
    };
  }, [socket, roomId]);

  useEffect(() => {
    if (myVideo.current && stream) {
      console.log('Setting video source:', myVideo.current);
      myVideo.current.srcObject = stream;
      myVideo.current.play().catch((err) => console.error('Failed to play local video:', err));
    }
  }, [stream, myVideo]);

  const createPeer = (userToSignal: string, callerId: string, stream: MediaStream) => {
    console.log('createPeer inputs:', { userToSignal, callerId, stream });
    if (!stream || !stream.getTracks || stream.getTracks().length === 0) {
      throw new Error('Invalid or empty stream provided to createPeer');
    }

    const peer = new SimplePeer({
      initiator: true,
      trickle: true,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
        ],
      },
    });

    peer.on('signal', (signal) => {
      console.log('Signal event from initiator:', signal);
      socket.emit('signal', { userId: userToSignal, signal });
    });

    peer.on('error', (err) => {
      console.error('Peer error in createPeer:', err);
    });

    peer.on('connect', () => {
      console.log(`Connected to peer ${userToSignal}`);
    });

    peer.on('stream', (remoteStream) => {
      console.log(`Received remote stream from ${userToSignal}:`, remoteStream);
    });

    return peer;
  };

  const addPeer = (incomingUserId: string, callerId: string, stream: MediaStream) => {
    console.log('addPeer inputs:', { incomingUserId, callerId, stream });
    if (!stream || !stream.getTracks || stream.getTracks().length === 0) {
      throw new Error('Invalid or empty stream provided to addPeer');
    }

    const peer = new SimplePeer({
      initiator: false,
      trickle: true,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
        ],
      },
    });

    peer.on('signal', (signal) => {
      console.log('Signal event from receiver:', signal);
      socket.emit('signal', { userId: incomingUserId, signal });
    });

    peer.on('error', (err) => {
      console.error('Peer error in addPeer:', err);
    });

    peer.on('connect', () => {
      console.log(`Connected to peer ${incomingUserId}`);
    });

    peer.on('stream', (remoteStream) => {
      console.log(`Received remote stream from ${incomingUserId}:`, remoteStream);
    });

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
          <Video key={peer.userId} peer={peer.peer} userId={peer.userId} />
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

const Video: React.FC<{ peer: SimplePeer.Instance; userId: string }> = ({ peer, userId }) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleStream = (stream: MediaStream) => {
      console.log(`Video component received stream for peer ${userId}:`, stream);
      if (ref.current) {
        ref.current.srcObject = stream;
        ref.current.play().catch((err) => console.error(`Failed to play video for ${userId}:`, err));
      }
    };

    const handleError = (err: Error) => {
      console.error(`Video component peer error for ${userId}:`, err);
    };

    const handleClose = () => {
      console.log(`Peer connection closed for ${userId}`);
    };

    peer.on('stream', handleStream);
    peer.on('error', handleError);
    peer.on('close', handleClose);

    console.log(`Peer signaling state for ${userId}:`, peer._pc?.signalingState);

    return () => {
      peer.off('stream', handleStream);
      peer.off('error', handleError);
      peer.off('close', handleClose);
    };
  }, [peer, userId]);

  return <video ref={ref} autoPlay style={{ width: '100%', maxWidth: '300px' }} />;
};

export default VideoCall;