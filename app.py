import os
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room, rooms
from flask_cors import CORS
from flasgger import Swagger
import uuid
from datetime import datetime
import json

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")
swagger = Swagger(app)

# Store rooms and user connections
rooms_data = {}  # {room_id: {name, users: {user_id: {nickname, sid, peer_id}}, created_at}}
user_rooms = {}  # {sid: room_id}


class Room:
    """Room management class"""
    def __init__(self, room_id, name):
        self.id = room_id
        self.name = name
        self.users = {}  # {user_id: {nickname, sid, peer_id}}
        self.created_at = datetime.now().isoformat()
    
    def add_user(self, user_id, nickname, sid, peer_id):
        """Add user to room. Returns False if nickname exists."""
        if self.has_nickname(nickname):
            return False
        self.users[user_id] = {
            'nickname': nickname,
            'sid': sid,
            'peer_id': peer_id
        }
        return True
    
    def remove_user(self, user_id):
        """Remove user from room"""
        if user_id in self.users:
            del self.users[user_id]
            return True
        return False
    
    def has_nickname(self, nickname):
        """Check if nickname exists in room"""
        return any(user['nickname'] == nickname for user in self.users.values())
    
    def is_empty(self):
        """Check if room is empty"""
        return len(self.users) == 0
    
    def get_users(self):
        """Get list of users in room"""
        return [
            {
                'userId': user_id,
                'nickname': user['nickname'],
                'peerId': user['peer_id']
            }
            for user_id, user in self.users.items()
        ]
    
    def get_user_nicknames(self):
        """Get list of user nicknames"""
        return [user['nickname'] for user in self.users.values()]
    
    def to_dict(self):
        """Convert room to dict"""
        return {
            'id': self.id,
            'name': self.name,
            'userCount': len(self.users),
            'createdAt': self.created_at
        }


# REST API Endpoints

@app.route('/api/rooms', methods=['GET'])
def get_rooms():
    """
    Get all available rooms
    ---
    responses:
      200:
        description: List of all rooms
        schema:
          type: array
          items:
            properties:
              id:
                type: string
              name:
                type: string
              userCount:
                type: integer
              createdAt:
                type: string
    """
    rooms_list = [room.to_dict() for room in rooms_data.values()]
    return jsonify(rooms_list), 200


@app.route('/api/rooms', methods=['POST'])
def create_room():
    """
    Create a new room
    ---
    parameters:
      - name: body
        in: body
        required: true
        schema:
          properties:
            name:
              type: string
              description: Room name
    responses:
      201:
        description: Room created successfully
        schema:
          properties:
            id:
              type: string
            name:
              type: string
            message:
              type: string
      400:
        description: Invalid request
    """
    data = request.get_json()
    name = data.get('name', '').strip()
    
    if not name:
        return jsonify({'error': 'Room name is required'}), 400
    
    room_id = str(uuid.uuid4())
    room = Room(room_id, name)
    rooms_data[room_id] = room
    
    print(f"Room created: {room_id} - {name}")
    
    return jsonify({
        'id': room_id,
        'name': name,
        'message': 'Room created successfully'
    }), 201


@app.route('/api/rooms/<room_id>', methods=['GET'])
def get_room(room_id):
    """
    Get room details
    ---
    parameters:
      - name: room_id
        in: path
        type: string
        required: true
    responses:
      200:
        description: Room details
      404:
        description: Room not found
    """
    room = rooms_data.get(room_id)
    
    if not room:
        return jsonify({'error': 'Room not found'}), 404
    
    return jsonify({
        'id': room.id,
        'name': room.name,
        'users': room.get_users(),
        'userCount': len(room.users),
        'createdAt': room.created_at
    }), 200


# WebSocket Events

@socketio.on('connect')
def handle_connect():
    """
    Handle client connection
    """
    print(f'Client connected: {request.sid}')
    emit('connected', {'data': 'Connected to server'})


