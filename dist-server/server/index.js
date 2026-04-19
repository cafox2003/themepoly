"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = require("node:http");
const ws_1 = require("ws");
const engine_1 = require("../src/engine/engine");
const PORT = Number(process.env.PORT ?? 8787);
const rooms = new Map();
const clientsBySocket = new WeakMap();
const randomId = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
const randomDie = () => (Math.floor(Math.random() * 6) + 1);
const send = (socket, message) => {
    socket.send(JSON.stringify(message));
};
const broadcast = (room, message) => {
    for (const client of room.clients.values()) {
        if (client.socket.readyState === client.socket.OPEN)
            send(client.socket, message);
    }
};
const roomSeats = (room) => Object.fromEntries(room.seats.entries());
const sendRoomSnapshot = (room, client, type) => {
    send(client.socket, {
        type,
        roomId: room.id,
        clientId: client.id,
        claimedPlayerId: client.playerId,
        seats: roomSeats(room),
        state: room.state,
    });
};
const broadcastSeats = (room) => {
    const seats = roomSeats(room);
    for (const client of room.clients.values()) {
        if (client.socket.readyState === client.socket.OPEN) {
            send(client.socket, { type: "SEATS", roomId: room.id, claimedPlayerId: client.playerId, seats });
        }
    }
};
const broadcastState = (room, events = []) => {
    broadcast(room, { type: "STATE", roomId: room.id, seats: roomSeats(room), state: room.state, events });
};
const renamePlayer = (room, playerId, playerName) => {
    const name = playerName?.trim();
    if (!name)
        return;
    const player = room.state.players.find((candidate) => candidate.id === playerId);
    if (player)
        player.name = name;
};
const claimPlayer = (room, client, playerId, playerName) => {
    const player = room.state.players.find((candidate) => candidate.id === playerId);
    if (!player || player.bankrupt)
        throw new Error("Player seat is not available.");
    const occupiedToken = room.seats.get(playerId);
    const occupied = occupiedToken && occupiedToken !== client.token;
    if (occupied)
        throw new Error("That player is already claimed.");
    if (client.playerId && client.playerId !== playerId)
        room.seats.delete(client.playerId);
    room.seats.set(playerId, client.token);
    client.playerId = playerId;
    renamePlayer(room, playerId, playerName);
    broadcastSeats(room);
};
const claimFirstOpenPlayer = (room, client, playerName) => {
    const existingSeat = [...room.seats.entries()].find(([, token]) => token === client.token);
    if (existingSeat) {
        client.playerId = existingSeat[0];
        renamePlayer(room, client.playerId, playerName);
        return;
    }
    const player = room.state.players.find((candidate) => !candidate.bankrupt && !room.seats.has(candidate.id));
    if (player) {
        room.seats.set(player.id, client.token);
        client.playerId = player.id;
        renamePlayer(room, player.id, playerName);
    }
};
const actionWithServerRandomness = (state, action) => {
    if (action.type !== "ROLL_DICE")
        return action;
    const player = state.players[state.currentTurn];
    return {
        ...action,
        playerId: player?.id ?? action.playerId,
        dice: [randomDie(), randomDie()],
    };
};
const parseMessage = (raw) => {
    const parsed = JSON.parse(raw.toString());
    if (!parsed || typeof parsed !== "object" || typeof parsed.type !== "string")
        throw new Error("Invalid message.");
    return parsed;
};
const actionPlayerId = (action) => ("playerId" in action ? action.playerId : null);
const attachClient = (room, socket, token) => {
    const client = { id: randomId("client"), token, roomId: room.id, playerId: null, socket };
    room.clients.set(client.id, client);
    clientsBySocket.set(socket, client);
    socket.on("close", () => {
        room.clients.delete(client.id);
        broadcastSeats(room);
    });
    return client;
};
const createRoom = (socket, message) => {
    const result = (0, engine_1.reduceGame)({}, { type: "START_GAME", players: message.players });
    const room = {
        id: randomId("room"),
        state: result.state,
        clients: new Map(),
        seats: new Map(),
    };
    const client = attachClient(room, socket, message.clientToken);
    claimFirstOpenPlayer(room, client);
    rooms.set(room.id, room);
    sendRoomSnapshot(room, client, "ROOM_CREATED");
    broadcastSeats(room);
};
const joinRoom = (socket, message) => {
    const room = rooms.get(message.roomId);
    if (!room)
        throw new Error("Room not found.");
    const client = attachClient(room, socket, message.clientToken);
    claimFirstOpenPlayer(room, client, message.playerName);
    sendRoomSnapshot(room, client, "ROOM_JOINED");
    broadcastSeats(room);
    broadcastState(room);
};
const claimSeat = (socket, message) => {
    const client = clientsBySocket.get(socket);
    const room = rooms.get(message.roomId);
    if (!client || !room || client.roomId !== room.id)
        throw new Error("Room not found.");
    claimPlayer(room, client, message.playerId, message.playerName);
    broadcastState(room);
};
const applyAction = (socket, message) => {
    const client = clientsBySocket.get(socket);
    const room = rooms.get(message.roomId);
    if (!client || !room || client.roomId !== room.id)
        throw new Error("Room not found.");
    if (!client.playerId)
        throw new Error("Claim a player before taking actions.");
    if (actionPlayerId(message.action) !== client.playerId)
        throw new Error("You can only control your claimed player.");
    const action = actionWithServerRandomness(room.state, message.action);
    const result = (0, engine_1.reduceGame)(room.state, action);
    room.state = result.state;
    broadcastState(room, result.events);
};
const server = (0, node_http_1.createServer)((_request, response) => {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: true, service: "themepoly-multiplayer" }));
});
const wss = new ws_1.WebSocketServer({ server });
wss.on("connection", (socket) => {
    socket.on("message", (raw) => {
        try {
            const message = parseMessage(raw);
            if (message.type === "CREATE_ROOM")
                createRoom(socket, message);
            if (message.type === "JOIN_ROOM")
                joinRoom(socket, message);
            if (message.type === "CLAIM_PLAYER")
                claimSeat(socket, message);
            if (message.type === "ACTION")
                applyAction(socket, message);
        }
        catch (error) {
            send(socket, { type: "ERROR", message: error instanceof Error ? error.message : "Multiplayer error." });
        }
    });
});
server.listen(PORT, () => {
    console.log(`Themepoly multiplayer server listening on http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map