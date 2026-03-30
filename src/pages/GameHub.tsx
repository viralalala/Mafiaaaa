import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const GAMES = [
  { id: 1, title: 'COUNCIL OF THE NIGHT', price: 54.99, oldPrice: 90.00, image: 'https://picsum.photos/seed/forest/800/1200' },
  { id: 2, title: 'THE SILENT WOODS', price: 54.99, image: 'https://picsum.photos/seed/woods/400/600' },
  { id: 3, title: 'BLOOD MOON RISING', price: 54.99, image: 'https://picsum.photos/seed/moon/400/600' },
  { id: 4, title: 'NIGHT OF JUDGEMENT', price: 54.99, image: 'https://picsum.photos/seed/night/400/600' },
  { id: 5, title: 'MOONLIT SHADOWS', price: 54.99, image: 'https://picsum.photos/seed/shadows/400/600' },
];

export function GameHub({ socket, username, setUsername }: { socket: any, username: string, setUsername: (u: string) => void }) {
  const navigate = useNavigate();
  const [activeGame, setActiveGame] = useState(0);
  const [lobbyId, setLobbyId] = useState('');
  const [error, setError] = useState('');
  
  // Parallax effect for background
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const x = (clientX / window.innerWidth - 0.5) * 20;
    const y = (clientY / window.innerHeight - 0.5) * 20;
    setMousePosition({ x, y });
  };

  const handleCreateLobby = () => {
    if (!username) return setError('Username required');
    socket?.emit('create_lobby', { username }, (res: any) => {
      if (res.success) {
        navigate(`/game/${res.lobbyId}`);
      }
    });
  };

  const handleJoinLobby = () => {
    if (!username || !lobbyId) return setError('Username and Lobby ID required');
    socket?.emit('join_lobby', { username, lobbyId }, (res: any) => {
      if (res.success) {
        navigate(`/game/${lobbyId}`);
      } else {
        setError(res.error || 'Failed to join');
      }
    });
  };

  return (
    <div 
      className="w-full h-full relative overflow-hidden flex items-center"
      onMouseMove={handleMouseMove}
    >
      {/* Parallax Background */}
      <motion.div 
        className="absolute inset-0 z-0"
        animate={{
          x: mousePosition.x * -1,
          y: mousePosition.y * -1,
        }}
        transition={{ type: 'spring', stiffness: 50, damping: 20 }}
      >
        <img 
          src={GAMES[activeGame].image} 
          alt="Background" 
          className="w-[110%] h-[110%] object-cover opacity-40 blur-sm -ml-[5%] -mt-[5%]"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent"></div>
      </motion.div>

      {/* Content */}
      <div className="relative z-10 w-full px-16 flex justify-between items-center h-full">
        
        {/* Left Info */}
        <div className="max-w-xl">
          <div className="flex space-x-4 mb-6 text-xs font-mono uppercase tracking-widest text-gray-400">
            <span className="bg-white/10 px-3 py-1 rounded-full">Open world</span>
            <span className="bg-white/10 px-3 py-1 rounded-full">Action</span>
            <span className="bg-white/10 px-3 py-1 rounded-full">Role playing</span>
          </div>

          <h2 className="text-xl font-medium tracking-widest mb-2">PLANET™ GAME</h2>
          <h1 className="text-7xl md:text-8xl font-display uppercase leading-[0.85] tracking-tight mb-6">
            {GAMES[activeGame].title.split(' ').map((word, i) => (
              <span key={i} className="block">{word}</span>
            ))}
          </h1>
          
          <p className="text-gray-400 text-lg mb-8 max-w-md leading-relaxed">
            Whispers and suspicion surround the council. Will you lead or be cast out?
          </p>

          <div className="flex items-center space-x-6 mb-8">
            <div className="text-4xl font-bold text-[#a3e635]">${GAMES[activeGame].price}</div>
            {GAMES[activeGame].oldPrice && (
              <div className="text-xl text-gray-500 line-through">${GAMES[activeGame].oldPrice}</div>
            )}
          </div>

          <div className="bg-black/40 backdrop-blur-md p-6 rounded-3xl border border-white/10 max-w-sm mb-8">
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <input 
              type="text" 
              placeholder="Your Username" 
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-4 outline-none focus:border-[#a3e635]"
            />
            <div className="flex space-x-4">
              <button 
                onClick={handleCreateLobby}
                className="flex-1 bg-[#a3e635] text-black font-bold rounded-xl py-3 hover:bg-[#bef264] transition-colors"
              >
                Create Game
              </button>
            </div>
            <div className="flex items-center space-x-4 mt-4">
              <input 
                type="text" 
                placeholder="Lobby ID" 
                value={lobbyId}
                onChange={e => setLobbyId(e.target.value.toUpperCase())}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-[#a3e635] uppercase"
              />
              <button 
                onClick={handleJoinLobby}
                className="bg-white/10 text-white font-bold rounded-xl px-6 py-3 hover:bg-white/20 transition-colors border border-white/10"
              >
                Join
              </button>
            </div>
          </div>

        </div>

        {/* Right Carousel */}
        <div className="flex-1 ml-20 relative h-[600px] flex items-center">
          <div className="flex space-x-6 overflow-x-visible absolute right-0">
            {GAMES.slice(1).map((game, idx) => (
              <motion.div 
                key={game.id}
                className="w-64 h-96 rounded-3xl overflow-hidden relative cursor-pointer group flex-shrink-0"
                whileHover={{ y: -10, scale: 1.02 }}
                onClick={() => setActiveGame(idx + 1)}
              >
                <img src={game.image} alt={game.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-6 flex flex-col justify-end">
                  <h3 className="text-xs text-gray-400 mb-1">PLANET™</h3>
                  <h2 className="text-2xl font-display uppercase leading-tight mb-2">{game.title}</h2>
                  <div className="text-[#a3e635] font-bold">${game.price}</div>
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Controls */}
          <div className="absolute bottom-10 left-0 flex space-x-4">
            <button className="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <button className="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center hover:bg-white/10 transition-colors">
              <ArrowRight size={20} />
            </button>
          </div>
        </div>

      </div>

      {/* Pagination Number */}
      <div className="absolute bottom-16 right-16 text-6xl font-display text-white/20">
        03
      </div>
    </div>
  );
}
