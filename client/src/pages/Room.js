import React, { useState, useEffect, useRef } from 'react';
import WebRTCManager from '../utils/webrtc';
import WebSocketManager from '../utils/websocket';
import '../styles/Room.css';

function Room({ roomId, nickname, onLeaveRoom }) {
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [localStream, setLocalStream] = useState(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [error, setError] = useState(null);
  
  const webrtcRef = useRef(null);
  const wsRef = useRef(null);
  const localVideoRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    initializeRoom();
    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeRoom = async () => {
    try {
      // Initialize WebRTC
      webrtcRef.current = new WebRTCManager();
      
      // Get local stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
      
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Initialize WebSocket
      wsRef.current = new WebSocketManager(
        handleWebSocketMessage,
        handleRemoteStream
      );

      // Join room
      wsRef.current.joinRoom(roomId, nickname);
    } catch (err) {
      setError(`Failed to initialize room: ${err.message}`);
      console.error('Room initialization error:', err);
    }
  };

  const handleWebSocketMessage = (message) => {
    switch (message.type) {
      case 'joined_room':
        setUsers(message.users);
        handleUsersJoined(message.users);
        break;
      
      case 'user_joined':
        setUsers(message.users);
        addMessage({
          type: 'system',
          text: `${message.nickname} joined the room`,
          timestamp: new Date()
        });
        // Create peer connection with new user
        if (localStream && webrtcRef.current) {
          webrtcRef.current.createOffer(
            message.userId,
            localStream,
            (offer) => {
              wsRef.current.sendOffer(roomId, message.userId, offer);
            }
          );
        }
        break;
      
      case 'user_left':
        setUsers(message.users);
        addMessage({
          type: 'system',
          text: 'A user left the room',
          timestamp: new Date()
        });
        if (webrtcRef.current) {
          webrtcRef.current.closePeerConnection(message.userId);
        }
        break;
      
      case 'chat_message':
        addMessage({
          type: 'chat',
          nickname: message.nickname,
          text: message.text,
          timestamp: new Date(message.timestamp)
        });
        break;
      
      case 'offer':
        if (localStream && webrtcRef.current) {
          webrtcRef.current.createAnswer(
            message.from,
            message.offer,
            localStream,
            (answer) => {
              wsRef.current.sendAnswer(roomId, message.from, answer);
            }
          );
        }
        break;
      
      case 'answer':
        if (webrtcRef.current) {
          webrtcRef.current.handleAnswer(message.from, message.answer);
        }
        break;
      
      case 'ice_candidate':
        if (webrtcRef.current) {
          webrtcRef.current.addIceCandidate(message.from, message.candidate);
        }
        break;
      
      case 'error':
        setError(message.message);
        break;
      
      default:
        console.log('Unknown message type:', message.type);
    }
  };

  const handleUsersJoined = (usersList) => {
    // If there are other users, initiate connections
    if (usersList.length > 1 && localStream && webrtcRef.current) {
      usersList.forEach(user => {
        if (user.userId !== webrtcRef.current.userId) {
          webrtcRef.current.createOffer(
            user.userId,
            localStream,
            (offer) => {
              wsRef.current.sendOffer(roomId, user.userId, offer);
            }
          );
        }
      });
    }
  };

  const handleRemoteStream = (userId, stream) => {
    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.set(userId, stream);
      return newMap;
    });
  };

  const addMessage = (message) => {
    setMessages(prev => [...prev, message]);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    if (wsRef.current) {
      wsRef.current.sendChatMessage(roomId, newMessage);
      addMessage({
        type: 'chat',
        nickname,
        text: newMessage,
        timestamp: new Date(),
        isOwn: true
      });
      setNewMessage('');
    }
  };

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMicOn(!isMicOn);
    }
  };

  const handleLeave = () => {
    if (wsRef.current) {
      wsRef.current.leaveRoom(roomId);
    }
    cleanup();
    onLeaveRoom();
  };

  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (webrtcRef.current) {
      webrtcRef.current.closeAll();
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
  };

  return (
    <div className="room-container">
      <div className="room-header">
        <div className="header-content">
          <h1>Room Chat</h1>
          <p>Connected as: <strong>{nickname}</strong></p>
        </div>
        <button className="btn btn-danger" onClick={handleLeave}>
          Leave Room
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="room-content">
        <div className="video-section">
          <div className="video-grid">
            {localStream && (
              <div className="video-container local">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="video-element"
                />
                <div className="video-label">{nickname} (You)</div>
                <button 
                  className={`mic-button ${isMicOn ? 'on' : 'off'}`}
                  onClick={toggleMic}
                  title={isMicOn ? 'Mute' : 'Unmute'}
                >
                  {isMicOn ? '🎤' : '🔇'}
                </button>
              </div>
            )}
            
            {Array.from(remoteStreams.entries()).map(([userId, stream]) => {
              const user = users.find(u => u.userId === userId);
              return (
                <RemoteVideo
                  key={userId}
                  stream={stream}
                  nickname={user?.nickname || 'Unknown'}
                />
              );
            })}
          </div>
        </div>

        <div className="sidebar">
          <div className="users-section">
            <h3>Users in Room ({users.length})</h3>
            <div className="users-list">
              {users.map(user => (
                <div key={user.userId} className="user-item">
                  <span className="user-dot">●</span>
                  <span>{user.nickname}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="chat-section">
            <h3>Chat</h3>
            <div className="messages">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`message ${msg.type} ${msg.isOwn ? 'own' : ''}`}
                >
                  {msg.type === 'chat' && (
                    <>
                      <span className="nickname">{msg.nickname}:</span>
                      <span className="text">{msg.text}</span>
                    </>
                  )}
                  {msg.type === 'system' && (
                    <span className="system-text">{msg.text}</span>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendMessage} className="message-input-form">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="message-input"
              />
              <button type="submit" className="btn btn-primary">
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function RemoteVideo({ stream, nickname }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="video-container remote">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="video-element"
      />
      <div className="video-label">{nickname}</div>
    </div>
  );
}

export default Room;
