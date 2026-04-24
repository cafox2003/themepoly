import { create } from "zustand";
import { getBuildableProperties, getMortgageableProperties, getSellableBuildings, getUnmortgageableProperties, reduceGame } from "../engine/engine";
import { createInitialGameState } from "../engine/state";
import type { GameAction, GameSettings, GameState, OwnableTile, Player, TileId } from "../engine/types";

interface GameStore {
  state: GameState;
  error: string | null;
  remoteActionSender: ((action: GameAction) => boolean) | null;
  dispatch: (action: GameAction) => void;
  replaceState: (state: GameState) => void;
  setRemoteActionSender: (sender: ((action: GameAction) => boolean) | null) => void;
  startGame: (players: Array<{ name: string; tokenId: string }>) => void;
  rollDice: () => void;
  rollAgain: () => void;
  buyProperty: () => void;
  endTurn: () => void;
  payBail: () => void;
  useJailCard: () => void;
  buyHouse: (tileId: TileId) => void;
  sellHouse: (tileId: TileId) => void;
  sellProperty: (tileId: TileId) => void;
  mortgageProperty: (tileId: TileId) => void;
  unmortgageProperty: (tileId: TileId) => void;
  proposeTrade: (trade: Omit<Extract<GameAction, { type: "PROPOSE_TRADE" }>, "type" | "playerId" | "tradeId">, playerId?: string) => void;
  acceptTrade: (tradeId: string) => void;
  cancelTrade: (tradeId: string, playerId?: string) => void;
  declareBankruptcy: () => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  loadSnapshotFile: (file: File) => Promise<boolean>;
  resetToMenu: () => void;
  clearError: () => void;
}

const randomDie = () => Math.floor(Math.random() * 6) + 1;

const withCurrentPlayer = (state: GameState, build: (player: Player) => GameAction): GameAction => {
  const player = state.players[state.currentTurn];
  if (!player) throw new Error("No current player.");
  return build(player);
};

const normalizeSnapshot = (value: unknown): GameState => {
  if (!value || typeof value !== "object") throw new Error("Snapshot must contain an object.");
  const snapshot = value as GameState;
  if (snapshot.version !== "1.0" || !Array.isArray(snapshot.players) || !snapshot.properties || !snapshot.settings) {
    throw new Error("Snapshot is not a valid Themepoly v1 game.");
  }
  const initial = createInitialGameState();
  return {
    ...initial,
    ...snapshot,
    board: initial.board,
    properties: {
      ...initial.properties,
      ...snapshot.properties,
    },
    pendingTrade: snapshot.pendingTrade ?? null,
    log: Array.isArray(snapshot.log) ? snapshot.log.slice(0, 80) : initial.log,
  };
};

