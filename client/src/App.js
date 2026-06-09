import React, { useState, useEffect } from 'react';
import Lobby from './pages/Lobby';
import Room from './pages/Room';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('lobby');
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [userNickname, setUserNickname] = useState(null);

  const goToRoom = (roomId, nickname) => {
    setSelectedRoomId(roomId);
    setUserNickname(nickname);
    setCurrentPage('room');
  };

  const goToLobby = () => {
    setCurrentPage('lobby');
    setSelectedRoomId(null);
    setUserNickname(null);
  };

  return (
    <div className="App">
      {currentPage === 'lobby' && (
        <Lobby onJoinRoom={goToRoom} />
      )}
      {currentPage === 'room' && selectedRoomId && userNickname && (
        <Room 
          roomId={selectedRoomId} 
          nickname={userNickname}
          onLeaveRoom={goToLobby}
        />
      )}
    </div>
  );
}

export default App;
