import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

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
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-xl font-semibold text-center mb-4">Enter Your Name</h2>
        <input
          type="text"
          placeholder="Your name"
          value={tempUserName}
          onChange={(e) => setTempUserName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex justify-between mt-4">
          <button
            onClick={handleSubmit}
            disabled={!tempUserName.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
          >
            Join Room
          </button>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-gray-300 text-black rounded-lg hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default UsernamePrompt;
