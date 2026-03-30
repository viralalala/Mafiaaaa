import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { GameHub } from './pages/GameHub';
import { GameSession } from './pages/GameSession';
import { useSocket } from './hooks/useSocket';

export default function App() {
  const { socket, isConnected } = useSocket();
  const [username, setUsername] = useState('');

  if (!isConnected) {
    return <div className="min-h-screen bg-[#111111] text-white flex items-center justify-center font-sans">Connecting to server...</div>;
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<GameHub socket={socket} username={username} setUsername={setUsername} />} />
          <Route path="/game/:lobbyId" element={<GameSession socket={socket} username={username} />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
