const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client/build')));

// Store rooms and users
const rooms = new Map();
const userConnections = new Map();

// Room class
class Room {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.users = new Map(); // Map<userId, { nickname, ws, peerId }>
    this.createdAt = new Date();
  }

  addUser(userId, nickname, ws, peerId) {
    if (this.users.has(userId)) {
      return false;
    }
    this.users.set(userId, { nickname, ws, peerId });
    return true;
  }

  removeUser(userId) {
    return this.users.delete(userId);
  }

  getUserByNickname(nickname) {
    for (let user of this.users.values()) {
      if (user.nickname === nickname) {
        return user;
      }
    }
    return null;
  }

  hasNickname(nickname) {
    return this.getUserByNickname(nickname) !== null;
  }

  isEmpty() {
    return this.users.size === 0;
  }

  getUsers() {
    return Array.from(this.users.entries()).map(([userId, user]) => ({
      userId,
      nickname: user.nickname,
      peerId: user.peerId
    }));
  }

  broadcast(message, excludeUserId = null) {
    this.users.forEach((user, userId) => {
      if (excludeUserId !== userId && user.ws.readyState === WebSocket.OPEN) {
        user.ws.send(JSON.stringify(message));
      }
    });
  }
}

// REST API endpoints

// Get all rooms
app.get('/api/rooms', (req, res) => {
  const roomsList = Array.from(rooms.values()).map(room => ({
    id: room.id,
    name: room.name,
    userCount: room.users.size,
    createdAt: room.createdAt
  }));
  res.json(roomsList);
});

// Create room
app.post('/api/rooms', (req, res) => {
  const { name } = req.body;
  
  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Room name is required' });
  }

  const roomId = uuidv4();
  const room = new Room(roomId, name);
  rooms.set(roomId, room);

  res.status(201).json({ id: roomId, name, message: 'Room created successfully' });
});

// Get room details
app.get('/api/rooms/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  res.json({
    id: room.id,
    name: room.name,
    users: room.getUsers(),
    userCount: room.users.size,
    createdAt: room.createdAt
  });
});

// WebSocket handling
wss.on('connection', (ws) => {
  const userId = uuidv4();
  let currentRoomId = null;
  let currentUser = null;

  userConnections.set(userId, { ws, roomId: null });

  console.log(`User connected: ${userId}`);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      handleWebSocketMessage(userId, message, ws);
    } catch (error) {
      console.error('Error parsing message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  ws.on('close', () => {
    console.log(`User disconnected: ${userId}`);
    
    if (currentRoomId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        room.removeUser(userId);
        
        // Notify others about user leaving
        room.broadcast({
          type: 'user_left',
          userId,
          users: room.getUsers()
        });

        // If room is empty, delete it
        if (room.isEmpty()) {
          rooms.delete(currentRoomId);
          console.log(`Room deleted: ${currentRoomId}`);
        }
      }
    }

    userConnections.delete(userId);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  function handleWebSocketMessage(userId, message, ws) {
    const { type, roomId, nickname, text, data: msgData } = message;

    switch (type) {
      case 'join_room':
        handleJoinRoom(userId, roomId, nickname, ws);
        break;
      
      case 'leave_room':
        handleLeaveRoom(userId, roomId);
        break;
      
      case 'chat_message':
        handleChatMessage(userId, roomId, text);
        break;
      
      case 'ice_candidate':
        handleIceCandidate(userId, roomId, msgData);
        break;
      
      case 'offer':
        handleOffer(userId, roomId, msgData);
        break;
      
      case 'answer':
        handleAnswer(userId, roomId, msgData);
        break;
      
      default:
        console.log('Unknown message type:', type);
    }
  }

  function handleJoinRoom(userId, roomId, nickname, ws) {
    if (!roomId || !nickname || nickname.trim() === '') {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Room ID and nickname are required' 
      }));
      return;
    }

    let room = rooms.get(roomId);
    
    if (!room) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Room not found' 
      }));
      return;
    }

    // Check if nickname already exists
    if (room.hasNickname(nickname)) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Nickname already taken in this room' 
      }));
      return;
    }

    const peerId = uuidv4();
    
    if (!room.addUser(userId, nickname, ws, peerId)) {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Could not join room' 
      }));
      return;
    }

    currentRoomId = roomId;
    currentUser = { userId, nickname, peerId };
    userConnections.set(userId, { ws, roomId });

    // Notify user they joined
    ws.send(JSON.stringify({
      type: 'joined_room',
      roomId,
      userId,
      peerId,
      users: room.getUsers()
    }));

    // Notify others about new user
    room.broadcast({
      type: 'user_joined',
      userId,
      nickname,
      peerId,
      users: room.getUsers()
    }, userId);

    console.log(`User ${nickname} joined room ${roomId}`);
  }

  function handleLeaveRoom(userId, roomId) {
    const room = rooms.get(roomId);
    
    if (!room) {
      return;
    }

    room.removeUser(userId);
    currentRoomId = null;
    currentUser = null;

    // Notify others
    room.broadcast({
      type: 'user_left',
      userId,
      users: room.getUsers()
    });

    // If room is empty, delete it
    if (room.isEmpty()) {
      rooms.delete(roomId);
      console.log(`Room deleted: ${roomId}`);
    }

    console.log(`User left room ${roomId}`);
  }

  function handleChatMessage(userId, roomId, text) {
    const room = rooms.get(roomId);
    
    if (!room || !currentUser) {
      return;
    }

    room.broadcast({
      type: 'chat_message',
      userId,
      nickname: currentUser.nickname,
      text,
      timestamp: new Date().toISOString()
    });
  }

  function handleIceCandidate(userId, roomId, data) {
    const room = rooms.get(roomId);
    
    if (!room) {
      return;
    }

    const { targetUserId, candidate } = data;
    const targetUser = room.users.get(targetUserId);

    if (targetUser && targetUser.ws.readyState === WebSocket.OPEN) {
      targetUser.ws.send(JSON.stringify({
        type: 'ice_candidate',
        from: userId,
        candidate
      }));
    }
  }

  function handleOffer(userId, roomId, data) {
    const room = rooms.get(roomId);
    
    if (!room) {
      return;
    }

    const { targetUserId, offer } = data;
    const targetUser = room.users.get(targetUserId);

    if (targetUser && targetUser.ws.readyState === WebSocket.OPEN) {
      targetUser.ws.send(JSON.stringify({
        type: 'offer',
        from: userId,
        offer
      }));
    }
  }

  function handleAnswer(userId, roomId, data) {
    const room = rooms.get(roomId);
    
    if (!room) {
      return;
    }

    const { targetUserId, answer } = data;
    const targetUser = room.users.get(targetUserId);

    if (targetUser && targetUser.ws.readyState === WebSocket.OPEN) {
      targetUser.ws.send(JSON.stringify({
        type: 'answer',
        from: userId,
        answer
      }));
    }
  }
});

// Serve React app for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build/index.html'));
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
