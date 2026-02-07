const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(express.static(__dirname));
app.use(express.json());

/
const players = {};

const alphabets = '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36'
  .split('')
  .map(l => ({ letter: l, frozen: false }));

/* ================= HELPER ================= */

function getPlayerList() {
  return Object.values(players).map(p => ({
    name: p.name,
    clicks: p.clicks,
    correct: p.correct,
    attempts: p.attempts,
    accuracy: p.accuracy,
    letter: p.letter,
    frozen: p.frozen
  }));
}

function recalcAccuracy(player) {
  player.accuracy = player.attempts > 0
    ? +(player.correct / player.attempts).toFixed(2)
    : 0;
}

/* ================= SOCKET LOGIC ================= */

io.on('connection', (socket) => {
  console.log("Connected:", socket.id);

  /* ---------- PLAYER JOINS GAME ---------- */
  socket.on("joinGame", ({ name }) => {

    if (!name || name.trim() === "") {
      socket.emit("errorMessage", "Name required");
      return;
    }

    // Prevent duplicate names
    if (Object.values(players).some(p => p.name === name)) {
      socket.emit("errorMessage", "Name already taken");
      return;
    }

    // Find free letter slot
    const freeLetter = alphabets.find(a =>
      !Object.values(players).some(p => p.letter === a.letter)
    );

    if (!freeLetter) {
      socket.emit("errorMessage", "Game full");
      return;
    }

    players[socket.id] = {
      name,
      letter: freeLetter.letter,
      frozen: false,
      clicks: 0,
      correct: 0,
      attempts: 0,
      accuracy: 0
    };

    socket.emit("assigned", players[socket.id]);

    io.emit("update", { players, alphabets });
    io.emit("playersUpdated", getPlayerList());
  });

  /* ---------- CLICK TRACKING ---------- */
  socket.on("markerClick", () => {
    const player = players[socket.id];
    if (!player) return;

    player.clicks++;
    io.emit("playersUpdated", getPlayerList());
  });

  /* ---------- ANSWER CHECKING ---------- */
  socket.on("answerResult", ({ correct }) => {
    const player = players[socket.id];
    if (!player) return;

    player.attempts++;
    if (correct) player.correct++;

    recalcAccuracy(player);
    io.emit("playersUpdated", getPlayerList());
  });

  /* ---------- FREEZE / UNFREEZE ---------- */
  socket.on("freezePlayer", ({ letter }) => {
    for (let id in players) {
      if (players[id].letter === letter) players[id].frozen = true;
    }
    io.emit("update", { players, alphabets });
  });

  socket.on("unfreezePlayer", ({ letter }) => {
    for (let id in players) {
      if (players[id].letter === letter) players[id].frozen = false;
    }
    io.emit("update", { players, alphabets });
  });

  /* ---------- DISCONNECT ---------- */
  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
    delete players[socket.id];

    io.emit("update", { players, alphabets });
    io.emit("playersUpdated", getPlayerList());
  });

});

/* ================= START SERVER ================= */

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
