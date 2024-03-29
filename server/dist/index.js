"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: "http://localhost:3000",
    credentials: true,
}));
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Credentials", "*");
    res.setHeader("Access-Control-Allow-Origin", "*");
    console.log(req.headers.origin);
    res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,UPDATE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept");
    next();
});
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET,PUT,POST,DELETE,UPDATE,OPTIONS"],
        credentials: true,
    },
});
let connectedClients = 0;
let currentPlayerIndex = 0;
let gameData = {
    squares: Array(9).fill(null),
    isXNext: true,
};
const calculateWinner = (squares) => {
    const lines = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
    ];
    for (let i = 0; i < lines.length; i++) {
        const [a, b, c] = lines[i];
        if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
            return squares[a];
        }
    }
    return null;
};
io.on("connection", (socket) => {
    //listen event
    if (connectedClients < 2) {
        // Allow the connection
        connectedClients++;
        console.log(`Client ${socket.id} connected. Total connected: ${connectedClients}`);
        // Place the client in a specific room (e.g., 'gameRoom')
        socket.join("gameRoom");
        // Send an acknowledgment to the client
        socket.emit("acknowledgment", {
            message: "You are connected to the game.",
        });
        // Send initial game state to the connected client
        socket.emit("initialState", gameData);
        // Broadcast to all clients in the room when a new player joins
        const playerJoinedPayload = { playerId: socket.id };
        io.to("gameRoom").emit("playerJoined", playerJoinedPayload);
        socket.on("move", (index) => {
            if (socket.id === getCurrentPlayerId()) {
                // Player is allowed to make a selection
                if (!gameData.squares[index] && !calculateWinner(gameData.squares)) {
                    gameData.squares[index] = gameData.isXNext ? "X" : "O";
                    gameData.isXNext = !gameData.isXNext;
                    // Broadcast updated game state to all connected clients
                    io.emit("updateState", gameData);
                }
                switchPlayerTurn();
            }
            else {
                // It's not the current player's turn, send a message or handle as needed
                socket.emit("notYourTurn", {
                    message: "It's not your turn to make a selection.",
                });
            }
        });
        // Handle disconnection
        socket.on("disconnect", () => {
            connectedClients--;
            console.log(`Client ${socket.id} disconnected. Total connected: ${connectedClients}`);
            // Broadcast to all clients in the room when a player disconnects
            const playerDisconnectedPayload = {
                playerId: socket.id,
            };
            io.to("gameRoom").emit("playerDisconnected", playerDisconnectedPayload);
        });
    }
    else {
        // Reject the connection
        socket.emit("rejected", {
            message: "Game room is full. Please try again later.",
        });
        socket.disconnect(true); // Disconnect the client
    }
});
function getCurrentPlayerId() {
    return connectedClients > 0
        ? Array.from(io.sockets.adapter.rooms.get("gameRoom"))[currentPlayerIndex]
        : "";
}
function switchPlayerTurn() {
    currentPlayerIndex = (currentPlayerIndex + 1) % 2;
}
server.listen(3001, () => {
    console.log("Server is running on port 3001");
});
