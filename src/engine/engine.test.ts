import { describe, expect, it } from "vitest";
import { isOwnable, tileById } from "./board";
import { CHANCE_DECK, COMMUNITY_CHEST_DECK } from "./cards";
import { reduceGame } from "./engine";
import type { GameAction, GameState, OwnableTile, TileId } from "./types";

const startGame = () =>
  reduceGame(
    {} as GameState,
    {
      type: "START_GAME",
      players: [
        { name: "Ada", tokenId: "car" },
        { name: "Grace", tokenId: "ship" },
      ],
    },
  ).state;

const act = (state: GameState, action: GameAction) => reduceGame(state, action).state;

const ownable = (tileId: TileId): OwnableTile => {
  const tile = tileById(tileId);
  if (!isOwnable(tile)) throw new Error(`${tileId} is not ownable`);
  return tile;
};

const setOwner = (state: GameState, playerId: string, tileId: TileId) => {
  state.properties[tileId].ownerId = playerId;
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new Error(`Unknown player ${playerId}`);
  if (!player.ownedPropertyIds.includes(tileId)) player.ownedPropertyIds.push(tileId);
};

describe("Themepoly engine", () => {
  it("starts a serializable game with versioned state and default player money", () => {
    const state = startGame();

    expect(state.version).toBe("1.0");
    expect(state.players).toHaveLength(2);
    expect(state.players[0]).toMatchObject({ id: "p1", name: "Ada", money: 1500, position: 0 });
    expect(state.players[1]).toMatchObject({ id: "p2", name: "Grace", money: 1500, position: 0 });
    expect(state.board).toHaveLength(40);
    expect(JSON.parse(JSON.stringify(state))).toMatchObject({ version: "1.0", themeId: "classic" });
  });

  it("moves players with injected dice and pays salary when passing GO", () => {
    let state = startGame();
    state.players[0].position = 39;

    state = act(state, { type: "ROLL_DICE", playerId: "p1", dice: [3, 2] });

    expect(state.players[0].position).toBe(4);
    expect(state.players[0].money).toBe(1500);
    expect(state.players[0].money).toBe(1500 + 200 - 200);
    expect(state.log[0].message).toContain("Income Tax");
  });

  it("pays a bonus when landing exactly on GO", () => {
    let state = startGame();
    state.players[0].position = 38;

    state = act(state, { type: "ROLL_DICE", playerId: "p1", dice: [1, 1] });

    expect(state.players[0].position).toBe(0);
    expect(state.players[0].money).toBe(1800);
  });

  it("buys unowned property after landing on it", () => {
    let state = startGame();

    state = act(state, { type: "ROLL_DICE", playerId: "p1", dice: [1, 2] });
    state = act(state, { type: "BUY_PROPERTY", playerId: "p1" });

    expect(state.properties.BALTIC_AVENUE.ownerId).toBe("p1");
    expect(state.players[0].ownedPropertyIds).toContain("BALTIC_AVENUE");
    expect(state.players[0].money).toBe(1440);
  });

  it("pays rent to the property owner", () => {
    let state = startGame();
    setOwner(state, "p2", "BALTIC_AVENUE");

    state = act(state, { type: "ROLL_DICE", playerId: "p1", dice: [1, 2] });

    expect(state.players[0].money).toBe(1496);
    expect(state.players[1].money).toBe(1504);
  });

  it("doubles base rent when the owner has a complete color group", () => {
    let state = startGame();
    setOwner(state, "p2", "MEDITERRANEAN_AVENUE");
    setOwner(state, "p2", "BALTIC_AVENUE");

    state = act(state, { type: "ROLL_DICE", playerId: "p1", dice: [1, 2] });

    expect(state.players[0].money).toBe(1492);
    expect(state.players[1].money).toBe(1508);
  });

  it("calculates railroad and utility rent from owned count and dice", () => {
    let state = startGame();
    setOwner(state, "p2", "READING_RAILROAD");
    setOwner(state, "p2", "PENNSYLVANIA_RAILROAD");

    state = act(state, { type: "ROLL_DICE", playerId: "p1", dice: [2, 3] });

    expect(state.players[0].money).toBe(1450);
    expect(state.players[1].money).toBe(1550);

    state = act(state, { type: "END_TURN", playerId: "p1" });
    state.players[1].position = 5;
    setOwner(state, "p1", "ELECTRIC_COMPANY");
    setOwner(state, "p1", "WATER_WORKS");

    state = act(state, { type: "ROLL_DICE", playerId: "p2", dice: [3, 4] });

    expect(state.players[1].position).toBe(12);
    expect(state.players[1].money).toBe(1480);
    expect(state.players[0].money).toBe(1520);
  });

  it("keeps the same player after doubles and sends them to holding on the third doubles roll", () => {
    let state = startGame();

    state = act(state, { type: "ROLL_DICE", playerId: "p1", dice: [1, 1] });
    state = act(state, { type: "END_TURN", playerId: "p1" });
    expect(state.currentTurn).toBe(0);
    expect(state.phase).toBe("ROLL");

    state = act(state, { type: "ROLL_DICE", playerId: "p1", dice: [2, 2] });
    state = act(state, { type: "END_TURN", playerId: "p1" });
    state = act(state, { type: "ROLL_DICE", playerId: "p1", dice: [3, 3] });

    expect(state.players[0].inJail).toBe(true);
    expect(state.players[0].position).toBe(10);
    expect(state.phase).toBe("JAILED");
  });

  it("rolls again from one action after doubles", () => {
    let state = startGame();

    state = act(state, { type: "ROLL_DICE", playerId: "p1", dice: [2, 2] });
    state = act(state, { type: "ROLL_AGAIN", playerId: "p1", dice: [2, 3] });

    expect(state.currentTurn).toBe(0);
    expect(state.players[0].position).toBe(9);
    expect(state.phase).toBe("BUY_OR_MANAGE");
    expect(state.doublesRolledThisTurn).toBe(0);
  });

  it("supports holding bail, holding cards, and forced payment after three failed rolls", () => {
    let state = startGame();
    state.players[0].inJail = true;
    state.players[0].position = 10;
    state.phase = "JAILED";

    state = act(state, { type: "PAY_BAIL", playerId: "p1" });
    expect(state.players[0].inJail).toBe(false);
    expect(state.players[0].money).toBe(1450);
    expect(state.phase).toBe("ROLL");

    state.players[0].inJail = true;
    state.players[0].getOutOfJailCards = 1;
    state.phase = "JAILED";
    state = act(state, { type: "USE_GET_OUT_OF_JAIL_CARD", playerId: "p1" });
    expect(state.players[0].inJail).toBe(false);
    expect(state.players[0].getOutOfJailCards).toBe(0);

    state.players[0].inJail = true;
    state.players[0].position = 10;
    state.players[0].jailTurns = 2;
    state.phase = "JAILED";
    state = act(state, { type: "ROLL_DICE", playerId: "p1", dice: [1, 2] });
    expect(state.players[0].inJail).toBe(false);
    expect(state.players[0].money).toBe(1400);
    expect(state.players[0].position).toBe(13);
  });

  it("allows only one failed holding doubles attempt per turn", () => {
    let state = startGame();
    state.players[0].inJail = true;
    state.players[0].position = 10;
    state.phase = "JAILED";

    state = act(state, { type: "ROLL_DICE", playerId: "p1", dice: [1, 2] });

    expect(state.players[0].inJail).toBe(true);
    expect(state.phase).toBe("BUY_OR_MANAGE");
    expect(() => reduceGame(state, { type: "ROLL_DICE", playerId: "p1", dice: [2, 3] })).toThrow(
      "Dice can only be rolled at the start of a turn.",
    );
  });

  it("applies chance and community chest card actions deterministically", () => {
    let state = startGame();

    state = act(state, { type: "ROLL_DICE", playerId: "p1", dice: [3, 4] });
    expect(state.players[0].position).toBe(39);
    expect(state.chanceDeckIndex).toBe(1);
    expect(state.phase).toBe("BUY_OR_MANAGE");

    state = act(state, { type: "END_TURN", playerId: "p1" });
    state.players[1].position = 39;
    state = act(state, { type: "ROLL_DICE", playerId: "p2", dice: [1, 2] });
    expect(state.players[1].position).toBe(0);
    expect(state.players[1].money).toBe(1900);
    expect(state.communityChestDeckIndex).toBe(1);
  });

  it("builds houses evenly, charges house rent, and sells buildings back to the bank", () => {
    let state = startGame();
    setOwner(state, "p1", "MEDITERRANEAN_AVENUE");
    setOwner(state, "p1", "BALTIC_AVENUE");

    state = act(state, { type: "BUY_HOUSE", playerId: "p1", tileId: "MEDITERRANEAN_AVENUE" });
    expect(() => reduceGame(state, { type: "BUY_HOUSE", playerId: "p1", tileId: "MEDITERRANEAN_AVENUE" })).toThrow(
      "Cannot build on this property.",
    );

    state = act(state, { type: "BUY_HOUSE", playerId: "p1", tileId: "BALTIC_AVENUE" });
    expect(state.properties.MEDITERRANEAN_AVENUE.houses).toBe(1);
    expect(state.properties.BALTIC_AVENUE.houses).toBe(1);
    expect(state.bank.houses).toBe(30);

    state = act(state, { type: "END_TURN", playerId: "p1" });
    state.players[1].position = 0;
    state = act(state, { type: "ROLL_DICE", playerId: "p2", dice: [1, 2] });
    expect(state.players[1].money).toBe(1480);
    expect(state.players[0].money).toBe(1420);

    state = act(state, { type: "END_TURN", playerId: "p2" });
    state = act(state, { type: "SELL_HOUSE", playerId: "p1", tileId: "BALTIC_AVENUE" });
    expect(state.properties.BALTIC_AVENUE.houses).toBe(0);
    expect(state.players[0].money).toBe(1445);
    expect(state.bank.houses).toBe(31);
  });

  it("sells undeveloped properties and releases assets on bankruptcy", () => {
    let state = startGame();
    setOwner(state, "p1", "BOARDWALK");

    state = act(state, { type: "SELL_PROPERTY", playerId: "p1", tileId: "BOARDWALK" });
    expect(state.properties.BOARDWALK.ownerId).toBeNull();
    expect(state.players[0].ownedPropertyIds).not.toContain("BOARDWALK");
    expect(state.players[0].money).toBe(1700);

    const boardwalk = ownable("BOARDWALK");
    setOwner(state, "p2", "BOARDWALK");
    state.properties.BOARDWALK.houses = 5;
    state.players[0].money = boardwalk.rent[5] - 1;
    state.players[0].position = 37;
    state.currentTurn = 0;
    state.phase = "ROLL";

    state = act(state, { type: "ROLL_DICE", playerId: "p1", dice: [1, 1] });
    expect(state.players[0].bankrupt).toBe(false);
    expect(state.players[0].money).toBe(-1);
    expect(() => reduceGame(state, { type: "END_TURN", playerId: "p1" })).toThrow("Resolve negative money before ending the turn.");

    state = act(state, { type: "DECLARE_BANKRUPTCY", playerId: "p1" });
    expect(state.players[0].bankrupt).toBe(true);
    expect(state.players[0].ownedPropertyIds).toEqual([]);
    expect(state.winnerId).toBe("p2");
    expect(state.phase).toBe("GAME_OVER");
  });

  it("mortgages and unmortgages undeveloped properties", () => {
    let state = startGame();
    setOwner(state, "p1", "BOARDWALK");

    state = act(state, { type: "MORTGAGE_PROPERTY", playerId: "p1", tileId: "BOARDWALK" });
    expect(state.properties.BOARDWALK.mortgaged).toBe(true);
    expect(state.players[0].money).toBe(1700);

    state = act(state, { type: "UNMORTGAGE_PROPERTY", playerId: "p1", tileId: "BOARDWALK" });
    expect(state.properties.BOARDWALK.mortgaged).toBe(false);
    expect(state.players[0].money).toBe(1480);
  });

  it("requires the target player to accept a trade before assets move", () => {
    let state = startGame();
    setOwner(state, "p1", "BALTIC_AVENUE");
    setOwner(state, "p2", "READING_RAILROAD");

    state = act(state, {
      type: "PROPOSE_TRADE",
      playerId: "p1",
      tradeId: "trade_1",
      targetPlayerId: "p2",
      offerMoney: 100,
      requestMoney: 25,
      offerPropertyIds: ["BALTIC_AVENUE"],
      requestPropertyIds: ["READING_RAILROAD"],
    });

    expect(state.pendingTrade?.id).toBe("trade_1");
    expect(state.properties.BALTIC_AVENUE.ownerId).toBe("p1");

    state = act(state, { type: "ACCEPT_TRADE", playerId: "p2", tradeId: "trade_1" });

    expect(state.pendingTrade).toBeNull();
    expect(state.players[0].money).toBe(1425);
    expect(state.players[1].money).toBe(1575);
    expect(state.properties.BALTIC_AVENUE.ownerId).toBe("p2");
    expect(state.properties.READING_RAILROAD.ownerId).toBe("p1");
    expect(state.players[0].ownedPropertyIds).toContain("READING_RAILROAD");
    expect(state.players[1].ownedPropertyIds).toContain("BALTIC_AVENUE");
  });

  it("lets a player sell assets after rent puts them below zero", () => {
    let state = startGame();
    setOwner(state, "p1", "BALTIC_AVENUE");
    setOwner(state, "p2", "BOARDWALK");
    state.properties.BOARDWALK.houses = 5;
    state.players[0].money = 10;
    state.players[0].position = 37;

    state = act(state, { type: "ROLL_DICE", playerId: "p1", dice: [1, 1] });

    expect(state.players[0].bankrupt).toBe(false);
    expect(state.players[0].money).toBeLessThan(0);

    state = act(state, { type: "SELL_PROPERTY", playerId: "p1", tileId: "BALTIC_AVENUE" });

    expect(state.properties.BALTIC_AVENUE.ownerId).toBeNull();
    expect(state.players[0].ownedPropertyIds).not.toContain("BALTIC_AVENUE");
    expect(state.players[0].money).toBeGreaterThan(10 - 2000);
  });

  it("updates rule settings through an engine action", () => {
    let state = startGame();

    state = act(state, {
      type: "UPDATE_SETTINGS",
      playerId: "p1",
      settings: { freeParkingJackpot: true, salary: 250, bailAmount: 75, maxJailTurns: 2 },
    });

    expect(state.settings).toMatchObject({ freeParkingJackpot: true, salary: 250, bailAmount: 75, maxJailTurns: 2 });
  });

  it("has expanded card decks", () => {
    expect(CHANCE_DECK).toHaveLength(16);
    expect(COMMUNITY_CHEST_DECK).toHaveLength(16);
  });
});
