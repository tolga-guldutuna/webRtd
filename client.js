const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startButton = document.getElementById('startButton');
const hangupButton = document.getElementById('hangupButton');
const muteAudioButton = document.getElementById('muteAudioButton');
const muteVideoButton = document.getElementById('muteVideoButton');
const volumeControl = document.getElementById('volumeControl');
const videoQualitySelect = document.getElementById('videoQuality');
const generateLinkButton = document.getElementById('generateLinkButton');
const roomLink = document.getElementById('roomLink');
const chatBox = document.getElementById('chatBox');
const chatInput = document.getElementById('chatInput');
const sendButton = document.getElementById('sendButton');

let localStream;
let remoteStream;
let peerConnection;
let isAudioMuted = false;
let isVideoMuted = false;
let roomId = '';

const socket = io();

const servers = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302'
        }
    ]
};

startButton.addEventListener('click', async () => {
    const videoConstraints = getVideoConstraints(videoQualitySelect.value);
    localStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: true });
    localVideo.srcObject = localStream;
    
    peerConnection = new RTCPeerConnection(servers);
    
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
        remoteStream = event.streams[0];
        remoteVideo.srcObject = remoteStream;
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', { candidate: event.candidate, roomId });
        }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', { offer, roomId });
});

socket.on('offer', async ({ offer, roomId: incomingRoomId }) => {
    if (!peerConnection) {
        peerConnection = new RTCPeerConnection(servers);

        peerConnection.ontrack = (event) => {
            remoteStream = event.streams[0];
            remoteVideo.srcObject = remoteStream;
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('ice-candidate', { candidate: event.candidate, roomId: incomingRoomId });
            }
        };
    }

    await peerConnection.setRemoteDescription(offer);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', { answer, roomId: incomingRoomId });
});

socket.on('answer', async ({ answer }) => {
    await peerConnection.setRemoteDescription(answer);
});

socket.on('ice-candidate', async ({ candidate }) => {
    try {
        await peerConnection.addIceCandidate(candidate);
    } catch (e) {
        console.error('Error adding received ice candidate', e);
    }
});

hangupButton.addEventListener('click', () => {
    peerConnection.close();
    peerConnection = null;
    remoteVideo.srcObject = null;
    localVideo.srcObject = null;
    socket.emit('leave-room', roomId);
});

muteAudioButton.addEventListener('click', () => {
    isAudioMuted = !isAudioMuted;
    localStream.getAudioTracks()[0].enabled = !isAudioMuted;
    muteAudioButton.textContent = isAudioMuted ? 'Unmute Audio' : 'Mute Audio';
});

muteVideoButton.addEventListener('click', () => {
    isVideoMuted = !isVideoMuted;
    localStream.getVideoTracks()[0].enabled = !isVideoMuted;
    muteVideoButton.textContent = isVideoMuted ? 'Unmute Video' : 'Mute Video';
});

volumeControl.addEventListener('input', () => {
    remoteVideo.volume = volumeControl.value;
});

videoQualitySelect.addEventListener('change', async () => {
    const videoConstraints = getVideoConstraints(videoQualitySelect.value);
    const newStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: true });
    
    const videoTrack = newStream.getVideoTracks()[0];
    const sender = peerConnection.getSenders().find(s => s.track.kind === videoTrack.kind);
    sender.replaceTrack(videoTrack);
    localStream.getVideoTracks()[0].stop();
    localStream.removeTrack(localStream.getVideoTracks()[0]);
    localStream.addTrack(videoTrack);
    localVideo.srcObject = localStream;
});

generateLinkButton.addEventListener('click', () => {
    roomId = generateRoomId();
    roomLink.value = `${window.location.origin}?roomId=${roomId}`;
    socket.emit('join-room', roomId);
});

sendButton.addEventListener('click', () => {
    const message = chatInput.value;
    if (message) {
        socket.emit('message', { message, roomId });
        chatInput.value =        '';
        addMessageToChatBox('Birincil Makine: ' + message);
    }
});

socket.on('message', ({ message }) => {
    addMessageToChatBox('İkincil Makine: ' + message);
});

socket.on('room-joined', (id) => {
    roomId = id;
    roomLink.value = `${window.location.origin}?roomId=${roomId}`;
});

function getVideoConstraints(quality) {
    switch (quality) {
        case 'high':
            return { width: { ideal: 1280 }, height: { ideal: 720 } };
        case 'medium':
            return { width: { ideal: 640 }, height: { ideal: 480 } };
        case 'low':
            return { width: { ideal: 320 }, height: { ideal: 240 } };
        default:
            return true;
    }
}

function addMessageToChatBox(message) {
    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function generateRoomId() {
    return Math.random().toString(36).substr(2, 9);
}

window.onload = () => {
    const params = new URLSearchParams(window.location.search);
    const roomIdParam = params.get('roomId');
    if (roomIdParam) {
        roomId = roomIdParam;
        socket.emit('join-room', roomId);
    }
};

