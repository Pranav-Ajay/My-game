const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(express.static(__dirname));

const players = {};
const alphabets = 'ABCDEFGHIJKLMNOP'.split('').map(l => ({
  letter: l,
  frozen: false
}));

io.on('connection', (socket) => {
  console.log("Player connected:", socket.id);

  const assignedLetterObj = alphabets.find(a =>
    !Object.values(players).some(p => p.letter === a.letter)
  );

  if (!assignedLetterObj) {
    socket.emit('errorMessage', 'Game full');
    socket.disconnect(true);
    return;
  }

  players[socket.id] = { letter: assignedLetterObj.letter };
  socket.emit('assigned', players[socket.id]);
  io.emit('update', { players, alphabets });

  // Freeze PLAYER
  socket.on('freezePlayer', ({ letter }) => {
    for (let id in players) {
      if (players
