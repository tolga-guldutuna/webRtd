const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(__dirname));

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        socket.emit('room-joined', roomId);
        console.log(`User joined room: ${roomId}`);
    });

    socket.on('offer', ({ offer, roomId }) => {
        socket.to(roomId).emit('offer', { offer, roomId });
    });

    socket.on('answer', ({ answer, roomId }) => {
        socket.to(roomId).emit('answer', { answer, roomId });
    });

    socket.on('ice-candidate', ({ candidate, roomId }) => {
        socket.to(roomId).emit('ice-candidate', { candidate, roomId });
    });

    socket.on('message', ({ message, roomId }) => {
        socket.to(roomId).emit('message', { message });
    });

    socket.on('leave-room', (roomId) => {
        socket.leave(roomId);
        console.log(`User left room: ${roomId}`);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

server.listen(3000, () => {
    console.log('Server is listening on port 3000');
});