const randomTradeId = () => {
  if (window.crypto?.randomUUID) return `trade_${window.crypto.randomUUID()}`;
  return `trade_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
};

export const useGameStore = create<GameStore>((set, get) => ({
  state: createInitialGameState(),
  error: null,
  remoteActionSender: null,
  dispatch: (action) => {
    if (action.type !== "START_GAME" && get().remoteActionSender?.(action)) {
      set({ error: null });
      return;
    }
    try {
      const result = reduceGame(get().state, action);
      set({ state: result.state, error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Unknown game error." });
    }
  },
  replaceState: (state) => set({ state, error: null }),
  setRemoteActionSender: (sender) => set({ remoteActionSender: sender }),
  startGame: (players) => get().dispatch({ type: "START_GAME", players }),
  rollDice: () => {
    const state = get().state;
    get().dispatch(withCurrentPlayer(state, (player) => ({ type: "ROLL_DICE", playerId: player.id, dice: [randomDie(), randomDie()] })));
  },
  rollAgain: () => {
    const state = get().state;
    get().dispatch(withCurrentPlayer(state, (player) => ({ type: "ROLL_AGAIN", playerId: player.id, dice: [randomDie(), randomDie()] })));
  },
  buyProperty: () => {
    const state = get().state;
    get().dispatch(withCurrentPlayer(state, (player) => ({ type: "BUY_PROPERTY", playerId: player.id })));
  },
  endTurn: () => {
    const state = get().state;
    get().dispatch(withCurrentPlayer(state, (player) => ({ type: "END_TURN", playerId: player.id })));
  },
  payBail: () => {
    const state = get().state;
    get().dispatch(withCurrentPlayer(state, (player) => ({ type: "PAY_BAIL", playerId: player.id })));
  },
  useJailCard: () => {
    const state = get().state;
    get().dispatch(withCurrentPlayer(state, (player) => ({ type: "USE_GET_OUT_OF_JAIL_CARD", playerId: player.id })));
  },
  buyHouse: (tileId) => {
    const state = get().state;
    get().dispatch(withCurrentPlayer(state, (player) => ({ type: "BUY_HOUSE", playerId: player.id, tileId })));
  },
  sellHouse: (tileId) => {
    const state = get().state;
    get().dispatch(withCurrentPlayer(state, (player) => ({ type: "SELL_HOUSE", playerId: player.id, tileId })));
  },
  sellProperty: (tileId) => {
    const state = get().state;
    get().dispatch(withCurrentPlayer(state, (player) => ({ type: "SELL_PROPERTY", playerId: player.id, tileId })));
  },
  mortgageProperty: (tileId) => {
    const state = get().state;
    get().dispatch(withCurrentPlayer(state, (player) => ({ type: "MORTGAGE_PROPERTY", playerId: player.id, tileId })));
  },
  unmortgageProperty: (tileId) => {
    const state = get().state;
    get().dispatch(withCurrentPlayer(state, (player) => ({ type: "UNMORTGAGE_PROPERTY", playerId: player.id, tileId })));
  },
  proposeTrade: (trade, playerId) => {
    const state = get().state;
    const player = playerId ? state.players.find((candidate) => candidate.id === playerId) : state.players[state.currentTurn];
    if (!player) {
      set({ error: "Trade player is not available." });
      return;
    }
    get().dispatch({ type: "PROPOSE_TRADE", playerId: player.id, tradeId: randomTradeId(), ...trade });
  },
  acceptTrade: (tradeId) => {
    const pending = get().state.pendingTrade;
    const player = get().state.players.find((candidate) => candidate.id === pending?.targetPlayerId);
    if (!pending || !player) {
      set({ error: "Trade offer is no longer available." });
      return;
    }
    get().dispatch({ type: "ACCEPT_TRADE", playerId: player.id, tradeId });
  },
  cancelTrade: (tradeId, playerId) => {
    const pending = get().state.pendingTrade;
    const current = get().state.players[get().state.currentTurn];
    const requested = get().state.players.find((player) => player.id === playerId);
    const participant = requested ?? get().state.players.find((player) => player.id === pending?.proposerId || player.id === pending?.targetPlayerId);
    const player = current && (current.id === pending?.proposerId || current.id === pending?.targetPlayerId) ? current : participant;
    if (!pending || !player) {
      set({ error: "Trade offer is no longer available." });
      return;
    }
    get().dispatch({ type: "CANCEL_TRADE", playerId: player.id, tradeId });
  },
  declareBankruptcy: () => {
    const state = get().state;
    get().dispatch(withCurrentPlayer(state, (player) => ({ type: "DECLARE_BANKRUPTCY", playerId: player.id })));
  },
  updateSettings: (settings) => {
    const state = get().state;
    get().dispatch(withCurrentPlayer(state, (player) => ({ type: "UPDATE_SETTINGS", playerId: player.id, settings })));
  },
  loadSnapshotFile: async (file) => {
    try {
      const snapshot = normalizeSnapshot(JSON.parse(await file.text()));
      set({ state: snapshot, error: null });
      return true;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Snapshot could not be loaded." });
      return false;
    }
  },
  resetToMenu: () => set({ state: createInitialGameState(), error: null, remoteActionSender: null }),
  clearError: () => set({ error: null }),
}));

export const selectBuildableProperties = (state: GameState): OwnableTile[] => {
  const player = state.players[state.currentTurn];
  return player ? getBuildableProperties(state, player) : [];
};

export const selectSellableBuildings = (state: GameState): OwnableTile[] => {
  const player = state.players[state.currentTurn];
  return player ? getSellableBuildings(state, player) : [];
};

export const selectMortgageableProperties = (state: GameState): OwnableTile[] => {
  const player = state.players[state.currentTurn];
  return player ? getMortgageableProperties(state, player) : [];
};

export const selectUnmortgageableProperties = (state: GameState): OwnableTile[] => {
  const player = state.players[state.currentTurn];
  return player ? getUnmortgageableProperties(state, player) : [];
};
