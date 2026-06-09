class WebSocketManager {
  constructor(onMessage, onRemoteStream) {
    this.ws = null;
    this.onMessage = onMessage;
    this.onRemoteStream = onRemoteStream;
    this.connect();
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.onMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
    };
  }

  joinRoom(roomId, nickname) {
    this.send({
      type: 'join_room',
      roomId,
      nickname
    });
  }

  leaveRoom(roomId) {
    this.send({
      type: 'leave_room',
      roomId
    });
  }

  sendChatMessage(roomId, text) {
    this.send({
      type: 'chat_message',
      roomId,
      text
    });
  }

  sendOffer(roomId, targetUserId, offer) {
    this.send({
      type: 'offer',
      roomId,
      data: {
        targetUserId,
        offer
      }
    });
  }

  sendAnswer(roomId, targetUserId, answer) {
    this.send({
      type: 'answer',
      roomId,
      data: {
        targetUserId,
        answer
      }
    });
  }

  sendIceCandidate(roomId, targetUserId, candidate) {
    this.send({
      type: 'ice_candidate',
      roomId,
      data: {
        targetUserId,
        candidate
      }
    });
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not open');
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

export default WebSocketManager;