@socketio.on('disconnect')
def handle_disconnect():
    """
    Handle client disconnection
    """
    sid = request.sid
    print(f'Client disconnected: {sid}')
    
    # If user was in a room, remove them
    if sid in user_rooms:
        room_id = user_rooms[sid]
        room = rooms_data.get(room_id)
        
        if room:
            # Find user_id by sid
            user_id = None
            for uid, user in room.users.items():
                if user['sid'] == sid:
                    user_id = uid
                    break
            
            if user_id:
                room.remove_user(user_id)
                
                # Notify others
                socketio.emit('user_left', {
                    'userId': user_id,
                    'users': room.get_user_nicknames()
                }, room=room_id)
                
                # Delete room if empty
                if room.is_empty():
                    del rooms_data[room_id]
                    print(f'Room deleted: {room_id}')
        
        del user_rooms[sid]


@socketio.on('join_room')
def handle_join_room(data):
    """
    Handle user joining room
    """
    room_id = data.get('room_id') or data.get('roomId')
    nickname = data.get('nickname', '').strip()
    sid = request.sid
    
    print(f"Join room request: room_id={room_id}, nickname={nickname}, sid={sid}")
    
    if not room_id or not nickname:
        emit('error', {'error': 'Room ID and nickname are required'})
        return
    
    room = rooms_data.get(room_id)
    
    if not room:
        emit('error', {'error': 'Room not found'})
        return
    
    # Check if nickname already exists
    if room.has_nickname(nickname):
        emit('error', {'error': 'Nickname already taken in this room'})
        return
    
    # Add user to room
    user_id = str(uuid.uuid4())
    peer_id = str(uuid.uuid4())
    
    if not room.add_user(user_id, nickname, sid, peer_id):
        emit('error', {'error': 'Could not join room'})
        return
    
    # Join SocketIO room
    join_room(room_id)
    user_rooms[sid] = room_id
    
    # Notify user they joined
    emit('joined_room', {
        'roomId': room_id,
        'userId': user_id,
        'peerId': peer_id,
        'users': room.get_user_nicknames()
    })
    
    # Notify others about new user
    emit('user_joined', {
        'userId': user_id,
        'nickname': nickname,
        'peerId': peer_id,
        'users': room.get_user_nicknames()
    }, room=room_id, skip_sid=sid)
    
    print(f'User {nickname} joined room {room_id}')


@socketio.on('leave_room')
def handle_leave_room(data):
    """
    Handle user leaving room
    """
    room_id = data.get('room_id') or data.get('roomId')
    sid = request.sid
    
    room = rooms_data.get(room_id)
    
    if not room:
        return
    
    # Find and remove user
    user_id = None
    nickname = None
    for uid, user in room.users.items():
        if user['sid'] == sid:
            user_id = uid
            nickname = user['nickname']
            break
    
    if user_id:
        room.remove_user(user_id)
        leave_room(room_id)
        
        # Notify others
        socketio.emit('user_left', {
            'userId': user_id,
            'nickname': nickname,
            'users': room.get_user_nicknames()
        }, room=room_id)
        
        # Delete room if empty
        if room.is_empty():
            del rooms_data[room_id]
            print(f'Room deleted: {room_id}')
        
        if sid in user_rooms:
            del user_rooms[sid]
        
        print(f'User {nickname} left room {room_id}')


@socketio.on('chat_message')
def handle_chat_message(data):
    """
    Handle chat message
    """
    room_id = data.get('room_id') or data.get('roomId')
    message = data.get('message') or data.get('text', '').strip()
    sid = request.sid
    
    if not room_id or not message or sid not in user_rooms:
        return
    
    room = rooms_data.get(room_id)
    if not room:
        return
    
    # Find user
    user_id = None
    nickname = None
    for uid, user in room.users.items():
        if user['sid'] == sid:
            user_id = uid
            nickname = user['nickname']
            break
    
    if not user_id:
        return
    
    # Broadcast message
    socketio.emit('chat_message', {
        'userId': user_id,
        'nickname': nickname,
        'message': message,
        'timestamp': datetime.now().isoformat()
    }, room=room_id)


@socketio.on('user_status_changed')
def handle_user_status_changed(data):
    """
    Handle user status change (video/audio)
    """
    room_id = data.get('room_id') or data.get('roomId')
    
    if room_id:
        socketio.emit('user_status_changed', data, room=room_id)


# Serve frontend

@app.route('/')
def index():
    """Serve main page"""
    return render_template('index.html')


@app.route('/room')
def room_page():
    """Serve room page"""
    return render_template('room.html')


if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
