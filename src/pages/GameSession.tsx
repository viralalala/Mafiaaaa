import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Settings2 } from 'lucide-react';
import { useParams } from 'react-router-dom';

const ROLES = [
  { id: 'bodyguard', name: 'BODY GUARD', side: 'GOOD SIDE', color: 'from-gray-600 to-gray-800', image: 'https://picsum.photos/seed/guard/300/400', rating: 4.1 },
  { id: 'villager', name: 'VILLAGER', side: 'GOOD SIDE', color: 'from-green-400 to-green-600', image: 'https://picsum.photos/seed/villager/300/400', rating: 3.8 },
  { id: 'seer', name: 'SEER', side: 'GOOD SIDE', color: 'from-purple-400 to-purple-600', image: 'https://picsum.photos/seed/seer/300/400', rating: 4.8 },
  { id: 'werewolf', name: 'WEREWOLF', side: 'EVIL SIDE', color: 'from-red-400 to-red-600', image: 'https://picsum.photos/seed/wolf/300/400', rating: 4.7 },
  { id: 'oldman', name: 'OLD MAN', side: 'GOOD SIDE', color: 'from-orange-400 to-orange-600', image: 'https://picsum.photos/seed/oldman/300/400', rating: 4.2 },
  { id: 'witch', name: 'WITCH', side: 'GOOD SIDE', color: 'from-emerald-400 to-emerald-600', image: 'https://picsum.photos/seed/witch/300/400', rating: 4.5 },
  { id: 'hunter', name: 'HUNTER', side: 'GOOD SIDE', color: 'from-blue-400 to-blue-600', image: 'https://picsum.photos/seed/hunter/300/400', rating: 4.5 },
];

