function lobbyApp() {
    return {
        rooms: [],
        loading: true,
        error: '',
        showCreateModal: false,
        showJoinModal: false,
        selectedRoom: null,

        init() {
            this.fetchRooms();
            // Refresh rooms every 3 seconds
            setInterval(() => this.fetchRooms(), 3000);
        },

        async fetchRooms() {
            try {
                const response = await fetch('/api/rooms');
                this.rooms = await response.json();
                this.error = '';
            } catch (err) {
                this.error = 'Failed to fetch rooms';
                console.error(err);
            } finally {
                this.loading = false;
            }
        },

        async createRoom() {
            const roomName = document.getElementById('roomName').value.trim();
            const nickname = document.getElementById('nickName').value.trim();

            if (!roomName || !nickname) {
                this.error = 'Room name and nickname are required';
                return;
            }

            try {
                const response = await fetch('/api/rooms', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: roomName })
                });

                if (!response.ok) throw new Error('Failed to create room');

                const data = await response.json();
                // Store room and nickname in sessionStorage
                sessionStorage.setItem('roomId', data.id);
                sessionStorage.setItem('nickname', nickname);
                window.location.href = '/room';
            } catch (err) {
                this.error = 'Failed to create room';
                console.error(err);
            }
        },

        selectRoom(room) {
            this.selectedRoom = room;
            this.showJoinModal = true;
        },

        async joinRoom() {
            const nickname = document.getElementById('joinNickname').value.trim();

            if (!nickname) {
                this.error = 'Nickname is required';
                return;
            }

            try {
                // Store room and nickname in sessionStorage
                sessionStorage.setItem('roomId', this.selectedRoom.id);
                sessionStorage.setItem('nickname', nickname);
                window.location.href = '/room';
            } catch (err) {
                this.error = 'Failed to join room';
                console.error(err);
            }
        }
    };
}
