function roomApp() {
    return {
        roomId: null,
        nickname: null,
        users: [],
        messages: [],
        newMessage: '',
        localStream: null,
        remoteStreams: {},
        isMicOn: true,
        error: '',
        socket: null,
        webrtc: null,
        currentUserId: null,

        async init() {
            // Get room and nickname from sessionStorage
            this.roomId = sessionStorage.getItem('roomId');
            this.nickname = sessionStorage.getItem('nickname');

            if (!this.roomId || !this.nickname) {
                window.location.href = '/';
                return;
            }

            try {
                // Initialize WebRTC
                this.webrtc = new WebRTCManager();

                // Get local stream
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: true
                });

                this.localStream = stream;
                const localVideo = document.getElementById('localVideo');
                if (localVideo) {
                    localVideo.srcObject = stream;
                }

                // Initialize WebSocket
                this.initializeSocket();

                // Join room
                this.socket.emit('join_room', {
                    roomId: this.roomId,
                    nickname: this.nickname
                });
            } catch (err) {
                this.error = `Failed to initialize room: ${err.message}`;
                console.error('Room initialization error:', err);
            }
        },

        initializeSocket() {
            this.socket = io();

            this.socket.on('connect', () => {
                console.log('Connected to server');
            });

            this.socket.on('joined_room', (data) => {
                this.currentUserId = data.userId;
                this.users = data.users;
                this.addSystemMessage(`You joined the room`);
                this.handleUsersJoined(data.users);
            });

            this.socket.on('user_joined', (data) => {
                this.users = data.users;
                this.addSystemMessage(`${data.nickname} joined the room`);

                // Create peer connection with new user
                if (this.localStream && this.webrtc && this.currentUserId !== data.userId) {
                    this.webrtc.createOffer(
                        data.userId,
                        this.localStream,
                        (offer) => {
                            this.socket.emit('offer', {
                                roomId: this.roomId,
                                targetUserId: data.userId,
                                offer: offer
                            });
                        }
                    );
                }
            });

            this.socket.on('user_left', (data) => {
                this.users = data.users;
                this.addSystemMessage('A user left the room');
                if (this.webrtc) {
                    this.webrtc.closePeerConnection(data.userId);
                    delete this.remoteStreams[data.userId];
                    const remoteVideo = document.getElementById('video-' + data.userId);
                    if (remoteVideo) remoteVideo.remove();
                }
            });

            this.socket.on('chat_message', (data) => {
                this.messages.push({
                    type: 'chat',
                    nickname: data.nickname,
                    text: data.text,
                    timestamp: new Date(data.timestamp),
                    isOwn: data.userId === this.currentUserId
                });
                this.$nextTick(() => this.scrollToBottom());
            });

            this.socket.on('offer', (data) => {
                if (this.localStream && this.webrtc) {
                    // Find the actual from userId from users list or use socket approach
                    // For now, we'll handle it in the peer connection
                    const fromUserId = this.findUserIdByConnection(data.from);
                    this.webrtc.createAnswer(
                        fromUserId || data.from,
                        data.offer,
                        this.localStream,
                        (answer) => {
                            this.socket.emit('answer', {
                                roomId: this.roomId,
                                targetUserId: fromUserId || data.from,
                                answer: answer
                            });
                        }
                    );
                }
            });

            this.socket.on('answer', (data) => {
                if (this.webrtc) {
                    const fromUserId = this.findUserIdByConnection(data.from);
                    this.webrtc.handleAnswer(fromUserId || data.from, data.answer);
                }
            });

            this.socket.on('ice_candidate', (data) => {
                if (this.webrtc) {
                    const fromUserId = this.findUserIdByConnection(data.from);
                    this.webrtc.addIceCandidate(fromUserId || data.from, data.candidate);
                }
            });

            this.socket.on('error', (data) => {
                this.error = data.message;
            });

            this.socket.on('disconnect', () => {
                console.log('Disconnected from server');
            });

            // Setup WebRTC handlers
            this.webrtc.onRemoteStream = (userId, stream) => {
                this.remoteStreams[userId] = stream;
                this.$nextTick(() => {
                    const videoElement = document.getElementById('video-' + userId);
                    if (videoElement) {
                        videoElement.srcObject = stream;
                    }
                });
            };

            this.webrtc.onIceCandidate = (userId, candidate) => {
                this.socket.emit('ice_candidate', {
                    roomId: this.roomId,
                    targetUserId: userId,
                    candidate: candidate
                });
            };
        },

        handleUsersJoined(usersList) {
            // If there are other users, initiate connections
            if (usersList.length > 1 && this.localStream && this.webrtc) {
                usersList.forEach(user => {
                    if (user.userId !== this.currentUserId) {
                        this.webrtc.createOffer(
                            user.userId,
                            this.localStream,
                            (offer) => {
                                this.socket.emit('offer', {
                                    roomId: this.roomId,
                                    targetUserId: user.userId,
                                    offer: offer
                                });
                            }
                        );
                    }
                });
            }
        },

        findUserIdByConnection(connectionRef) {
            // Helper to find userId from connection
            // In a real implementation, you'd track this better
            return null;
        },

        sendMessage(e) {
            e.preventDefault();
            if (!this.newMessage.trim()) return;

            if (this.socket) {
                this.socket.emit('chat_message', {
                    roomId: this.roomId,
                    text: this.newMessage
                });

                this.messages.push({
                    type: 'chat',
                    nickname: this.nickname,
                    text: this.newMessage,
                    timestamp: new Date(),
                    isOwn: true
                });

                this.newMessage = '';
                this.$nextTick(() => this.scrollToBottom());
            }
        },

        addSystemMessage(text) {
            this.messages.push({
                type: 'system',
                text: text,
                timestamp: new Date()
            });
            this.$nextTick(() => this.scrollToBottom());
        },

        scrollToBottom() {
            const container = document.getElementById('messagesContainer');
            if (container) {
                setTimeout(() => {
                    container.scrollTop = container.scrollHeight;
                }, 0);
            }
        },

        toggleMic() {
            if (this.localStream) {
                this.localStream.getAudioTracks().forEach(track => {
                    track.enabled = !track.enabled;
                });
                this.isMicOn = !this.isMicOn;
            }
        },

        leaveRoom() {
            if (this.socket) {
                this.socket.emit('leave_room', {
                    roomId: this.roomId
                });
                this.socket.disconnect();
            }
            this.cleanup();
            window.location.href = '/';
        },

        cleanup() {
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
            }
            if (this.webrtc) {
                this.webrtc.closeAll();
            }
            sessionStorage.removeItem('roomId');
            sessionStorage.removeItem('nickname');
        },

        getRemoteUserNickname(userId) {
            const user = this.users.find(u => u.userId === userId);
            return user ? user.nickname : 'Unknown';
        }
    };
}