export function GameSession({ socket, username }: { socket: any, username: string }) {
  const { lobbyId } = useParams();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [flippedIndex, setFlippedIndex] = useState<number | null>(null);
  const [phase, setPhase] = useState<'lobby' | 'day' | 'night'>('lobby');
  const [players, setPlayers] = useState<any[]>([]);

  // Parallax for props
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e: React.MouseEvent) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 40;
    const y = (e.clientY / window.innerHeight - 0.5) * 40;
    setMousePos({ x, y });
  };

  useEffect(() => {
    if (!socket) return;

    socket.on('lobby_update', (data: any) => {
      setPlayers(data.players);
    });

    socket.on('phase_change', (newPhase: 'lobby' | 'day' | 'night') => {
      setPhase(newPhase);
    });

    return () => {
      socket.off('lobby_update');
      socket.off('phase_change');
    };
  }, [socket]);

  const handleCardClick = (index: number) => {
    if (flippedIndex === index) {
      setFlippedIndex(null);
    } else {
      setFlippedIndex(index);
    }
  };

  const handleStartGame = () => {
    socket?.emit('start_game', { lobbyId });
  };

  return (
    <div 
      className="w-full h-full relative flex flex-col items-center justify-start pt-12 overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      {/* Phase Overlay */}
      <AnimatePresence>
        {phase !== 'lobby' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 z-50 pointer-events-none flex items-center justify-center ${phase === 'night' ? 'bg-black/80' : 'bg-white/10'}`}
          >
            <motion.h1 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              className="text-9xl font-display uppercase tracking-widest text-white/50"
            >
              {phase}
            </motion.h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Props (Parallax) */}
      <motion.div 
        className="absolute left-[10%] top-[40%] w-32 h-32 opacity-60"
        animate={{ x: mousePos.x * -1.5, y: mousePos.y * -1.5, rotate: mousePos.x * 0.5 }}
        transition={{ type: 'spring', stiffness: 50, damping: 20 }}
      >
        {/* Broom Prop */}
        <div className="w-full h-full bg-[url('https://picsum.photos/seed/broom/100/100')] bg-contain bg-no-repeat bg-center mix-blend-screen filter drop-shadow-[0_0_15px_rgba(255,200,100,0.5)]"></div>
      </motion.div>

      <motion.div 
        className="absolute right-[10%] top-[40%] w-32 h-32 opacity-60"
        animate={{ x: mousePos.x * 1.5, y: mousePos.y * 1.5, rotate: mousePos.x * -0.5 }}
        transition={{ type: 'spring', stiffness: 50, damping: 20 }}
      >
        {/* Cauldron Prop */}
        <div className="w-full h-full bg-[url('https://picsum.photos/seed/cauldron/100/100')] bg-contain bg-no-repeat bg-center mix-blend-screen filter drop-shadow-[0_0_20px_rgba(100,255,100,0.5)]"></div>
      </motion.div>

      {/* Header Section */}
      <div className="text-center z-10 relative mb-16">
        <h1 className="text-[12rem] leading-[0.8] font-display uppercase tracking-tighter text-white drop-shadow-2xl">
          WEREWOLF.
        </h1>
        <h2 className="text-6xl font-display uppercase tracking-tight text-white/90 mb-6">
          LOBBY: {lobbyId}
        </h2>
        
        <div className="flex flex-col items-center mb-8">
          <h3 className="text-xl text-[#a3e635] font-mono mb-4">Players ({players.length})</h3>
          <div className="flex flex-wrap justify-center gap-4 max-w-2xl">
            {players.map((p, i) => (
              <div key={i} className="bg-white/10 px-4 py-2 rounded-full text-white font-mono">
                {p.username} {p.id === socket?.id ? '(You)' : ''}
              </div>
            ))}
          </div>
        </div>

        {phase === 'lobby' && (
          <button 
            onClick={handleStartGame}
            className="bg-[#a3e635] text-black font-bold text-xl px-12 py-4 rounded-full hover:bg-[#bef264] transition-colors shadow-[0_0_30px_rgba(163,230,53,0.3)]"
          >
            START GAME
          </button>
        )}
      </div>

      {/* Fanned Cards Section */}
      <div className="relative w-full max-w-5xl h-[500px] flex justify-center items-end mt-auto pb-10 z-20">
        {ROLES.map((role, index) => {
          const total = ROLES.length;
          const center = Math.floor(total / 2);
          const offset = index - center;
          
          // Calculate base transform
          const baseRotate = offset * 8;
          const baseY = Math.abs(offset) * 20;
          const baseX = offset * 80;
          
          const isHovered = hoveredIndex === index;
          const isFlipped = flippedIndex === index;
          
          return (
            <motion.div
              key={role.id}
              className="absolute bottom-0 w-64 h-96 cursor-pointer"
              initial={false}
              animate={{
                x: isHovered ? baseX : baseX,
                y: isHovered ? -40 : baseY,
                rotate: isHovered ? 0 : baseRotate,
                scale: isHovered ? 1.1 : 1,
                zIndex: isHovered || isFlipped ? 50 : 10 + index,
                rotateY: isFlipped ? 180 : 0
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => handleCardClick(index)}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Front of Card */}
              <div 
                className={`absolute inset-0 rounded-[32px] bg-gradient-to-br ${role.color} p-1 shadow-2xl overflow-hidden backface-hidden`}
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="w-full h-full rounded-[28px] bg-black/20 backdrop-blur-sm relative overflow-hidden border border-white/20">
                  {/* Pattern Overlay */}
                  <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')]"></div>
                  
                  {/* Content */}
                  <div className="relative z-10 p-6 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-white/80 mb-1">{role.side}</div>
                        <div className="text-3xl font-display uppercase leading-none text-white">{role.name}</div>
                      </div>
                      <div className="bg-white/20 backdrop-blur-md rounded-full px-2 py-1 flex items-center space-x-1">
                        <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                        <span className="text-xs font-bold text-white">{role.rating}</span>
                      </div>
                    </div>
                    
                    {/* Character Image */}
                    <div className="flex-1 relative mt-4">
                      <img 
                        src={role.image} 
                        alt={role.name} 
                        className="absolute inset-0 w-full h-full object-contain filter drop-shadow-2xl"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Back of Card */}
              <div 
                className={`absolute inset-0 rounded-[32px] bg-gray-900 p-6 shadow-2xl border border-white/10 flex flex-col`}
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <h3 className="text-2xl font-display uppercase text-white mb-4">{role.name} Details</h3>
                <p className="text-gray-400 text-sm font-mono flex-1">
                  This role belongs to the {role.side}. 
                  <br/><br/>
                  Abilities and rules description goes here. In the night phase, this player can perform special actions.
                </p>
                <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium transition-colors">
                  Select Role
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
