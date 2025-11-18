const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(__dirname));

const allowedIPs = ['::1', '2406:8800:9014:57ca:79c0:ae7b:49c3:fb89'];

const players = {};
const alphabets = 'ABCDEFGHIJKLMNOP'.split('');

io.on('connection', (socket) => {

  let ip = socket.handshake.address;

  if (ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }

  console.log(`Connection attempt from ${ip}`);

  if (!allowedIPs.includes(ip)) {
    console.log(`Blocked unauthorized IP: ${ip}`);
    socket.emit('errorMessage', 'You are not allowed to join this game.');
    socket.disconnect(true);
    return;
  }

  console.log('Player connected:', socket.id);

  const assignedLetter = alphabets.find(
    letter => !Object.values(players).some(p => p.letter === letter)
  );

  if (!assignedLetter) {
    socket.emit('errorMessage', 'Game full—no more players can join.');
    socket.disconnect(true);
    return;
  }

  players[socket.id] = { 
    letter: assignedLetter, 
    frozen: false, 
    ip 
  };
  
  socket.emit('assigned', players[socket.id]);
  
  io.emit('update', players);

  socket.on('freezePlayer', (data) => {
    const { letter } = data;

    for (let id in players) {
      if (players[id].letter === letter) {
        players[id].frozen = true;
      }
    }

    io.emit('update', players);
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('update', players);
    console.log('Player disconnected:', socket.id);
  });
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
