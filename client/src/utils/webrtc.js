const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

class WebRTCManager {
  constructor() {
    this.userId = null;
    this.peerConnections = new Map();
    this.dataChannels = new Map();
    this.onRemoteStream = null;
  }

  setPeerId(userId) {
    this.userId = userId;
  }

  createOffer(targetUserId, localStream, onOfferCreated) {
    const peerConnection = this.getOrCreatePeerConnection(targetUserId, localStream);
    
    peerConnection
      .createOffer()
      .then(offer => peerConnection.setLocalDescription(offer))
      .then(() => {
        onOfferCreated(peerConnection.localDescription);
      })
      .catch(error => console.error('Error creating offer:', error));
  }

  createAnswer(targetUserId, offer, localStream, onAnswerCreated) {
    const peerConnection = this.getOrCreatePeerConnection(targetUserId, localStream);
    
    peerConnection
      .setRemoteDescription(new RTCSessionDescription(offer))
      .then(() => peerConnection.createAnswer())
      .then(answer => peerConnection.setLocalDescription(answer))
      .then(() => {
        onAnswerCreated(peerConnection.localDescription);
      })
      .catch(error => console.error('Error creating answer:', error));
  }

  handleAnswer(targetUserId, answer) {
    const peerConnection = this.peerConnections.get(targetUserId);
    if (peerConnection) {
      peerConnection
        .setRemoteDescription(new RTCSessionDescription(answer))
        .catch(error => console.error('Error handling answer:', error));
    }
  }

  addIceCandidate(targetUserId, candidate) {
    const peerConnection = this.peerConnections.get(targetUserId);
    if (peerConnection && candidate) {
      peerConnection
        .addIceCandidate(new RTCIceCandidate(candidate))
        .catch(error => console.error('Error adding ICE candidate:', error));
    }
  }

  getOrCreatePeerConnection(targetUserId, localStream) {
    let peerConnection = this.peerConnections.get(targetUserId);
    
    if (!peerConnection) {
      peerConnection = new RTCPeerConnection(ICE_SERVERS);
      this.peerConnections.set(targetUserId, peerConnection);

      // Add local stream tracks
      if (localStream) {
        localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStream);
        });
      }

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log('Remote track received:', event.track);
        if (this.onRemoteStream) {
          this.onRemoteStream(targetUserId, event.streams[0]);
        }
      };

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          // Send ICE candidate to other peer via signaling
          console.log('New ICE candidate:', event.candidate);
          // This will be handled by the component that has access to WebSocket
        }
      };

      peerConnection.onconnectionstatechange = () => {
        console.log(`Connection state with ${targetUserId}:`, peerConnection.connectionState);
        if (peerConnection.connectionState === 'disconnected' || 
            peerConnection.connectionState === 'failed' ||
            peerConnection.connectionState === 'closed') {
          this.closePeerConnection(targetUserId);
        }
      };
    }

    return peerConnection;
  }

  closePeerConnection(userId) {
    const peerConnection = this.peerConnections.get(userId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(userId);
    }
  }

  closeAll() {
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();
  }
}

export default WebRTCManager;
