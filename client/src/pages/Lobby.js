import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Lobby.css';

function Lobby({ onJoinRoom }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomNickname, setNewRoomNickname] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [joinNickname, setJoinNickname] = useState('');

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 3000); // Refresh every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await axios.get('/api/rooms');
      setRooms(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch rooms');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    
    if (!newRoomName.trim() || !newRoomNickname.trim()) {
      setError('Room name and nickname are required');
      return;
    }

    try {
      const response = await axios.post('/api/rooms', {
        name: newRoomName
      });
      
      setShowCreateRoom(false);
      setNewRoomName('');
      onJoinRoom(response.data.id, newRoomNickname);
      setNewRoomNickname('');
      await fetchRooms();
    } catch (err) {
      setError('Failed to create room');
      console.error(err);
    }
  };

  const handleJoinClick = (room) => {
    setSelectedRoom(room);
    setShowJoinModal(true);
    setJoinNickname('');
  };

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    
    if (!joinNickname.trim()) {
      setError('Nickname is required');
      return;
    }

    try {
      onJoinRoom(selectedRoom.id, joinNickname);
      setShowJoinModal(false);
      setSelectedRoom(null);
      setJoinNickname('');
    } catch (err) {
      setError('Failed to join room');
      console.error(err);
    }
  };

  return (
    <div className="lobby-container">
      <div className="page-header">
        <h1>🎤 Voice Chat Rooms</h1>
        <p>Join or create a room to start chatting and calling</p>
      </div>

      <div className="container">
        <div className="lobby-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateRoom(!showCreateRoom)}
          >
            ➕ Create New Room
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {showCreateRoom && (
          <div className="modal-overlay" onClick={() => setShowCreateRoom(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Create New Room</h2>
              <form onSubmit={handleCreateRoom}>
                <input
                  type="text"
                  placeholder="Room name"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  required
                />
                <input
                  type="text"
                  placeholder="Your nickname"
                  value={newRoomNickname}
                  onChange={(e) => setNewRoomNickname(e.target.value)}
                  required
                />
                <div className="modal-actions">
                  <button type="submit" className="btn btn-primary">Create & Join</button>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowCreateRoom(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showJoinModal && selectedRoom && (
          <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Join Room: {selectedRoom.name}</h2>
              <form onSubmit={handleJoinRoom}>
                <input
                  type="text"
                  placeholder="Your nickname"
                  value={joinNickname}
                  onChange={(e) => setJoinNickname(e.target.value)}
                  required
                  autoFocus
                />
                <div className="modal-actions">
                  <button type="submit" className="btn btn-primary">Join Room</button>
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowJoinModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="rooms-section">
          <h2>Available Rooms ({rooms.length})</h2>
          {loading && <p className="loading">Loading rooms...</p>}
          {rooms.length === 0 && !loading && (
            <p className="no-rooms">No rooms available. Create one to get started!</p>
          )}
          <div className="rooms-grid">
            {rooms.map((room) => (
              <div key={room.id} className="room-card">
                <div className="room-info">
                  <h3>{room.name}</h3>
                  <p className="room-users">👥 {room.userCount} user{room.userCount !== 1 ? 's' : ''}</p>
                </div>
                <button 
                  className="btn btn-secondary"
                  onClick={() => handleJoinClick(room)}
                >
                  Join Room
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Lobby;
