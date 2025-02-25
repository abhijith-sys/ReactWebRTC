import { useEffect, useRef, useState } from "react";
import SimplePeer from "simple-peer";
import { Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Mic,
  Video as VIcon,
  Share2,
  Send,
  MicOff,
  VideoOff,
} from "lucide-react";
import { ScrollArea, ScrollBar } from "./ui/scroll-area";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";
import { ModeToggle } from "./mode-toggle";

// Dummy chat messages
const messages = [
  {
    id: 1,
    sender: "Rendra",
    time: "09:32",
    content: "I think we should add more idea",
  },
  { id: 2, sender: "Lucas Do", time: "09:32", content: "Agree with that! 🔥" },
  {
    id: 3,
    sender: "Caroline J.",
    time: "09:33",
    content: "https://dribbble.com/odamastudio/members",
    isLink: true,
  },
  {
    id: 4,
    sender: "You",
    time: "09:33",
    content: 'Let\'s add "How we work" section',
  },
  {
    id: 5,
    sender: "Caroline J.",
    time: "09:33",
    content: "Yes, let's say we're the solution then",
  },
  {
    id: 6,
    sender: "Lucas Do",
    time: "09:32",
    content: "Fear enough! Let's rock, guys!",
  },
];
interface Props {
  socket: Socket;
}

interface PeerData {
  peer: SimplePeer.Instance;
  userId: string;
  userName: string;
}

