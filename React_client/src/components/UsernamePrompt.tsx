import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

interface UsernamePromptProps {
  open: boolean;
  onClose: (userName: string) => void;
}

const UsernamePrompt: React.FC<UsernamePromptProps> = ({ open, onClose }) => {
  const [tempUserName, setTempUserName] = useState("");
  const { roomId } = useParams();
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (tempUserName.trim()) {
      onClose(tempUserName.trim());
      navigate(`/room/${roomId}/${tempUserName.trim()}`);
    }
  };

  if (!open) return null;

  return (
<div className="fixed inset-0 flex items-center justify-center backdrop-blur-md bg-black/30">
      <div className="bg-white/90 p-6 rounded-lg shadow-lg w-96 border border-white/20">
        <h2 className="text-xl font-semibold text-center mb-4 text-black">
          Enter Your Name
        </h2>
        <Input
          type="text"
          placeholder="Your name"
          value={tempUserName}
          onChange={(e) => setTempUserName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="text-black"
        />
        <div className="flex justify-between mt-4">
          <Button
            onClick={handleSubmit}
            disabled={!tempUserName.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
          >
            Join Room
          </Button>
          <Button onClick={() => navigate("/")}>Cancel</Button>
        </div>
      </div>
    </div>
  );
};

export default UsernamePrompt;
