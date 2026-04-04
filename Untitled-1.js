 /**
 * AnonTalk – WebSocket Server
 * Stack: Node.js + Express + Socket.io
 *
 * Install:  npm install
 * Run:      node server.js
 * Prod:     PORT=3001 node server.js
 */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // tighten in production
    methods: ["GET", "POST"],
  },
});

// ── Serve built React client (optional – place your dist/ here) ──────────────
app.use(express.static(path.join(__dirname, "dist")));
app.get("*", (_, res) =>
  res.sendFile(path.join(__dirname, "dist", "index.html"))
);

// ── State ────────────────────────────────────────────────────────────────────
/** @type {string[]} socketIds waiting for a partner */
const queue = [];

/** @type {Map<string, string>} socketId → partnerId */
const pairs = new Map();

// ── Simple profanity filter ──────────────────────────────────────────────────
const BAD_WORDS = ["spam", "scam"]; // extend as needed
function filter(text) {
  let out = text;
  BAD_WORDS.forEach((w) => {
    out = out.replace(new RegExp(w, "gi"), "***");
  });
  return out;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function removeFromQueue(id) {
  const idx = queue.indexOf(id);
  if (idx !== -1) queue.splice(idx, 1);
}

function pair(a, b) {
  pairs.set(a, b);
  pairs.set(b, a);
  io.to(a).emit("matched");
  io.to(b).emit("matched");
  console.log(`Paired: ${a.slice(0, 6)} ↔ ${b.slice(0, 6)}`);
}

function unpair(id) {
  const partner = pairs.get(id);
  pairs.delete(id);
  if (partner) {
    pairs.delete(partner);
    io.to(partner).emit("partner_left");
    console.log(`Unpairedpair: ${id.slice(0, 6)} left`);
  }
}

// ── Socket.io ────────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`Connect: ${socket.id.slice(0, 6)}`);

  // Client requests matchmaking
  socket.on("find_partner", () => {
    removeFromQueue(socket.id);

    if (queue.length > 0) {
      const partnerId = queue.shift();
      pair(socket.id, partnerId);
    } else {
      queue.push(socket.id);
      socket.emit("waiting");
      console.log(`Waiting: ${socket.id.slice(0, 6)} | Queue: ${queue.length}`);
    }
  });

  // Client sends a chat message
  socket.on("message", (text) => {
    const partner = pairs.get(socket.id);
    if (!partner) return;
    const clean = filter(String(text).slice(0, 1000));
    io.to(partner).emit("message", clean);
  });

  // Client is typing
  socket.on("typing", (isTyping) => {
    const partner = pairs.get(socket.id);
    if (partner) io.to(partner).emit("partner_typing", !!isTyping);
  });

  // Client wants to skip / find next
  socket.on("skip", () => {
    unpair(socket.id);
    // Re-enqueue or pair immediately
    if (queue.length > 0) {
      const partnerId = queue.shift();
      pair(socket.id, partnerId);
    } else {
      queue.push(socket.id);
      socket.emit("waiting");
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    removeFromQueue(socket.id);
    unpair(socket.id);
    console.log(`Disconnect: ${socket.id.slice(0, 6)}`);
  });
});

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🟢 AnonTalk server running on http://localhost:${PORT}\n`);
});