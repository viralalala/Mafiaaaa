import { useState, useEffect } from 'react';
import { useSocket } from './hooks/useSocket';
import { useWebRTC } from './hooks/useWebRTC';
import { cn } from './lib/utils';
import { Users, Moon, Sun, Shield, Search, Skull, Info, X } from 'lucide-react';

export default function App() {
  const { socket, isConnected } = useSocket();
  const [username, setUsername] = useState('');
  const [lobbyIdInput, setLobbyIdInput] = useState('');
  const [lobby, setLobby] = useState<any>(null);
  const [myPlayer, setMyPlayer] = useState<any>(null);
  const [error, setError] = useState('');
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [actionTarget, setActionTarget] = useState<string | null>(null);
  const [detectiveResult, setDetectiveResult] = useState<{ targetId: string, isMafia: boolean } | null>(null);

  const { streams } = useWebRTC(
    lobby?.state !== 'waiting' ? socket : null,
    myPlayer?.id,
    lobby?.players || [],
    lobby?.state,
    myPlayer?.role
  );

  useEffect(() => {
    if (!socket) return;

    socket.on('lobby_update', (updatedLobby) => {
      setLobby(updatedLobby);
      const me = updatedLobby.players.find((p: any) => p.id === socket.id);
      if (me) setMyPlayer(me);
    });

    socket.on('game_started', (data) => {
      setLobby(data);
      setMyPlayer((prev: any) => ({ ...prev, role: data.myRole }));
      setActionTarget(null);
      setDetectiveResult(null);
    });

    socket.on('phase_change', ({ phase, dayNumber, killedPlayer }) => {
      setLobby((prev: any) => ({ ...prev, state: phase, dayNumber, votes: {}, nightActions: {} }));
      setActionTarget(null);
      if (killedPlayer && killedPlayer.id === myPlayer?.id) {
        setMyPlayer((prev: any) => ({ ...prev, isAlive: false }));
      }
    });

    socket.on('votes_updated', (votes) => {
      setLobby((prev: any) => ({ ...prev, votes }));
    });

    socket.on('detective_result', (result) => {
      setDetectiveResult(result);
    });

    socket.on('game_over', ({ winner }) => {
      alert(`Game Over! ${winner} wins!`);
      setLobby((prev: any) => ({ ...prev, state: 'waiting' }));
    });

    return () => {
      socket.off('lobby_update');
      socket.off('game_started');
      socket.off('phase_change');
      socket.off('votes_updated');
      socket.off('detective_result');
      socket.off('game_over');
    };
  }, [socket, myPlayer?.id]);

  const createLobby = () => {
    if (!username) return setError('Username required');
    socket?.emit('create_lobby', { username }, (res: any) => {
      if (res.success) {
        setMyPlayer(res.player);
      }
    });
  };

  const joinLobby = () => {
    if (!username || !lobbyIdInput) return setError('Username and Lobby ID required');
    socket?.emit('join_lobby', { username, lobbyId: lobbyIdInput }, (res: any) => {
      if (res.success) {
        setMyPlayer(res.player);
      } else {
        setError(res.error);
      }
    });
  };

  const startGame = () => {
    socket?.emit('start_game', { lobbyId: lobby.id });
  };

  const handleAction = () => {
    if (!actionTarget) return;
    if (lobby.state === 'day') {
      socket?.emit('vote', { lobbyId: lobby.id, targetId: actionTarget });
    } else if (lobby.state === 'night') {
      socket?.emit('night_action', { lobbyId: lobby.id, targetId: actionTarget });
    }
  };

  if (!isConnected) {
    return <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center">Connecting to server...</div>;
  }

  if (!lobby) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold tracking-tighter mb-2">MAFIA</h1>
            <p className="text-zinc-400">A game of deception and deduction.</p>
          </div>

          <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 space-y-6 shadow-2xl">
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-700 transition-all"
                  placeholder="Enter your name"
                />
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <button
                  onClick={createLobby}
                  className="w-full bg-zinc-100 text-zinc-950 font-semibold rounded-lg px-4 py-3 hover:bg-white transition-colors"
                >
                  Create New Lobby
                </button>
              </div>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-zinc-800"></div>
                <span className="flex-shrink-0 mx-4 text-zinc-500 text-xs uppercase tracking-wider">Or join existing</span>
                <div className="flex-grow border-t border-zinc-800"></div>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={lobbyIdInput}
                  onChange={(e) => setLobbyIdInput(e.target.value.toUpperCase())}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-700 transition-all uppercase"
                  placeholder="Lobby ID"
                  maxLength={6}
                />
                <button
                  onClick={joinLobby}
                  className="w-full bg-zinc-800 text-zinc-100 font-semibold rounded-lg px-4 py-3 hover:bg-zinc-700 transition-colors"
                >
                  Join Lobby
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isHost = myPlayer?.isHost;
  const isAlive = myPlayer?.isAlive;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-widest">MAFIA</h1>
            <div className="px-3 py-1 bg-zinc-900 rounded-full text-xs font-mono text-zinc-400 border border-zinc-800">
              ID: {lobby.id}
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {lobby.state !== 'waiting' && (
              <div className="flex items-center gap-2 px-4 py-1.5 bg-zinc-900 rounded-full border border-zinc-800">
                {lobby.state === 'day' ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4 text-blue-400" />}
                <span className="text-sm font-medium capitalize">{lobby.state} {lobby.dayNumber}</span>
              </div>
            )}
            <button onClick={() => setShowHowToPlay(true)} className="p-2 text-zinc-400 hover:text-zinc-100 transition-colors">
              <Info className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 flex flex-col lg:flex-row gap-6">
        
        {/* Left Column: Game Info & Actions */}
        <div className="w-full lg:w-80 flex flex-col gap-6">
          {/* My Status Card */}
          <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn("w-3 h-3 rounded-full", isAlive ? "bg-green-500" : "bg-red-500")} />
              <h2 className="text-lg font-semibold">{myPlayer?.username}</h2>
            </div>
            
            {lobby.state !== 'waiting' && (
              <div className="space-y-4">
                <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800/50">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Your Role</p>
                  <p className={cn(
                    "text-xl font-bold",
                    myPlayer?.role === 'Mafia' ? "text-red-400" :
                    myPlayer?.role === 'Doctor' ? "text-emerald-400" :
                    myPlayer?.role === 'Detective' ? "text-blue-400" : "text-zinc-100"
                  )}>
                    {myPlayer?.role}
                  </p>
                </div>

                {!isAlive && (
                  <div className="p-4 bg-red-950/30 border border-red-900/50 rounded-xl text-red-400 text-sm">
                    You have been eliminated. You can observe but not participate.
                  </div>
                )}

                {detectiveResult && (
                  <div className="p-4 bg-blue-950/30 border border-blue-900/50 rounded-xl text-blue-400 text-sm">
                    Investigation Result: {lobby.players.find((p:any) => p.id === detectiveResult.targetId)?.username} is {detectiveResult.isMafia ? 'Mafia' : 'Not Mafia'}.
                  </div>
                )}
              </div>
            )}

            {lobby.state === 'waiting' && isHost && (
              <button
                onClick={startGame}
                disabled={lobby.players.length < 3}
                className="w-full mt-6 bg-zinc-100 text-zinc-950 font-semibold rounded-lg px-4 py-3 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Game
              </button>
            )}
            {lobby.state === 'waiting' && !isHost && (
              <p className="mt-6 text-sm text-zinc-500 text-center">Waiting for host to start...</p>
            )}
          </div>

          {/* Action Panel */}
          {lobby.state !== 'waiting' && isAlive && (
            <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">
                {lobby.state === 'day' ? 'Day Vote' : 'Night Action'}
              </h3>
              
              {((lobby.state === 'day') || (lobby.state === 'night' && myPlayer?.role !== 'Villager')) ? (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-300">
                    {lobby.state === 'day' ? 'Select a player to vote for elimination.' : 
                     myPlayer?.role === 'Mafia' ? 'Select a player to eliminate.' :
                     myPlayer?.role === 'Doctor' ? 'Select a player to protect.' :
                     'Select a player to investigate.'}
                  </p>
                  <button
                    onClick={handleAction}
                    disabled={!actionTarget}
                    className="w-full bg-zinc-100 text-zinc-950 font-semibold rounded-lg px-4 py-3 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirm {lobby.state === 'day' ? 'Vote' : 'Action'}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">You have no actions during the night. Wait for day.</p>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Player Grid */}
        <div className="flex-1 bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-zinc-400" />
              Players ({lobby.players.length})
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {lobby.players.map((player: any) => {
              const isMe = player.id === myPlayer?.id;
              const isSelected = actionTarget === player.id;
              const canBeTargeted = isAlive && !isMe && player.isAlive && (
                lobby.state === 'day' || 
                (lobby.state === 'night' && myPlayer?.role !== 'Villager')
              );
              
              const votesReceived = Object.values(lobby.votes || {}).filter(v => v === player.id).length;

              return (
                <div
                  key={player.id}
                  onClick={() => canBeTargeted && setActionTarget(player.id)}
                  className={cn(
                    "relative p-4 rounded-xl border transition-all",
                    !player.isAlive ? "bg-zinc-950 border-zinc-900 opacity-50 grayscale" :
                    isSelected ? "bg-zinc-800 border-zinc-500 shadow-[0_0_15px_rgba(255,255,255,0.1)]" :
                    canBeTargeted ? "bg-zinc-900 border-zinc-800 hover:border-zinc-700 cursor-pointer" :
                    "bg-zinc-900 border-zinc-800"
                  )}
                >
                  {/* Audio Element for WebRTC */}
                  {streams[player.id] && (
                    <audio
                      autoPlay
                      ref={(audio) => {
                        if (audio && audio.srcObject !== streams[player.id]) {
                          audio.srcObject = streams[player.id];
                        }
                      }}
                    />
                  )}

                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center relative">
                      {player.isAlive ? (
                        <Users className="w-6 h-6 text-zinc-400" />
                      ) : (
                        <Skull className="w-6 h-6 text-zinc-600" />
                      )}
                      {streams[player.id] && player.isAlive && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-zinc-900" />
                      )}
                    </div>
                    
                    <div>
                      <p className="font-medium text-sm truncate w-full px-2">
                        {player.username} {isMe && "(You)"}
                      </p>
                      {player.role && (
                        <p className={cn(
                          "text-xs mt-1",
                          player.role === 'Mafia' ? "text-red-400" : "text-zinc-500"
                        )}>
                          {player.role}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Vote Indicators */}
                  {lobby.state === 'day' && votesReceived > 0 && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center text-xs font-bold border border-red-500/30">
                      {votesReceived}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* How to Play Drawer */}
      {showHowToPlay && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowHowToPlay(false)} />
          <div className="relative w-full max-w-md bg-zinc-900 h-full border-l border-zinc-800 p-6 overflow-y-auto shadow-2xl animate-in slide-in-from-right">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">How to Play</h2>
              <button onClick={() => setShowHowToPlay(false)} className="p-2 text-zinc-400 hover:text-zinc-100">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-8 text-zinc-300">
              <section>
                <h3 className="text-lg font-semibold text-zinc-100 mb-2 flex items-center gap-2">
                  <Moon className="w-5 h-5 text-blue-400" /> Night Phase
                </h3>
                <p className="text-sm leading-relaxed">
                  The town sleeps. Voice chat is muted for everyone except the Mafia. 
                  Special roles perform their actions secretly.
                </p>
                <ul className="mt-4 space-y-3 text-sm">
                  <li className="flex gap-3"><span className="text-red-400 font-bold">Mafia:</span> Choose a player to eliminate.</li>
                  <li className="flex gap-3"><span className="text-emerald-400 font-bold">Doctor:</span> Choose a player to protect from elimination.</li>
                  <li className="flex gap-3"><span className="text-blue-400 font-bold">Detective:</span> Investigate a player to learn if they are Mafia.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-zinc-100 mb-2 flex items-center gap-2">
                  <Sun className="w-5 h-5 text-yellow-500" /> Day Phase
                </h3>
                <p className="text-sm leading-relaxed">
                  The town wakes up. Voice chat is active for all living players. 
                  Discuss who you suspect is the Mafia and vote to eliminate them. 
                  The player with the most votes is eliminated.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">Win Conditions</h3>
                <ul className="space-y-2 text-sm">
                  <li><span className="text-zinc-100 font-medium">Town Wins:</span> All Mafia members are eliminated.</li>
                  <li><span className="text-red-400 font-medium">Mafia Wins:</span> Mafia members equal or outnumber the remaining Town members.</li>
                </ul>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
