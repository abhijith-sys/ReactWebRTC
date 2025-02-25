import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import LandingPage from './pages/LandingPage.tsx';
import { Toaster } from './components/ui/sonner.tsx'
import { ThemeProvider } from './components/theme-provider.tsx';
import UsernamePrompt from './components/UsernamePrompt.tsx';
import { useState } from 'react';
import VideoCall from './pages/VideoCall.tsx';

const socket = io('http://localhost:5000');

function App() {
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);

  const ProtectedVideoCall = () => {
    const { roomId, userName } = useParams();

    const handleUsernameSubmit = () => {
      setShowUsernamePrompt(false);
    };

    if (!roomId) {
      return <Navigate to="/" />;
    }

    if (!userName) {
      setShowUsernamePrompt(true);
      return <UsernamePrompt open={showUsernamePrompt} onClose={handleUsernameSubmit} />;
    }

    return <VideoCall socket={socket} />;
  };

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Toaster />
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage socket={socket} />} />
          <Route path="/room/:roomId/:userName" element={<ProtectedVideoCall />} />
          <Route path="/room/:roomId" element={<ProtectedVideoCall />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}



export default App;
