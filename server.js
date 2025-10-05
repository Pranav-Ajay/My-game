const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(__dirname)); 

const allowedIPs = [
  '::1',               
  '192.168.1.107'      
];

const players = {};
const alphabets = 'ABCDEFGHIJKLMNOP'.split('');

io.on('connection', (socket) => {
  const ip = socket.handshake.address.replace('::ffff:', ''); 
  console.log(`Connection attempt from ${ip}`);

  if (!allowedIPs.includes(ip)) {
    console.log(`Blocked unauthorized IP: ${ip}`);
    socket.emit('errorMessage', 'You are not allowed to join this game.');
    socket.disconnect();
    return;
  }

  console.log('A player connected:', socket.id);

  const assigned = alphabets.find(a => !Object.values(players).map(p => p.letter).includes(a));
  players[socket.id] = { letter: assigned, frozen: false, ip };

  socket.emit('assigned', players[socket.id]);
  io.emit('update', players);

  socket.on('freeze', (letter) => {
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

server.listen(3000, () => console.log('Server running on port 3000'));
