const express = require('express');
const socketIo = require('socket.io');
const http = require('http');
const cors = require('cors');

const { addUser, removeUser, getUser, getUsersInRoom } = require('./users');

const router = require('./router');

const app =  express();
const server = http.createServer(app);
const io = socketIo(server);

io.on('connection', socket => {
    console.log('We have a new connection!');

    socket.on('join', ({ name, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, name, room });

        if (error) return callback(error);

        // send message only to the user that has joined the room
        socket.emit('message', { user: 'admin', text: `${user.name} welcome to the room ${ user.room }` });
        // send message to all users in the room except the user that has just joined
        socket.broadcast.to(user.room).emit('message', { user: 'admin', text: `${ user.name }, has joined!` });

        socket.join(user.room);

        io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });

        callback();
    });

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id);

        io.to(user.room).emit('message', { user: user.name, text: message });
        io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });

        callback();
    });

    socket.on('disconnect', () => {
        const user = removeUser(socket.id);

        io.to(user.room).emit('message', { user: 'admin', text: `${user.name} has left` });
    });
});

app.use(router);
app.use(cors());

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`server running on port ${PORT}!`));