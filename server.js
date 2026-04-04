const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

io.on("connection", (socket) => {
    console.log("Користувач підключився");

    socket.on("chat message", (msg) => {
        io.emit("chat message", msg); // відправляє всім
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log("Сервер працює на http://localhost:3000");
});