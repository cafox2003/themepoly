import { create } from "zustand";
import type { GameAction, GameState } from "../engine/types";
import type { ClientMessage, RoomSeats, ServerMessage } from "../multiplayer/protocol";
import { useGameStore } from "./gameStore";

type ConnectionStatus = "offline" | "connecting" | "connected";

interface MultiplayerStore {
  status: ConnectionStatus;
  roomId: string;
  clientId: string;
  clientToken: string;
  claimedPlayerId: string | null;
  seats: RoomSeats;
  url: string;
  error: string | null;
  connect: (url: string) => Promise<void>;
  disconnect: () => void;
  createRoom: (players: Array<{ name: string; tokenId: string }>) => void;
  joinRoom: (roomId: string, playerName: string, tokenId?: string) => void;
  claimPlayer: (playerId: string, playerName?: string) => void;
  rematchRoom: () => void;
  loadRoomState: (state: GameState) => boolean;
  sendAction: (action: GameAction) => boolean;
  clearError: () => void;
}

let socket: WebSocket | null = null;
let intentionalClose = false;
let reconnectTimer: number | null = null;
let heartbeatTimer: number | null = null;
let reconnectAttempt = 0;
let lastRoomId = "";
let lastPlayerName = "Player";
let lastTokenId: string | undefined;
const clientTokenKey = "themepoly-client-token";

const randomToken = () => {
  if (window.crypto?.randomUUID) return `client_${window.crypto.randomUUID()}`;
  return `client_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
};

const getClientToken = () => {
  const stored = window.sessionStorage.getItem(clientTokenKey);
  if (stored) return stored;
  const token = randomToken();
  window.sessionStorage.setItem(clientTokenKey, token);
  return token;
};

const send = (message: ClientMessage) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error("Multiplayer is not connected.");
  socket.send(JSON.stringify(message));
};

const defaultUrl = () => {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return `${protocol}://${window.location.hostname}:8787`;
  }
  return "wss://themepoly.onrender.com/";
};

const actionPlayerId = (action: GameAction) => ("playerId" in action ? action.playerId : null);

const clearReconnectTimer = () => {
  if (reconnectTimer !== null) window.clearTimeout(reconnectTimer);
  reconnectTimer = null;
};

const stopHeartbeat = () => {
  if (heartbeatTimer !== null) window.clearInterval(heartbeatTimer);
  heartbeatTimer = null;
};

const startHeartbeat = () => {
  stopHeartbeat();
  heartbeatTimer = window.setInterval(() => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "PING" } satisfies ClientMessage));
    }
  }, 25000);
};