const VideoCall: React.FC<Props> = ({ socket }) => {
  const { roomId, userName } = useParams();
  const [peers, setPeers] = useState<PeerData[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
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
        socket.emit("join-room", roomId, socket.id, userName);

        socket.on(
          "all-users",
          (users: { userId: string; userName: string }[]) => {
            if (!mediaStream) {
              setError("Stream unavailable");
              return;
            }
            const newPeers: PeerData[] = [];
            users.forEach(({ userId, userName }) => {
              if (!peersRef.current.some((p) => p.userId === userId)) {
                const peer = createPeer(userId, socket.id, mediaStream); // New user initiates
                newPeers.push({ peer, userId, userName });
                peersRef.current.push({ peer, userId, userName });
              }
            });
            setPeers((prev) => [...prev, ...newPeers]);
          }
        );

        socket.on(
          "user-connected",
          ({ userId, userName }: { userId: string; userName: string }) => {
            if (!mediaStream || userId === socket.id) return;
            if (!peersRef.current.some((p) => p.userId === userId)) {
              const peer = addPeer(userId, socket.id, mediaStream); // Existing users wait for offer
              peersRef.current.push({ peer, userId, userName });
              setPeers((prev) => [...prev, { peer, userId, userName }]);
            }
          }
        );

        socket.on("signal", (data: { userId: string; signal: any }) => {
          const item = peersRef.current.find((p) => p.userId === data.userId);
          if (item && !item.peer.destroyed) {
            const signalKey =
              data.signal.sdp || JSON.stringify(data.signal.candidate || {});
            if (!processedSignals.current.has(signalKey)) {
              processedSignals.current.add(signalKey);
              console.log(`Signaling ${data.userId} with`, data.signal);
              item.peer.signal(data.signal);
            }
          }
        });

        socket.on("user-disconnected", (userId: string) => {
          const peerObj = peersRef.current.find((p) => p.userId === userId);
          if (peerObj) peerObj.peer.destroy();
          peersRef.current = peersRef.current.filter(
            (p) => p.userId !== userId
          );
          setPeers((prev) => prev.filter((p) => p.userId !== userId));
        });
      } catch (err) {
        console.error("Failed to initialize media stream:", err);
        setError(
          "Could not access camera/microphone. Please check permissions."
        );
      }
    };

    init();

    return () => {
      stream?.getTracks().forEach((track) => track.stop());
      socket.off("all-users");
      socket.off("user-connected");
      socket.off("signal");
      socket.off("user-disconnected");
    };
  }, [socket, roomId, userName]);

  useEffect(() => {
    if (myVideo.current && stream) {
      myVideo.current.srcObject = stream;
      myVideo.current
        .play()
        .catch((err) => console.error("Failed to play local video:", err));
    }
  }, [stream]);

  const createPeer = (
    userToSignal: string,
    callerId: string,
    stream: MediaStream
  ) => {
    const peer = new SimplePeer({
      initiator: true,
      trickle: true,
      stream,
      config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] },
    });

    peer.on("signal", (signal) => {
      socket.emit("signal", { userId: userToSignal, signal });
    });

    peer.on("error", (err) => console.error("Peer error in createPeer:", err));
    peer.on("stream", (remoteStream) => {
      console.log(`Received stream from ${userToSignal}`);
      // Ensure the peer is in the state before updating
      const peerData = peersRef.current.find((p) => p.userId === userToSignal);
      if (peerData) peerData.peer = peer; // Update peer reference
    });

    return peer;
  };

  const addPeer = (
    incomingUserId: string,
    callerId: string,
    stream: MediaStream
  ) => {
    const peer = new SimplePeer({
      initiator: false,
      trickle: true,
      stream,
      config: { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] },
    });

    peer.on("signal", (signal) => {
      socket.emit("signal", { userId: incomingUserId, signal });
    });

    peer.on("error", (err) => console.error("Peer error in addPeer:", err));
    peer.on("stream", (remoteStream) => {
      console.log(`Received stream from ${incomingUserId}`);
      // Ensure the peer is in the state before updating
      const peerData = peersRef.current.find(
        (p) => p.userId === incomingUserId
      );
      if (peerData) peerData.peer = peer; // Update peer reference
    });

    return peer;
  };

  const toggleAudio = () => {
    if (stream) {
      toast(
        audioEnabled ? "You have muted your mic" : "Your mic is now unmuted"
      );

      stream.getAudioTracks()[0].enabled = !audioEnabled;
      setAudioEnabled(!audioEnabled);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      toast(
        videoEnabled ? "You have turned off your video" : "Your video is now on"
      );
      stream.getVideoTracks()[0].enabled = !videoEnabled;
      setVideoEnabled(!videoEnabled);
    }
  };

  const leaveCall = () => {
    stream?.getTracks().forEach((track) => track.stop());
    socket.disconnect();
    navigate(`/`);
  };

  if (error) {
    return (
      <div style={{ textAlign: "center", padding: "20px" }}>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-300 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-blue-600 rounded-lg">
            <VIcon className="w-5 h-5" />
          </div>
          <span className="text-sm">Room: {roomId}</span>
        </div>
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.pngs" />
            <AvatarFallback className="bg-slate-400 uppercase">
              {userName?.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <ModeToggle />
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1">
        {/* Video area */}
        <div className="flex-1 p-4">
          {/* Participant thumbnails */}
          <ScrollArea
            className="whitespace-nowrap rounded-md"
            style={{
              width: "calc(100vw -350px)",
            }}
          >
            <div className="min-h-28 flex gap-2 mb-4 w-max">
              {peers?.length > 0 ? (
                peers.map((participant) => (
                  <div key={participant.userId} className="relative">
                    <div className="w-48 h-28 bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden">
                      <Video
                        key={participant.userId}
                        peer={participant.peer}
                        userName={participant.userName}
                      />
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                      <span className="text-sm bg-black/50 px-2 py-1 rounded">
                        {participant.userName}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="relative">
                  <div className="w-48 h-28 bg-gray-200 dark:bg-gray-800 rounded-lg overflow-hidden"></div>
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                    <span className="text-sm bg-black/50 px-2 py-1 rounded">
                      No participants
                    </span>
                  </div>
                </div>
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* Main video */}
          <div className="relative rounded-lg overflow-hidden h-[calc(100vh-280px)]">
            {stream && (
              <>
                <video
                  ref={myVideo}
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                />
                {!videoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <span className="text-white">
                      Your video is currently turned off
                    </span>
                  </div>
                )}
                <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1.5 rounded-lg">
                  <span>{userName} (You)</span>
                </div>
              </>
            )}
          </div>

          {/* Bottom controls */}
          <div className="flex items-center justify-between mt-4 px-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {roomId}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-500 dark:text-gray-400"
                onClick={() => navigator.clipboard.writeText(roomId)}
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                size="icon"
                onClick={toggleAudio}
                disabled={!stream}
              >
                {audioEnabled ? (
                  <Mic className="w-4 h-4" />
                ) : (
                  <MicOff className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="bg-gray-200 dark:bg-gray-800"
                onClick={toggleVideo}
                disabled={!stream}
              >
                {videoEnabled ? (
                  <VIcon className="w-4 h-4" />
                ) : (
                  <VideoOff className="w-4 h-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="bg-gray-200 dark:bg-gray-800"
                onClick={() => {
                  navigator.clipboard.writeText(roomId);
                  toast("Room ID copied to clipboard");
                }}
              >
                <Share2 className="w-4 h-4" />
              </Button>
              <Button variant="destructive" onClick={leaveCall}>
                Leave Meet
              </Button>
            </div>
          </div>
        </div>

        {/* Chat sidebar */}
        <div className="w-80 border-l border-gray-300 dark:border-gray-800">
          <div className="h-full flex flex-col">
            <div className="flex-1 p-4 space-y-4 overflow-auto">
              {messages.map((message) => (
                <div key={message.id} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {message.sender}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {message.time}
                    </span>
                  </div>
                  <p
                    className={`text-sm ${
                      message.isLink
                        ? "text-blue-400"
                        : "text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {message.content}
                  </p>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-300 dark:border-gray-800">
              <div className="flex gap-2">
                <Input
                  className="bg-gray-200 dark:bg-gray-800 border-0"
                  placeholder="Write a message..."
                />
                <Button size="icon" className="bg-blue-600 hover:bg-blue-700">
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Video: React.FC<{ peer: SimplePeer.Instance; userName: string }> = ({
  peer,
  userName,
}) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleStream = (stream: MediaStream) => {
      if (ref.current && !ref.current.srcObject) {
        ref.current.srcObject = stream;
        ref.current
          .play()
          .catch((err) =>
            console.error(`Failed to play video for ${userName}:`,` err`)
          );
      }
    };

    const handleError = (err: Error) => {
      console.error(`Video component peer error for ${userName}`, `err`);
    };

    peer.on("stream", handleStream);
    peer.on("error", handleError);

    return () => {
      peer.off("stream", handleStream);
      peer.off("error", handleError);
    };
  }, [peer, userName]);

  return (
    <video ref={ref} autoPlay style={{ width: "100%", maxWidth: "300px" }}>
      <track kind="captions" />
    </video>
  );
};
export default VideoCall;