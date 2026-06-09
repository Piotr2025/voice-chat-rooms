# Voice Chat Rooms - Python Flask Version 🎤

A real-time voice and text chat application built with **Python/Flask**, **Flask-SocketIO**, **Bootstrap**, and **Alpine.js**.

## ✨ Features

- 🎤 **No authentication required** - Join instantly with just a nickname
- 📞 **WebRTC voice & video calls** - P2P connections for crystal clear audio and video
- 💬 **Real-time chat** - WebSocket-based messaging with all room participants
- 🎮 **Dynamic room management** - Create or join chat rooms instantly
- 👥 **Live user list** - Auto-updates when people join/leave
- 📋 **Swagger API documentation** - Full API docs at `/apidocs`
- 🎨 **Modern UI** - Bootstrap + Alpine.js frontend
- 🐳 **Docker support** - Easy deployment

## 🏗️ Project Structure

```
voice-chat-rooms/
├── app.py                    # Flask app with SocketIO
├── requirements.txt          # Python dependencies
├── Dockerfile               # Docker configuration
├── templates/
│   ├── index.html          # Lobby page
│   └── room.html           # Chat room page
├── static/
│   ├── css/
│   │   ├── style.css       # Lobby styles
│   │   └── room.css        # Room styles
│   └── js/
│       ├── lobby.js        # Lobby logic
│       ├── room.js         # Room logic
│       └── webrtc.js       # WebRTC manager
└── README.md
```

## 📦 Tech Stack

- **Backend**: Python 3.8+, Flask, Flask-SocketIO
- **Frontend**: HTML5, Bootstrap 5, Alpine.js
- **Real-time Communication**: WebSocket (SocketIO), WebRTC
- **Server**: WSGI (Gunicorn with Eventlet)
- **API Documentation**: Swagger/Flasgger

## 🚀 Installation

### Prerequisites
- Python 3.8+
- pip

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Piotr2025/voice-chat-rooms.git
   cd voice-chat-rooms
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/Mac
   # or
   venv\Scripts\activate  # Windows
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

## 🎮 Running the Application

### Development Mode
```bash
python app.py
```
The application will be available at `http://localhost:5000`

### Production Mode with Gunicorn
```bash
gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:5000 app:app
```

### Docker
```bash
# Build image
docker build -t voice-chat-rooms .

# Run container
docker run -p 5000:5000 voice-chat-rooms
```

## 💡 Usage

### Create a Room
1. Go to `http://localhost:5000`
2. Click "Create New Room"
3. Enter room name and your nickname
4. Click "Create & Join"

### Join an Existing Room
1. Find a room in the list
2. Click "Join Room"
3. Enter your nickname
4. Click "Join Room"

### In the Room
- 📹 **Video/Audio**: Automatically shared with all participants
- 🔊 **Mute/Unmute**: Click the microphone button in your video
- 💬 **Chat**: Send text messages using the chat box
- 👥 **User List**: See who's currently in the room
- 🚪 **Leave**: Close the browser tab or click "Leave Room"

## 📡 API Reference

### REST Endpoints

#### GET /api/rooms
Get all available rooms

```bash
curl http://localhost:5000/api/rooms
```

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Room Name",
    "userCount": 2,
    "createdAt": "2024-01-01T12:00:00"
  }
]
```

#### POST /api/rooms
Create a new room

```bash
curl -X POST http://localhost:5000/api/rooms \
  -H "Content-Type: application/json" \
  -d '{"name": "My Room"}'
```

**Response:**
```json
{
  "id": "uuid",
  "name": "My Room",
  "message": "Room created successfully"
}
```

#### GET /api/rooms/<room_id>
Get room details

```bash
curl http://localhost:5000/api/rooms/uuid
```

**Response:**
```json
{
  "id": "uuid",
  "name": "Room Name",
  "users": [
    {
      "userId": "uuid",
      "nickname": "John",
      "peerId": "uuid"
    }
  ],
  "userCount": 1,
  "createdAt": "2024-01-01T12:00:00"
}
```

### WebSocket Events

#### Client → Server

**join_room**
```javascript
socket.emit('join_room', {
  roomId: 'room-uuid',
  nickname: 'John'
})
```

**leave_room**
```javascript
socket.emit('leave_room', {
  roomId: 'room-uuid'
})
```

**chat_message**
```javascript
socket.emit('chat_message', {
  roomId: 'room-uuid',
  text: 'Hello everyone!'
})
```

#### Server → Client

**joined_room**
```javascript
socket.on('joined_room', (data) => {
  // data: { roomId, userId, peerId, users }
})
```

**user_joined**
```javascript
socket.on('user_joined', (data) => {
  // data: { userId, nickname, peerId, users }
})
```

**user_left**
```javascript
socket.on('user_left', (data) => {
  // data: { userId, users }
})
```

**chat_message**
```javascript
socket.on('chat_message', (data) => {
  // data: { userId, nickname, text, timestamp }
})
```

## 📖 API Documentation

Swagger/OpenAPI documentation is available at:
```
http://localhost:5000/apidocs
```

## ⚙️ Configuration

### Server Port
Edit `app.py` to change the port:
```python
if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
```

### STUN Servers
Edit `static/js/webrtc.js` to use different STUN servers:
```javascript
iceServers: [
    { urls: 'stun:your-stun-server.com:19302' },
    // ... more servers
]
```

## 🎯 Known Limitations

- Rooms stored in memory (lost on server restart)
- No persistent message storage
- P2P connections only (no media server)
- Single worker process recommended for WebSocket

## 🔮 Future Enhancements

- [ ] Database integration (PostgreSQL/MongoDB)
- [ ] Message persistence
- [ ] Screen sharing
- [ ] Recording functionality
- [ ] User authentication
- [ ] Room passwords
- [ ] Mobile app

## 🐛 Troubleshooting

### Camera/Microphone permission denied
- Check browser permissions
- HTTPS required in production (WebRTC needs secure context)

### No audio/video
- Check browser console for errors
- Verify stable internet connection
- Try refreshing the page

### WebSocket connection fails
- Check if server is running
- Verify firewall settings
- Check CORS configuration

## 📄 License

MIT

## 👨‍💻 Author

Created by Piotr2025

## 📞 Support

For issues or questions, please open an issue on GitHub.
