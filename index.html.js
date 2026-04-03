const express = require("express");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

let messages = [];

app.post("/send", (req, res) => {
    const text = req.body.text;
    if (text && text.trim() !== "") {
        messages.push(text);
    }
    res.send("OK");
});

app.get("/messages", (req, res) => {
    res.json(messages);
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(3000, () => {
    console.log("Сайт працює: http://localhost:3000");
});