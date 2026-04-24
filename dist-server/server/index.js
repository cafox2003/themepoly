"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_http_1 = require("node:http");
const ws_1 = require("ws");
const engine_1 = require("../src/engine/engine");
const PORT = Number(process.env.PORT ?? 8787);
const rooms = new Map();
const clientsBySocket = new WeakMap();
const randomId = (prefix) => `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
const randomRoomId = () => Math.random().toString(36).slice(2, 8).toUpperCase();
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
    if (!player)
        return;
    const usedNames = new Set(room.state.players
        .filter((candidate) => candidate.id !== playerId)
        .map((candidate) => candidate.name.trim().toLocaleLowerCase()));
    let uniqueName = name;
    let suffix = 2;
    while (usedNames.has(uniqueName.toLocaleLowerCase())) {
        uniqueName = `${name} ${suffix}`;
        suffix += 1;
    }
    player.name = uniqueName;
};
const setPlayerToken = (room, playerId, tokenId) => {
    if (!tokenId)
        return;
    const player = room.state.players.find((candidate) => candidate.id === playerId);
    if (!player)
        return;
    const tokenTaken = room.state.players.some((candidate) => candidate.id !== playerId && candidate.tokenId === tokenId);
    if (!tokenTaken)
        player.tokenId = tokenId;
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
const claimFirstOpenPlayer = (room, client, playerName, tokenId) => {
    const existingSeat = [...room.seats.entries()].find(([, token]) => token === client.token);
    if (existingSeat) {
        client.playerId = existingSeat[0];
        renamePlayer(room, client.playerId, playerName);
        setPlayerToken(room, client.playerId, tokenId);
        return;
    }
    const player = room.state.players.find((candidate) => !candidate.bankrupt && !room.seats.has(candidate.id));
    if (player) {
        room.seats.set(player.id, client.token);
        client.playerId = player.id;
        renamePlayer(room, player.id, playerName);
        setPlayerToken(room, player.id, tokenId);
    }
};
const actionWithServerRandomness = (state, action) => {
    if (action.type !== "ROLL_DICE" && action.type !== "ROLL_AGAIN")
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
    const existingClient = clientsBySocket.get(socket);
    if (existingClient) {
        const existingRoom = rooms.get(existingClient.roomId);
        existingRoom?.clients.delete(existingClient.id);
        if (existingRoom)
            broadcastSeats(existingRoom);
    }
    for (const client of room.clients.values()) {
        if (client.token === token && client.socket.readyState !== client.socket.OPEN) {
            room.clients.delete(client.id);
        }
    }
    const client = { id: randomId("client"), token, roomId: room.id, playerId: null, socket, alive: true };
    room.clients.set(client.id, client);
    clientsBySocket.set(socket, client);
    socket.on("pong", () => {
        client.alive = true;
    });
    socket.on("close", () => {
        room.clients.delete(client.id);
        broadcastSeats(room);
    });
    return client;
};
const createRoom = (socket, message) => {
    const result = (0, engine_1.reduceGame)({}, { type: "START_GAME", players: message.players });
    const room = {
        id: randomRoomId(),
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
    claimFirstOpenPlayer(room, client, message.playerName, message.tokenId);
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
const rematchRoom = (socket, message) => {
    const client = clientsBySocket.get(socket);
    const room = rooms.get(message.roomId);
    if (!client || !room || client.roomId !== room.id)
        throw new Error("Room not found.");
    if (!client.playerId)
        throw new Error("Claim a player before starting a rematch.");
    const players = room.state.players.map((player) => ({ name: player.name, tokenId: player.tokenId }));
    const result = (0, engine_1.reduceGame)(room.state, { type: "START_GAME", players });
    room.state = result.state;
    broadcastState(room, result.events);
    broadcastSeats(room);
};
const loadRoomState = (socket, message) => {
    const client = clientsBySocket.get(socket);
    const room = rooms.get(message.roomId);
    if (!client || !room || client.roomId !== room.id)
        throw new Error("Room not found.");
    if (!client.playerId)
        throw new Error("Claim a player before loading a game.");
    if (message.state.version !== "1.0" || !Array.isArray(message.state.players) || !message.state.properties || !message.state.settings) {
        throw new Error("Snapshot is not a valid Themepoly v1 game.");
    }
    room.state = message.state;
    for (const playerId of [...room.seats.keys()]) {
        if (!room.state.players.some((player) => player.id === playerId && !player.bankrupt))
            room.seats.delete(playerId);
    }
    broadcastState(room, [`${room.state.players.find((player) => player.id === client.playerId)?.name ?? "A player"} loaded a saved game.`]);
    broadcastSeats(room);
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
            if (message.type === "REMATCH")
                rematchRoom(socket, message);
            if (message.type === "LOAD_STATE")
                loadRoomState(socket, message);
            if (message.type === "PING")
                send(socket, { type: "PONG" });
        }
        catch (error) {
            send(socket, { type: "ERROR", message: error instanceof Error ? error.message : "Multiplayer error." });
        }
    });
});
const keepAliveInterval = setInterval(() => {
    for (const socket of wss.clients) {
        const client = clientsBySocket.get(socket);
        if (client && !client.alive) {
            socket.terminate();
            continue;
        }
        if (client)
            client.alive = false;
        socket.ping();
    }
}, 30000);
wss.on("close", () => clearInterval(keepAliveInterval));
server.listen(PORT, () => {
    console.log(`Themepoly multiplayer server listening on http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map