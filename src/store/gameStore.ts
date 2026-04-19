import { create } from "zustand";
import { getBuildableProperties, getSellableBuildings, reduceGame } from "../engine/engine";
import { createInitialGameState } from "../engine/state";
import type { GameAction, GameState, OwnableTile, Player, TileId } from "../engine/types";

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
  clearError: () => void;
}

const randomDie = () => Math.floor(Math.random() * 6) + 1;

const withCurrentPlayer = (state: GameState, build: (player: Player) => GameAction): GameAction => {
  const player = state.players[state.currentTurn];
  if (!player) throw new Error("No current player.");
  return build(player);
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
