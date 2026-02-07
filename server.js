const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(express.static(__dirname));
app.use(express.json());   // IMPORTANT for POST data

// =====================
// GAME STATE
// =====================
const players = {};
let playerNames = [];   // Stores names from login page

const alphabets = 'ABCDEFGHIJKLMNOP'.split('').map(l => ({
  letter: l,
  frozen: false
}));

// =====================
// API ROUTES (Flask replacement)
// =====================
app.post("/add_player", (req, res) => {
  const { name } = req.body;
  if (!name) return res.sendStatus(400);

  playerNames.push({ name });

  // Update everyone’s table instantly
  io.emit("playersUpdated", playerNames);

  res.sendStatus(200);
});

app.get("/get_players", (req, res) => {
  res.json(playerNames);
});

// =====================
// SOCKET.IO GAME LOGIC
// =====================
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

  socket.on('freezePlayer', ({ letter }) => {
    for (let id in players) {
      if (players[id].letter === letter) {
        players[id].frozen = true;
      }
    }
    io.emit('update', { players, alphabets });
  });

  socket.on('unfreezePlayer', ({ letter }) => {
    for (let id in players) {
      if (players[id].letter === letter) {
        players[id].frozen = false;
      }
    }
    io.emit('update', { players, alphabets });
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('update', { players, alphabets });
    console.log('Player disconnected:', socket.id);
  });
});

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
