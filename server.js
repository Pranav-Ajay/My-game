const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*" }
});

app.use(express.static(__dirname));

const players = {};
const alphabets = 'ABCDEFGHIJKLMNOP'.split('');

const allowedIPs = process.env.ALLOW_IP === "true" ? [
  '::1',
  '192.168.1.101',
  '192.168.1.104',
  '::ffff:192.168.1.101',
  '::ffff:192.168.1.104'
] : null;

io.on('connection', (socket) => {
  let ip = socket.handshake.address.replace('::ffff:', '');
  console.log(`Connection attempt from ${ip}`);

  if (allowedIPs && !allowedIPs.includes(ip)) {
    console.log(`Blocked unauthorized IP: ${ip}`);
    socket.emit('errorMessage', 'You are not allowed to join this game.');
    socket.disconnect(true);
    return;
  }

  const assignedLetter = alphabets.find(
    letter => !Object.values(players).some(p => p.letter === letter)
  );

  if (!assignedLetter) {
    socket.emit('errorMessage', 'Game full—no more players can join.');
    socket.disconnect(true);
    return;
  }

  players[socket.id] = { letter: assignedLetter, frozen: false };
  socket.emit('assigned', players[socket.id]);
  io.emit('update', players);

  socket.on('freezePlayer', ({ letter }) => {
    for (let id in players) {
      if (players[id].letter === letter) players[id].frozen = true;
    }
    io.emit('update', players);
  });

socket.on('unfreezePlayer', (data) => {
    let targetId = null;
    if (data && data.letter) {
        for (let id in players) {
            if (players[id].letter === data.letter) {
                targetId = id;
                break;
            }
        }
    } else {
        targetId = socket.id;
    }
    
    if (targetId && players[targetId]) {
        players[targetId].frozen = false;
    }

    io.emit('update', players);
});

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('update', players);
    console.log('Player disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
