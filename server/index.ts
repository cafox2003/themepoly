import { createServer } from "node:http";
import { WebSocketServer, type RawData, type WebSocket } from "ws";
import { reduceGame } from "../src/engine/engine";
import type { GameAction, GameState } from "../src/engine/types";
import type { ClientMessage, RoomSeats, ServerMessage } from "../src/multiplayer/protocol";

interface Client {
  id: string;
  token: string;
  roomId: string;
  playerId: string | null;
  socket: WebSocket;
}

interface Room {
  id: string;
  state: GameState;
  clients: Map<string, Client>;
  seats: Map<string, string>;
}

const PORT = Number(process.env.PORT ?? 8787);
const rooms = new Map<string, Room>();
const clientsBySocket = new WeakMap<WebSocket, Client>();

const randomId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
const randomDie = () => (Math.floor(Math.random() * 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6;

const send = (socket: WebSocket, message: ServerMessage) => {
  socket.send(JSON.stringify(message));
};

const broadcast = (room: Room, message: ServerMessage) => {
  for (const client of room.clients.values()) {
    if (client.socket.readyState === client.socket.OPEN) send(client.socket, message);
  }
};

const roomSeats = (room: Room): RoomSeats =>
  Object.fromEntries(room.seats.entries());

const sendRoomSnapshot = (room: Room, client: Client, type: "ROOM_CREATED" | "ROOM_JOINED") => {
  send(client.socket, {
    type,
    roomId: room.id,
    clientId: client.id,
    claimedPlayerId: client.playerId,
    seats: roomSeats(room),
    state: room.state,
  });
};

const broadcastSeats = (room: Room) => {
  const seats = roomSeats(room);
  for (const client of room.clients.values()) {
    if (client.socket.readyState === client.socket.OPEN) {
      send(client.socket, { type: "SEATS", roomId: room.id, claimedPlayerId: client.playerId, seats });
    }
  }
};

const broadcastState = (room: Room, events: string[] = []) => {
  broadcast(room, { type: "STATE", roomId: room.id, seats: roomSeats(room), state: room.state, events });
};

const renamePlayer = (room: Room, playerId: string, playerName?: string) => {
  const name = playerName?.trim();
  if (!name) return;
  const player = room.state.players.find((candidate) => candidate.id === playerId);
  if (player) player.name = name;
};

const claimPlayer = (room: Room, client: Client, playerId: string, playerName?: string) => {
  const player = room.state.players.find((candidate) => candidate.id === playerId);
  if (!player || player.bankrupt) throw new Error("Player seat is not available.");
  const occupiedToken = room.seats.get(playerId);
  const occupied = occupiedToken && occupiedToken !== client.token;
  if (occupied) throw new Error("That player is already claimed.");
  if (client.playerId && client.playerId !== playerId) room.seats.delete(client.playerId);
  room.seats.set(playerId, client.token);
  client.playerId = playerId;
  renamePlayer(room, playerId, playerName);
  broadcastSeats(room);
};

const claimFirstOpenPlayer = (room: Room, client: Client, playerName?: string) => {
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

const actionWithServerRandomness = (state: GameState, action: GameAction): GameAction => {
  if (action.type !== "ROLL_DICE") return action;
  const player = state.players[state.currentTurn];
  return {
    ...action,
    playerId: player?.id ?? action.playerId,
    dice: [randomDie(), randomDie()],
  };
};

const parseMessage = (raw: RawData): ClientMessage => {
  const parsed = JSON.parse(raw.toString()) as ClientMessage;
  if (!parsed || typeof parsed !== "object" || typeof parsed.type !== "string") throw new Error("Invalid message.");
  return parsed;
};

const actionPlayerId = (action: GameAction) => ("playerId" in action ? action.playerId : null);

const attachClient = (room: Room, socket: WebSocket, token: string) => {
  const existingClient = clientsBySocket.get(socket);
  if (existingClient) {
    const existingRoom = rooms.get(existingClient.roomId);
    existingRoom?.clients.delete(existingClient.id);
    if (existingRoom) broadcastSeats(existingRoom);
  }
  const client: Client = { id: randomId("client"), token, roomId: room.id, playerId: null, socket };
  room.clients.set(client.id, client);
  clientsBySocket.set(socket, client);
  socket.on("close", () => {
    room.clients.delete(client.id);
    broadcastSeats(room);
  });
  return client;
};

const createRoom = (socket: WebSocket, message: Extract<ClientMessage, { type: "CREATE_ROOM" }>) => {
  const result = reduceGame({} as GameState, { type: "START_GAME", players: message.players });
  const room: Room = {
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

const joinRoom = (socket: WebSocket, message: Extract<ClientMessage, { type: "JOIN_ROOM" }>) => {
  const room = rooms.get(message.roomId);
  if (!room) throw new Error("Room not found.");
  const client = attachClient(room, socket, message.clientToken);
  claimFirstOpenPlayer(room, client, message.playerName);
  sendRoomSnapshot(room, client, "ROOM_JOINED");
  broadcastSeats(room);
  broadcastState(room);
};

const claimSeat = (socket: WebSocket, message: Extract<ClientMessage, { type: "CLAIM_PLAYER" }>) => {
  const client = clientsBySocket.get(socket);
  const room = rooms.get(message.roomId);
  if (!client || !room || client.roomId !== room.id) throw new Error("Room not found.");
  claimPlayer(room, client, message.playerId, message.playerName);
  broadcastState(room);
};

const applyAction = (socket: WebSocket, message: Extract<ClientMessage, { type: "ACTION" }>) => {
  const client = clientsBySocket.get(socket);
  const room = rooms.get(message.roomId);
  if (!client || !room || client.roomId !== room.id) throw new Error("Room not found.");
  if (!client.playerId) throw new Error("Claim a player before taking actions.");
  if (actionPlayerId(message.action) !== client.playerId) throw new Error("You can only control your claimed player.");
  const action = actionWithServerRandomness(room.state, message.action);
  const result = reduceGame(room.state, action);
  room.state = result.state;
  broadcastState(room, result.events);
};

const rematchRoom = (socket: WebSocket, message: Extract<ClientMessage, { type: "REMATCH" }>) => {
  const client = clientsBySocket.get(socket);
  const room = rooms.get(message.roomId);
  if (!client || !room || client.roomId !== room.id) throw new Error("Room not found.");
  if (!client.playerId) throw new Error("Claim a player before starting a rematch.");
  const players = room.state.players.map((player) => ({ name: player.name, tokenId: player.tokenId }));
  const result = reduceGame(room.state, { type: "START_GAME", players });
  room.state = result.state;
  broadcastState(room, result.events);
  broadcastSeats(room);
};

const server = createServer((_request, response) => {
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ ok: true, service: "themepoly-multiplayer" }));
});

const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {
  socket.on("message", (raw) => {
    try {
      const message = parseMessage(raw);
      if (message.type === "CREATE_ROOM") createRoom(socket, message);
      if (message.type === "JOIN_ROOM") joinRoom(socket, message);
      if (message.type === "CLAIM_PLAYER") claimSeat(socket, message);
      if (message.type === "ACTION") applyAction(socket, message);
      if (message.type === "REMATCH") rematchRoom(socket, message);
    } catch (error) {
      send(socket, { type: "ERROR", message: error instanceof Error ? error.message : "Multiplayer error." });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Themepoly multiplayer server listening on http://localhost:${PORT}`);
});
