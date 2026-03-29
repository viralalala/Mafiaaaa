import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
    },
  });

  // API routes FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Game State
  const lobbies = new Map();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('create_lobby', ({ username }, callback) => {
      const lobbyId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const player = { id: socket.id, username, isHost: true, role: null, isAlive: true };
      lobbies.set(lobbyId, {
        id: lobbyId,
        players: [player],
        state: 'waiting', // waiting, night, day
        dayNumber: 0,
        votes: {},
        nightActions: {}
      });
      socket.join(lobbyId);
      callback({ success: true, lobbyId, player });
      io.to(lobbyId).emit('lobby_update', lobbies.get(lobbyId));
    });

    socket.on('join_lobby', ({ username, lobbyId }, callback) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby) {
        return callback({ success: false, error: 'Lobby not found' });
      }
      if (lobby.state !== 'waiting') {
        return callback({ success: false, error: 'Game already started' });
      }
      const player = { id: socket.id, username, isHost: false, role: null, isAlive: true };
      lobby.players.push(player);
      socket.join(lobbyId);
      callback({ success: true, lobbyId, player });
      io.to(lobbyId).emit('lobby_update', lobby);
    });

    socket.on('start_game', ({ lobbyId }) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby) return;
      
      const host = lobby.players.find((p: any) => p.isHost);
      if (host.id !== socket.id) return;

      // Assign roles
      const roles = ['Mafia', 'Doctor', 'Detective'];
      const numPlayers = lobby.players.length;
      const numMafia = Math.max(1, Math.floor(numPlayers / 4));
      
      let availableRoles = [];
      for (let i = 0; i < numMafia; i++) availableRoles.push('Mafia');
      if (numPlayers >= 4) availableRoles.push('Doctor');
      if (numPlayers >= 5) availableRoles.push('Detective');
      
      while (availableRoles.length < numPlayers) {
        availableRoles.push('Villager');
      }

      // Shuffle roles
      availableRoles.sort(() => Math.random() - 0.5);

      lobby.players.forEach((p: any, i: number) => {
        p.role = availableRoles[i];
      });

      lobby.state = 'night';
      lobby.dayNumber = 1;
      lobby.nightActions = {};
      lobby.votes = {};

      // Send personalized game state
      lobby.players.forEach((p: any) => {
        const sanitizedPlayers = lobby.players.map((other: any) => ({
          id: other.id,
          username: other.username,
          isAlive: other.isAlive,
          isHost: other.isHost,
          // Only reveal role if it's the player themselves, or if both are Mafia
          role: (other.id === p.id || (p.role === 'Mafia' && other.role === 'Mafia')) ? other.role : null
        }));
        
        io.to(p.id).emit('game_started', {
          ...lobby,
          players: sanitizedPlayers,
          myRole: p.role
        });
      });

      io.to(lobbyId).emit('phase_change', { phase: 'night', dayNumber: 1 });
    });

    socket.on('night_action', ({ lobbyId, targetId }) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby || lobby.state !== 'night') return;

      const player = lobby.players.find((p: any) => p.id === socket.id);
      if (!player || !player.isAlive) return;

      if (!lobby.nightActions[player.role]) {
        lobby.nightActions[player.role] = {};
      }
      lobby.nightActions[player.role][socket.id] = targetId;

      // Check if all alive special roles have acted
      const aliveMafia = lobby.players.filter((p: any) => p.role === 'Mafia' && p.isAlive);
      const aliveDoctor = lobby.players.filter((p: any) => p.role === 'Doctor' && p.isAlive);
      const aliveDetective = lobby.players.filter((p: any) => p.role === 'Detective' && p.isAlive);

      const mafiaActed = Object.keys(lobby.nightActions['Mafia'] || {}).length === aliveMafia.length;
      const doctorActed = aliveDoctor.length === 0 || Object.keys(lobby.nightActions['Doctor'] || {}).length > 0;
      const detectiveActed = aliveDetective.length === 0 || Object.keys(lobby.nightActions['Detective'] || {}).length > 0;

      if (mafiaActed && doctorActed && detectiveActed) {
        // Resolve night actions
        // Simple resolution: Mafia kills most voted, Doctor saves
        const mafiaVotes = Object.values(lobby.nightActions['Mafia'] || {});
        let targetToKill = null;
        if (mafiaVotes.length > 0) {
           // Find most common vote
           const counts: any = {};
           mafiaVotes.forEach((v: any) => counts[v] = (counts[v] || 0) + 1);
           targetToKill = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
        }

        const doctorSave = Object.values(lobby.nightActions['Doctor'] || {})[0];
        
        let killedPlayer = null;
        if (targetToKill && targetToKill !== doctorSave) {
          const p = lobby.players.find((p: any) => p.id === targetToKill);
          if (p) {
            p.isAlive = false;
            killedPlayer = p;
          }
        }

        // Detective result is sent directly to detective
        const detectiveTarget = Object.values(lobby.nightActions['Detective'] || {})[0];
        if (detectiveTarget) {
          const det = aliveDetective[0];
          const target = lobby.players.find((p: any) => p.id === detectiveTarget);
          if (det && target) {
            io.to(det.id).emit('detective_result', { targetId: target.id, isMafia: target.role === 'Mafia' });
          }
        }

        lobby.state = 'day';
        lobby.nightActions = {};
        lobby.votes = {};

        io.to(lobbyId).emit('phase_change', { phase: 'day', dayNumber: lobby.dayNumber, killedPlayer });
        checkWinCondition(lobbyId);
      }
    });

    socket.on('vote', ({ lobbyId, targetId }) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby || lobby.state !== 'day') return;

      const player = lobby.players.find((p: any) => p.id === socket.id);
      if (!player || !player.isAlive) return;

      lobby.votes[socket.id] = targetId;
      io.to(lobbyId).emit('votes_updated', lobby.votes);

      const alivePlayers = lobby.players.filter((p: any) => p.isAlive);
      if (Object.keys(lobby.votes).length === alivePlayers.length) {
        // Resolve day vote
        const counts: any = {};
        Object.values(lobby.votes).forEach((v: any) => counts[v] = (counts[v] || 0) + 1);
        const maxVotes = Math.max(...Object.values(counts) as number[]);
        const targets = Object.keys(counts).filter(k => counts[k] === maxVotes);

        let killedPlayer = null;
        if (targets.length === 1) {
          const p = lobby.players.find((p: any) => p.id === targets[0]);
          if (p) {
            p.isAlive = false;
            killedPlayer = p;
          }
        }

        lobby.state = 'night';
        lobby.dayNumber++;
        lobby.votes = {};
        lobby.nightActions = {};

        io.to(lobbyId).emit('phase_change', { phase: 'night', dayNumber: lobby.dayNumber, killedPlayer });
        checkWinCondition(lobbyId);
      }
    });

    // WebRTC Signaling
    socket.on('webrtc_offer', ({ targetId, offer }) => {
      io.to(targetId).emit('webrtc_offer', { senderId: socket.id, offer });
    });

    socket.on('webrtc_answer', ({ targetId, answer }) => {
      io.to(targetId).emit('webrtc_answer', { senderId: socket.id, answer });
    });

    socket.on('webrtc_ice_candidate', ({ targetId, candidate }) => {
      io.to(targetId).emit('webrtc_ice_candidate', { senderId: socket.id, candidate });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      // Handle player disconnect
      lobbies.forEach((lobby, lobbyId) => {
        const playerIndex = lobby.players.findIndex((p: any) => p.id === socket.id);
        if (playerIndex !== -1) {
          lobby.players[playerIndex].isAlive = false;
          io.to(lobbyId).emit('lobby_update', lobby);
          checkWinCondition(lobbyId);
        }
      });
    });
  });

  function checkWinCondition(lobbyId: string) {
    const lobby = lobbies.get(lobbyId);
    if (!lobby) return;

    const aliveMafia = lobby.players.filter((p: any) => p.role === 'Mafia' && p.isAlive);
    const aliveTown = lobby.players.filter((p: any) => p.role !== 'Mafia' && p.isAlive);

    if (aliveMafia.length === 0) {
      io.to(lobbyId).emit('game_over', { winner: 'Town' });
      lobby.state = 'waiting';
    } else if (aliveMafia.length >= aliveTown.length) {
      io.to(lobbyId).emit('game_over', { winner: 'Mafia' });
      lobby.state = 'waiting';
    }
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
