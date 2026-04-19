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
  joinRoom: (roomId: string, playerName: string) => void;
  claimPlayer: (playerId: string, playerName?: string) => void;
  sendAction: (action: GameAction) => boolean;
  clearError: () => void;
}

let socket: WebSocket | null = null;
const clientTokenKey = "themepoly-client-token";

const randomToken = () => {
  if (window.crypto?.randomUUID) return `client_${window.crypto.randomUUID()}`;
  return `client_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
};

const getClientToken = () => {
  const stored = window.localStorage.getItem(clientTokenKey);
  if (stored) return stored;
  const token = randomToken();
  window.localStorage.setItem(clientTokenKey, token);
  return token;
};

const send = (message: ClientMessage) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error("Multiplayer is not connected.");
  socket.send(JSON.stringify(message));
};

const defaultUrl = () => {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  // return `${protocol}://${window.location.hostname}:8787`;
  return "https://themepoly.onrender.com/"
};

const actionPlayerId = (action: GameAction) => ("playerId" in action ? action.playerId : null);

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
      if (socket) socket.close();
      set({ status: "connecting", url, error: null });
      socket = new WebSocket(url);

      socket.onopen = () => {
        useGameStore.getState().setRemoteActionSender((action) => get().sendAction(action));
        set({ status: "connected", error: null });
        resolve();
      };
      socket.onerror = () => {
        const error = new Error("Could not connect to multiplayer server.");
        set({ status: "offline", error: error.message });
        reject(error);
      };
      socket.onclose = () => {
        useGameStore.getState().setRemoteActionSender(null);
        set({ status: "offline" });
      };
      socket.onmessage = (event) => {
        const message = JSON.parse(event.data) as ServerMessage;
        if (message.type === "ERROR") {
          set({ error: message.message });
          return;
        }
        if (message.type === "ROOM_CREATED" || message.type === "ROOM_JOINED") {
          useGameStore.getState().replaceState(message.state);
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
    socket?.close();
    socket = null;
    useGameStore.getState().setRemoteActionSender(null);
    set({ status: "offline", roomId: "", clientId: "", claimedPlayerId: null, seats: {} });
  },
  createRoom: (players) => {
    try {
      send({ type: "CREATE_ROOM", clientToken: get().clientToken, players });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Could not create room." });
    }
  },
  joinRoom: (roomId, playerName) => {
    try {
      send({ type: "JOIN_ROOM", roomId: roomId.trim(), clientToken: get().clientToken, playerName: playerName.trim() || "Player" });
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
