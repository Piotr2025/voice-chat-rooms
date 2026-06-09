class WebRTCManager {
    constructor() {
        this.peerConnections = new Map();
        this.onRemoteStream = null;
        this.onIceCandidate = null;
    }

    createOffer(targetUserId, localStream, onOfferCreated) {
        const peerConnection = this.getOrCreatePeerConnection(targetUserId, localStream);

        peerConnection.createOffer()
            .then(offer => peerConnection.setLocalDescription(offer))
            .then(() => {
                onOfferCreated(peerConnection.localDescription);
            })
            .catch(error => console.error('Error creating offer:', error));
    }

    createAnswer(targetUserId, offer, localStream, onAnswerCreated) {
        const peerConnection = this.getOrCreatePeerConnection(targetUserId, localStream);

        peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
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
            peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
                .catch(error => console.error('Error handling answer:', error));
        }
    }

    addIceCandidate(targetUserId, candidate) {
        const peerConnection = this.peerConnections.get(targetUserId);
        if (peerConnection && candidate) {
            peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
                .catch(error => console.error('Error adding ICE candidate:', error));
        }
    }

    getOrCreatePeerConnection(targetUserId, localStream) {
        let peerConnection = this.peerConnections.get(targetUserId);

        if (!peerConnection) {
            peerConnection = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' }
                ]
            });

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
                if (event.candidate && this.onIceCandidate) {
                    this.onIceCandidate(targetUserId, event.candidate);
                }
            };

            peerConnection.onconnectionstatechange = () => {
                console.log(`Connection state with ${targetUserId}:`, peerConnection.connectionState);
                if (['disconnected', 'failed', 'closed'].includes(peerConnection.connectionState)) {
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
