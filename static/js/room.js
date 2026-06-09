const socket = io();
let localStream = null;
let peerConnections = {};
let roomId = sessionStorage.getItem('roomId');
let nickname = sessionStorage.getItem('nickname');
let videoEnabled = false;
let audioEnabled = false;

const configuration = {
    iceServers: [
        { urls: ['stun:stun.l.google.com:19302'] },
        { urls: ['stun:stun1.l.google.com:19302'] }
    ]
};

function initializeRoom() {
    if (!roomId || !nickname) {
        window.location.href = '/';
        return;
    }

    document.getElementById('userNickname').textContent = nickname;
    document.getElementById('roomTitle').textContent = 'Voice Chat';

    // Emit join_room event
    socket.emit('join_room', {
        room_id: roomId,
        roomId: roomId,
        nickname: nickname
    });

    document.getElementById('messageInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    console.log('Room initialization started for:', roomId, nickname);
}

socket.on('connect', () => {
    console.log('Connected to server');
    initializeRoom();
});

socket.on('joined_room', (data) => {
    console.log('Successfully joined room:', data);
    addChatMessage('You joined the room', 'info');
    updateUsersList(data.users || []);
    
    // Start camera automatically
    setTimeout(() => toggleVideo(), 500);
});

socket.on('user_joined', (data) => {
    console.log('User joined:', data);
    addChatMessage(`${data.nickname} joined the room`, 'info');
    updateUsersList(data.users || []);
});

socket.on('user_left', (data) => {
    console.log('User left:', data);
    addChatMessage('A user left the room', 'info');
    updateUsersList(data.users || []);
});

socket.on('chat_message', (data) => {
    console.log('Chat message:', data);
    addChatMessage(`${data.nickname}: ${data.message}`);
});

socket.on('error', (data) => {
    console.error('Error:', data.error);
    alert('Error: ' + data.error);
    window.location.href = '/';
});

function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (message) {
        socket.emit('chat_message', {
            room_id: roomId,
            roomId: roomId,
            message: message,
            nickname: nickname
        });
        input.value = '';
    }
}

function addChatMessage(message, type = 'normal') {
    const chatDiv = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `mb-2 p-2 rounded ${type === 'info' ? 'text-muted bg-secondary bg-opacity-25' : 'text-white'}`;
    messageDiv.textContent = message;
    chatDiv.appendChild(messageDiv);
    chatDiv.scrollTop = chatDiv.scrollHeight;
}

function updateUsersList(users) {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '';
    
    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'mb-2';
        userItem.innerHTML = `<span class="badge bg-info">${user}</span>`;
        usersList.appendChild(userItem);
    });
}

async function toggleVideo() {
    const button = document.getElementById('toggleVideo');
    
    if (videoEnabled) {
        // Stop video
        if (localStream) {
            localStream.getVideoTracks().forEach(track => track.stop());
        }
        videoEnabled = false;
        button.textContent = '📹 Start Camera';
        button.classList.remove('btn-success');
        button.classList.add('btn-warning');
        document.getElementById('localVideo').srcObject = null;
    } else {
        // Start video
        try {
            const videoStream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
            });
            
            if (!localStream) {
                localStream = videoStream;
            } else {
                videoStream.getVideoTracks().forEach(track => {
                    localStream.addTrack(track);
                });
            }
            
            document.getElementById('localVideo').srcObject = localStream;
            videoEnabled = true;
            button.textContent = '📹 Stop Camera';
            button.classList.remove('btn-warning');
            button.classList.add('btn-success');
            
            socket.emit('user_status_changed', {
                room_id: roomId,
                video_enabled: true,
                audio_enabled: audioEnabled
            });
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Could not access camera. Please check permissions.');
        }
    }
}

async function toggleAudio() {
    const button = document.getElementById('toggleAudio');
    
    if (audioEnabled) {
        // Stop audio
        if (localStream) {
            localStream.getAudioTracks().forEach(track => track.stop());
        }
        audioEnabled = false;
        button.textContent = '🎤 Start Microphone';
        button.classList.remove('btn-success');
        button.classList.add('btn-danger');
    } else {
        // Start audio
        try {
            const audioStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            });
            
            if (!localStream) {
                localStream = audioStream;
            } else {
                audioStream.getAudioTracks().forEach(track => {
                    localStream.addTrack(track);
                });
            }
            
            audioEnabled = true;
            button.textContent = '🎤 Stop Microphone';
            button.classList.remove('btn-danger');
            button.classList.add('btn-success');
            
            socket.emit('user_status_changed', {
                room_id: roomId,
                video_enabled: videoEnabled,
                audio_enabled: true
            });
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Could not access microphone. Please check permissions.');
        }
    }
}

function goBackToLobby() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    
    Object.values(peerConnections).forEach(pc => pc.close());
    
    socket.emit('leave_room', {
        room_id: roomId,
        roomId: roomId,
        nickname: nickname
    });
    
    socket.disconnect();
    
    sessionStorage.removeItem('roomId');
    sessionStorage.removeItem('nickname');
    window.location.href = '/';
}

window.addEventListener('beforeunload', () => {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
});

window.addEventListener('DOMContentLoaded', initializeRoom);
