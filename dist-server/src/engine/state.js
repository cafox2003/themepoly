"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPlayer = exports.createInitialGameState = exports.DEFAULT_SETTINGS = void 0;
const board_1 = require("./board");
exports.DEFAULT_SETTINGS = {
    startingMoney: 1500,
    salary: 200,
    freeParkingJackpot: false,
    maxJailTurns: 3,
    bailAmount: 50,
};
const createInitialGameState = () => ({
    version: "1.0",
    players: [],
    board: board_1.BOARD,
    properties: Object.fromEntries(board_1.ownableTiles.map((tile) => [tile.id, { ownerId: null, houses: 0, mortgaged: false }])),
    currentTurn: 0,
    phase: "ROLL",
    dice: [0, 0],
    doublesRolledThisTurn: 0,
    bank: {
        freeParkingPot: 0,
        houses: 32,
        hotels: 12,
    },
    settings: exports.DEFAULT_SETTINGS,
    themeId: "classic",
    chanceDeckIndex: 0,
    communityChestDeckIndex: 0,
    winnerId: null,
    pendingTrade: null,
    log: [{ id: 1, message: "Create a local pass-and-play game to begin." }],
});
exports.createInitialGameState = createInitialGameState;
const createPlayer = (index, name, tokenId, startingMoney) => ({
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
exports.createPlayer = createPlayer;
//# sourceMappingURL=state.js.map