export const useMultiplayerStore = create<MultiplayerStore>((set, get) => ({
  status: "offline",
  roomId: "",
  clientId: "",
  clientToken: getClientToken(),
  claimedPlayerId: null,
  seats: {},
  url: defaultUrl(),
  error: null,
  connect: (url) =>
    new Promise((resolve, reject) => {
      let settled = false;
      if (socket) {
        intentionalClose = true;
        socket.close();
      }
      intentionalClose = false;
      clearReconnectTimer();
      stopHeartbeat();
      set({ status: "connecting", url, error: null });
      socket = new WebSocket(url);

      socket.onopen = () => {
        settled = true;
        reconnectAttempt = 0;
        useGameStore.getState().setRemoteActionSender((action) => get().sendAction(action));
        set({ status: "connected", error: null });
        startHeartbeat();
        resolve();
      };
      socket.onerror = () => {
        const error = new Error("Could not connect to multiplayer server.");
        set({ status: "offline", error: reconnectAttempt > 0 ? "Still reconnecting to multiplayer server..." : error.message });
        if (!settled) {
          settled = true;
          reject(error);
        }
      };
      socket.onclose = () => {
        useGameStore.getState().setRemoteActionSender(null);
        stopHeartbeat();
        socket = null;
        const wasIntentional = intentionalClose;
        intentionalClose = false;
        const previousRoomId = get().roomId;
        const previousPlayerName = useGameStore.getState().state.players.find((player) => player.id === get().claimedPlayerId)?.name ?? "Player";
        if (previousRoomId) {
          lastRoomId = previousRoomId;
          lastPlayerName = previousPlayerName;
        }
        set({ status: wasIntentional ? "offline" : previousRoomId ? "connecting" : "offline", error: wasIntentional ? null : "Connection lost. Reconnecting..." });
        if (!wasIntentional && previousRoomId) {
          const scheduleReconnect = () => {
            if (get().status === "connected") return;
            const delay = Math.min(30000, 1000 * 2 ** reconnectAttempt);
            reconnectAttempt += 1;
            reconnectTimer = window.setTimeout(() => {
              if (get().status === "connected") return;
              get().connect(get().url)
                .then(() => get().joinRoom(lastRoomId, lastPlayerName, lastTokenId))
                .catch(() => scheduleReconnect());
            }, delay);
          };
          scheduleReconnect();
        }
      };
      socket.onmessage = (event) => {
        const message = JSON.parse(event.data) as ServerMessage;
        if (message.type === "PONG") return;
        if (message.type === "ERROR") {
          set({ error: message.message });
          return;
        }
        if (message.type === "ROOM_CREATED" || message.type === "ROOM_JOINED") {
          useGameStore.getState().replaceState(message.state);
          lastRoomId = message.roomId;
          lastPlayerName = message.state.players.find((player) => player.id === message.claimedPlayerId)?.name ?? lastPlayerName;
          set({ roomId: message.roomId, clientId: message.clientId, claimedPlayerId: message.claimedPlayerId, seats: message.seats, error: null });
          return;
        }
        if (message.type === "SEATS") {
          set({ claimedPlayerId: message.claimedPlayerId, seats: message.seats, error: null });
          return;
        }
        if (message.type === "STATE") {
          useGameStore.getState().replaceState(message.state as GameState);
          set({ seats: message.seats, claimedPlayerId: message.claimedPlayerId ?? get().claimedPlayerId });
        }
      };
    }),
  disconnect: () => {
    intentionalClose = true;
    clearReconnectTimer();
    stopHeartbeat();
    socket?.close();
    socket = null;
    lastRoomId = "";
    useGameStore.getState().setRemoteActionSender(null);
    set({ status: "offline", roomId: "", clientId: "", claimedPlayerId: null, seats: {}, error: null });
  },
  createRoom: (players) => {
    try {
      send({ type: "CREATE_ROOM", clientToken: get().clientToken, players });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Could not create room." });
    }
  },
  joinRoom: (roomId, playerName, tokenId) => {
    try {
      lastRoomId = roomId.trim();
      lastPlayerName = playerName.trim() || "Player";
      lastTokenId = tokenId;
      send({ type: "JOIN_ROOM", roomId: lastRoomId, clientToken: get().clientToken, playerName: lastPlayerName, tokenId });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Could not join room." });
    }
  },
  claimPlayer: (playerId, playerName) => {
    const roomId = get().roomId;
    try {
      send({ type: "CLAIM_PLAYER", roomId, playerId, playerName });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Could not claim player." });
    }
  },
  rematchRoom: () => {
    const roomId = get().roomId;
    try {
      send({ type: "REMATCH", roomId });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Could not start rematch." });
    }
  },
  loadRoomState: (state) => {
    const roomId = get().roomId;
    if (!roomId || get().status !== "connected") return false;
    try {
      send({ type: "LOAD_STATE", roomId, state });
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Could not load game for room." });
      return false;
    }
  },
  sendAction: (action) => {
    const roomId = get().roomId;
    if (!roomId || get().status !== "connected") return false;
    if (!get().claimedPlayerId) {
      set({ error: "Claim a player before taking actions." });
      return true;
    }
    if (actionPlayerId(action) !== get().claimedPlayerId) {
      set({ error: "You can only control your claimed player." });
      return true;
    }
    try {
      send({ type: "ACTION", roomId, action });
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Could not send action." });
      return false;
    }
  },
  clearError: () => set({ error: null }),
}));
