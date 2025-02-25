import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import LandingPage from './pages/LandingPage/LandingPage';
import VideoCall from './components/VideoCall';
import { Toaster } from './components/ui/sonner.tsx'
import { ThemeProvider } from './components/theme-provider.tsx';

const socket = io('http://localhost:5000');

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
    <Toaster />
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage socket={socket} />} />
        <Route path="/room/:roomId/:userName" element={ <VideoCall socket={socket} /> } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
    </ThemeProvider>
  );
}



export default App;
