import { create } from "zustand";
import { getBuildableProperties, getMortgageableProperties, getSellableBuildings, getUnmortgageableProperties, reduceGame } from "../engine/engine";
import { createInitialGameState } from "../engine/state";
import type { GameAction, GameSettings, GameState, OwnableTile, Player, TileId } from "../engine/types";

interface GameStore {
  state: GameState;
  error: string | null;
  dispatch: (action: GameAction) => void;
  startGame: (players: Array<{ name: string; tokenId: string }>) => void;
  rollDice: () => void;
  buyProperty: () => void;
  endTurn: () => void;
  payBail: () => void;
  useJailCard: () => void;
  buyHouse: (tileId: TileId) => void;
  sellHouse: (tileId: TileId) => void;
  sellProperty: (tileId: TileId) => void;
  mortgageProperty: (tileId: TileId) => void;
  unmortgageProperty: (tileId: TileId) => void;
  trade: (trade: Omit<Extract<GameAction, { type: "TRADE" }>, "type" | "playerId">) => void;
  declareBankruptcy: () => void;
  updateSettings: (settings: Partial<GameSettings>) => void;
  loadSnapshotFile: (file: File) => Promise<void>;
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
    log: Array.isArray(snapshot.log) ? snapshot.log.slice(0, 80) : initial.log,
  };
};

export const useGameStore = create<GameStore>((set, get) => ({
  state: createInitialGameState(),
  error: null,
  dispatch: (action) => {
    try {
      const result = reduceGame(get().state, action);
      set({ state: result.state, error: null });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Unknown game error." });
    }
  },
  startGame: (players) => get().dispatch({ type: "START_GAME", players }),
  rollDice: () => {
    const state = get().state;
    get().dispatch(withCurrentPlayer(state, (player) => ({ type: "ROLL_DICE", playerId: player.id, dice: [randomDie(), randomDie()] })));
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
  trade: (trade) => {
    const state = get().state;
    get().dispatch(withCurrentPlayer(state, (player) => ({ type: "TRADE", playerId: player.id, ...trade })));
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
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Snapshot could not be loaded." });
    }
  },
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
