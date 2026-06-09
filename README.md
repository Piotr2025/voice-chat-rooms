
# 1. Zainstaluj zależności serwera
npm install

# 2. Zainstaluj zależności klienta
cd client && npm install && cd ..

# Terminal 1 - Serwer
npm start

# Terminal 2 - Klient
npm run client
# Voice Chat Rooms 🎤

A real-time voice and text chat application built with React, Node.js, WebRTC, and WebSocket.

## Features

✨ **No Authentication Required** - Join instantly with just a nickname

🎬 **Voice & Video Calls** - WebRTC peer-to-peer connections for crystal clear audio and video

💬 **Real-time Chat** - WebSocket-based messaging with all room participants

👥 **Room Management** - Create or join chat rooms

🚪 **Dynamic Room Updates** - User list updates automatically when people join/leave

🔄 **Auto Room Cleanup** - Rooms automatically close when the last person leaves

## Project Structure

```
voice-chat-rooms/
├── server.js                 # Express server with WebSocket
├── package.json             # Server dependencies
├── client/                  # React frontend
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json
│   ├── src/
│   │   ├── index.js
│   │   ├── index.css
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── pages/
│   │   │   ├── Lobby.js     # Room listing and creation
│   │   │   └── Room.js      # Video/chat room interface
│   │   ├── styles/
│   │   │   ├── Lobby.css
│   │   │   └── Room.css
│   │   └── utils/
│   │       ├── websocket.js # WebSocket client manager
│   │       └── webrtc.js    # WebRTC peer connection manager
│   └── package.json         # Client dependencies
└── README.md
```

## Installation

### Prerequisites
- Node.js 14+
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Piotr2025/voice-chat-rooms.git
   cd voice-chat-rooms
   ```

2. **Install server dependencies**
   ```bash
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

## Running the Application

### Development Mode

**Terminal 1 - Start the server:**
```bash
npm start
```
Server will run on `http://localhost:3001`

**Terminal 2 - Start the React development server:**
```bash
npm run client
```
Client will run on `http://localhost:3000`

### Production Mode

1. **Build the React app**
   ```bash
   npm run build
   ```

2. **Start the server**
   ```bash
   npm start
   ```

The application will be available at `http://localhost:3001`

## Usage

### Create a Room
1. Click "Create New Room" on the lobby page
2. Enter a room name and your nickname
3. Click "Create & Join"

### Join an Existing Room
1. Find a room in the list on the lobby page
2. Click "Join Room"
3. Enter your nickname
4. Click "Join Room" to enter

### In the Room
- **Video/Audio**: Your video stream is automatically shared with all room participants
- **Mute/Unmute**: Click the microphone button to toggle audio
- **Chat**: Send text messages using the chat box on the right
- **User List**: See who's currently in the room
- **Leave**: Click "Leave Room" to exit and return to the lobby

## API Reference

### REST Endpoints

#### GET /api/rooms
Get a list of all available rooms

**Response:**
```json
[
  {
    "id": "room-uuid",
    "name": "Room Name",
    "userCount": 2,
    "createdAt": "2024-01-01T12:00:00Z"
  }
]
```

#### POST /api/rooms
Create a new room

**Request:**
```json
{
  "name": "Room Name"
}
```

**Response:**
```json
{
  "id": "room-uuid",
  "name": "Room Name",
  "message": "Room created successfully"
}
```

#### GET /api/rooms/:roomId
Get room details

**Response:**
```json
{
  "id": "room-uuid",
  "name": "Room Name",
  "users": [
    {
      "userId": "user-uuid",
      "nickname": "John",
      "peerId": "peer-uuid"
    }
  ],
  "userCount": 1,
  "createdAt": "2024-01-01T12:00:00Z"
}
```

### WebSocket Events

#### Client → Server

**join_room**
```json
{
  "type": "join_room",
  "roomId": "room-uuid",
  "nickname": "John"
}
```

**leave_room**
```json
{
  "type": "leave_room",
  "roomId": "room-uuid"
}
```

**chat_message**
```json
{
  "type": "chat_message",
  "roomId": "room-uuid",
  "text": "Hello everyone!"
}
```

**offer, answer, ice_candidate**
WebRTC signaling messages (automatically handled by the application)

#### Server → Client

**joined_room**
```json
{
  "type": "joined_room",
  "roomId": "room-uuid",
  "userId": "user-uuid",
  "peerId": "peer-uuid",
  "users": [...]
}
```

**user_joined**
```json
{
  "type": "user_joined",
  "userId": "user-uuid",
  "nickname": "John",
  "peerId": "peer-uuid",
  "users": [...]
}
```

**user_left**
```json
{
  "type": "user_left",
  "userId": "user-uuid",
  "users": [...]
}
```

**chat_message**
```json
{
  "type": "chat_message",
  "userId": "user-uuid",
  "nickname": "John",
  "text": "Hello everyone!",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## Technical Stack

- **Frontend**: React 18, CSS3
- **Backend**: Node.js, Express
- **Real-time Communication**: WebSocket (ws), WebRTC
- **Signaling**: Custom WebSocket-based signaling for WebRTC
- **API**: REST API for room management

## Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Configuration

### Server Port
Edit `server.js` to change the port:
```javascript
const PORT = process.env.PORT || 3001;
```

### STUN Servers
Edit `client/src/utils/webrtc.js` to use different STUN servers:
```javascript
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:your-stun-server.com:19302' },
    // ... more servers
  ]
};
```

## Known Limitations

- Rooms are stored in memory and lost on server restart
- No persistent storage of messages or room history
- Audio/video quality depends on network conditions
- Limited to peer-to-peer connections (no SFU/MCU)

## Future Enhancements

- [ ] Database integration for persistent storage
- [ ] Recording functionality
- [ ] Screen sharing
- [ ] Mobile app
- [ ] Encryption and security improvements
- [ ] User profiles and customization
- [ ] Room access control (passwords, invite links)

## Troubleshooting

### "Permission denied" for camera/microphone
- Make sure your browser has permission to access camera and microphone
- Check browser settings under Privacy & Security

### No sound or video
- Check your browser's microphone/camera permissions
- Ensure you have a stable internet connection
- Try reloading the page

### WebSocket connection fails
- Check if the server is running
- Verify the server URL matches your deployment
- Check browser console for detailed error messages

## License

MIT

## Author

Created by Piotr2025

## Support

For issues or questions, please open an issue on GitHub.
