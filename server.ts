import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Server } from 'socket.io';
import http from 'http';
import path from 'path';

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*' }
  });

  const PORT = 3000;

  // --- Socket.io Game Logic ---
  const rooms = new Map();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', (roomId, userProfile) => {
      socket.join(roomId);
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          players: [],
          phase: 'lobby', // lobby, night, day
          rolesAssigned: false,
        });
      }
      
      const room = rooms.get(roomId);
      room.players.push({ id: socket.id, ...userProfile, isAlive: true, role: null });
      
      io.to(roomId).emit('room_update', room);
      
      // WebRTC Signaling
      socket.to(roomId).emit('user_joined', { signal: null, callerID: socket.id });
    });

    socket.on('start_game', (roomId) => {
      const room = rooms.get(roomId);
      if (room && room.players.length >= 4) {
        // Assign roles: 1 Mafia, 1 Seer, 1 Doctor, rest Villagers
        const roles = ['mafia', 'seer', 'doctor', ...Array(room.players.length - 3).fill('villager')];
        // Shuffle roles
        roles.sort(() => Math.random() - 0.5);
        
        room.players.forEach((p, i) => {
          p.role = roles[i];
          io.to(p.id).emit('role_assign', p.role);
        });
        
        room.phase = 'night';
        room.rolesAssigned = true;
        io.to(roomId).emit('phase_change', room.phase);
        io.to(roomId).emit('room_update', room);
      }
    });

    // WebRTC Signaling Events
    socket.on('sending_signal', payload => {
      io.to(payload.userToSignal).emit('user_joined', { signal: payload.signal, callerID: socket.id });
    });

    socket.on('returning_signal', payload => {
      io.to(payload.callerID).emit('receiving_returned_signal', { signal: payload.signal, id: socket.id });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      // Handle player leaving rooms
      rooms.forEach((room, roomId) => {
        const index = room.players.findIndex(p => p.id === socket.id);
        if (index !== -1) {
          room.players.splice(index, 1);
          io.to(roomId).emit('room_update', room);
        }
      });
    });
  });

  // --- Vite Middleware ---
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

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
