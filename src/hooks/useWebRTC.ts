import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

export const useWebRTC = (socket: Socket | null, myId: string | null, players: any[], phase: string, myRole: string | null) => {
  const [streams, setStreams] = useState<{ [id: string]: MediaStream }>({});
  const peersRef = useRef<{ [id: string]: RTCPeerConnection }>({});
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!socket || !myId) return;

    const createPeer = (targetId: string, initiator: boolean) => {
      if (peersRef.current[targetId]) return peersRef.current[targetId];

      const peer = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          peer.addTrack(track, localStreamRef.current!);
        });
      }

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('webrtc_ice_candidate', { targetId, candidate: event.candidate });
        }
      };

      peer.ontrack = (event) => {
        setStreams(prev => ({ ...prev, [targetId]: event.streams[0] }));
      };

      if (initiator) {
        peer.createOffer().then(offer => {
          peer.setLocalDescription(offer);
          socket.emit('webrtc_offer', { targetId, offer });
        });
      }

      peersRef.current[targetId] = peer;
      return peer;
    };

    const initLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;
        
        // Mute local stream initially
        stream.getAudioTracks().forEach(track => track.enabled = false);
        
        // Now that we have the stream, connect to existing players
        players.forEach(p => {
          if (p.id !== myId && !peersRef.current[p.id]) {
            if (myId < p.id) {
              createPeer(p.id, true);
            }
          }
        });
      } catch (err) {
        console.error("Failed to get local stream", err);
      }
    };

    initLocalStream();

    const handleOffer = async ({ senderId, offer }: any) => {
      const peer = createPeer(senderId, false);
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit('webrtc_answer', { targetId: senderId, answer });
    };

    const handleAnswer = async ({ senderId, answer }: any) => {
      const peer = peersRef.current[senderId];
      if (peer) {
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    const handleIceCandidate = async ({ senderId, candidate }: any) => {
      const peer = peersRef.current[senderId];
      if (peer) {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    socket.on('webrtc_offer', handleOffer);
    socket.on('webrtc_answer', handleAnswer);
    socket.on('webrtc_ice_candidate', handleIceCandidate);

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      (Object.values(peersRef.current) as RTCPeerConnection[]).forEach(peer => peer.close());
      socket.off('webrtc_offer', handleOffer);
      socket.off('webrtc_answer', handleAnswer);
      socket.off('webrtc_ice_candidate', handleIceCandidate);
    };
  }, [socket, myId]); // Only run once when socket/myId is set

  // Handle phase changes (mute/unmute)
  useEffect(() => {
    if (!localStreamRef.current) return;

    const isMafia = myRole === 'Mafia';
    const isAlive = players.find(p => p.id === myId)?.isAlive;

    if (!isAlive) {
      localStreamRef.current.getAudioTracks().forEach(track => track.enabled = false);
      return;
    }

    if (phase === 'day') {
      localStreamRef.current.getAudioTracks().forEach(track => track.enabled = true);
    } else if (phase === 'night') {
      localStreamRef.current.getAudioTracks().forEach(track => track.enabled = isMafia);
    } else {
      localStreamRef.current.getAudioTracks().forEach(track => track.enabled = false);
    }
  }, [phase, myRole, players, myId]);

  // Handle incoming streams mute/unmute based on phase and role
  useEffect(() => {
    const isMafia = myRole === 'Mafia';
    
    (Object.entries(streams) as [string, MediaStream][]).forEach(([peerId, stream]) => {
      const peerPlayer = players.find(p => p.id === peerId);
      if (!peerPlayer || !peerPlayer.isAlive) {
         stream.getAudioTracks().forEach(track => track.enabled = false);
         return;
      }

      if (phase === 'day') {
        stream.getAudioTracks().forEach(track => track.enabled = true);
      } else if (phase === 'night') {
        // In night, I can only hear them if I am Mafia AND they are Mafia
        const canHear = isMafia && peerPlayer.role === 'Mafia';
        stream.getAudioTracks().forEach(track => track.enabled = canHear);
      } else {
        stream.getAudioTracks().forEach(track => track.enabled = false);
      }
    });
  }, [phase, myRole, players, streams]);

  return { streams };
};
