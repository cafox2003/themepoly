import { BOARD, ownableTiles } from "./board";
import type { GameSettings, GameState, Player } from "./types";

export const DEFAULT_SETTINGS: GameSettings = {
  startingMoney: 1500,
  salary: 200,
  freeParkingJackpot: false,
  maxJailTurns: 3,
  bailAmount: 50,
};

export const createInitialGameState = (): GameState => ({
  version: "1.0",
  players: [],
  board: BOARD,
  properties: Object.fromEntries(
    ownableTiles.map((tile) => [tile.id, { ownerId: null, houses: 0, mortgaged: false }]),
  ),
  currentTurn: 0,
  phase: "ROLL",
  dice: [0, 0],
  doublesRolledThisTurn: 0,
  bank: {
    freeParkingPot: 0,
    houses: 32,
    hotels: 12,
  },
  settings: DEFAULT_SETTINGS,
  themeId: "classic",
  chanceDeckIndex: 0,
  communityChestDeckIndex: 0,
  winnerId: null,
  log: [{ id: 1, message: "Create a local pass-and-play game to begin." }],
});

export const createPlayer = (index: number, name: string, tokenId: string, startingMoney: number): Player => ({
  id: `p${index + 1}`,
  name: name.trim() || `Player ${index + 1}`,
  tokenId,
  position: 0,
  money: startingMoney,
  ownedPropertyIds: [],
  inJail: false,
  jailTurns: 0,
  getOutOfJailCards: 0,
  bankrupt: false,
});
