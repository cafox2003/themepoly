import { BOARD, isOwnable, tileAt, tileById } from "./board";
import { CHANCE_DECK, COMMUNITY_CHEST_DECK } from "./cards";
import { createInitialGameState, createPlayer } from "./state";
import type {
  BoardTile,
  CardAction,
  CardDefinition,
  EngineResult,
  GameAction,
  GameState,
  OwnableTile,
  Player,
  PropertyGroup,
  TileId,
} from "./types";

const cloneState = (state: GameState): GameState => structuredClone(state);

const log = (state: GameState, message: string, events: string[]) => {
  const id = state.log.length ? state.log[0].id + 1 : 1;
  state.log.unshift({ id, message });
  state.log = state.log.slice(0, 80);
  events.push(message);
};

const currentPlayer = (state: GameState): Player => state.players[state.currentTurn];

const assertPlayerTurn = (state: GameState, playerId: string) => {
  const player = currentPlayer(state);
  if (!player || player.id !== playerId) throw new Error("It is not this player's turn.");
  if (player.bankrupt) throw new Error("Bankrupt players cannot act.");
  return player;
};

const changeMoney = (state: GameState, player: Player, amount: number) => {
  player.money += amount;
};

const payBank = (state: GameState, player: Player, amount: number) => {
  changeMoney(state, player, -amount);
  if (state.settings.freeParkingJackpot) state.bank.freeParkingPot += amount;
};

const transferMoney = (state: GameState, from: Player, to: Player, amount: number) => {
  changeMoney(state, from, -amount);
  changeMoney(state, to, amount);
};

const releaseProperties = (state: GameState, playerId: string) => {
  for (const property of Object.values(state.properties)) {
    if (property.ownerId === playerId) {
      property.ownerId = null;
      property.houses = 0;
      property.mortgaged = false;
    }
  }
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (player) player.ownedPropertyIds = [];
};

const transferProperties = (state: GameState, from: Player, to: Player) => {
  for (const tileId of [...from.ownedPropertyIds]) {
    const property = state.properties[tileId];
    property.ownerId = to.id;
    property.houses = 0;
    if (!to.ownedPropertyIds.includes(tileId)) to.ownedPropertyIds.push(tileId as TileId);
  }
  from.ownedPropertyIds = [];
};

const bankruptToBank = (state: GameState, player: Player) => {
  player.bankrupt = true;
  releaseProperties(state, player.id);
};

const bankruptToPlayer = (state: GameState, player: Player, creditor: Player) => {
  player.bankrupt = true;
  transferProperties(state, player, creditor);
};

const activePlayers = (state: GameState) => state.players.filter((player) => !player.bankrupt);

const updateWinner = (state: GameState) => {
  const active = activePlayers(state);
  if (active.length === 1 && state.players.length > 1) {
    state.phase = "GAME_OVER";
    state.winnerId = active[0].id;
    return;
  }
  if (active.length > 1 && state.players[state.currentTurn]?.bankrupt) {
    let nextTurn = state.currentTurn;
    do {
      nextTurn = (nextTurn + 1) % state.players.length;
    } while (state.players[nextTurn].bankrupt);
    state.currentTurn = nextTurn;
    state.doublesRolledThisTurn = 0;
    state.phase = state.players[nextTurn].inJail ? "JAILED" : "ROLL";
  }
};

const endTurn = (state: GameState) => {
  if (state.phase === "GAME_OVER") return;
  const player = currentPlayer(state);
  if (player.money < 0) throw new Error("Resolve negative money before ending the turn.");
  const rolledDoubles = state.dice[0] !== 0 && state.dice[0] === state.dice[1];
  if (!player.inJail && rolledDoubles && state.doublesRolledThisTurn > 0) {
    state.phase = "ROLL";
    return;
  }
  const active = activePlayers(state);
  if (active.length === 0) return;
  let nextTurn = state.currentTurn;
  do {
    nextTurn = (nextTurn + 1) % state.players.length;
  } while (state.players[nextTurn].bankrupt);
  state.currentTurn = nextTurn;
  state.doublesRolledThisTurn = 0;
  state.phase = state.players[nextTurn].inJail ? "JAILED" : "ROLL";
};

const movePlayer = (state: GameState, player: Player, spaces: number) => {
  const next = player.position + spaces;
  if (spaces > 0 && next >= BOARD.length) {
    changeMoney(state, player, state.settings.salary);
  }
  player.position = ((next % BOARD.length) + BOARD.length) % BOARD.length;
};

const movePlayerTo = (state: GameState, player: Player, tileId: TileId, collectSalary: boolean) => {
  const target = tileById(tileId);
  if (collectSalary && target.index <= player.position && tileId !== "GO") {
    changeMoney(state, player, state.settings.salary);
  }
  if (collectSalary && tileId === "GO") {
    changeMoney(state, player, state.settings.salary);
  }
  player.position = target.index;
};

const sendToJail = (state: GameState, player: Player) => {
  player.position = tileById("JAIL").index;
  player.inJail = true;
  player.jailTurns = 0;
  state.doublesRolledThisTurn = 0;
  state.phase = "JAILED";
};

const getGroupTiles = (state: GameState, group: PropertyGroup) =>
  state.board.filter((tile): tile is OwnableTile => isOwnable(tile) && tile.group === group);

const ownsFullGroup = (state: GameState, playerId: string, group: PropertyGroup) =>
  getGroupTiles(state, group).every((tile) => state.properties[tile.id].ownerId === playerId);

const ownedGroupCount = (state: GameState, playerId: string, group: PropertyGroup) =>
  getGroupTiles(state, group).filter((tile) => state.properties[tile.id].ownerId === playerId).length;

const calculateRent = (state: GameState, tile: OwnableTile): number => {
  const property = state.properties[tile.id];
  if (property.mortgaged) return 0;
  if (tile.kind === "railroad") {
    const count = ownedGroupCount(state, property.ownerId ?? "", "RAILROAD");
    return tile.rent[Math.max(0, count - 1)];
  }
  if (tile.kind === "utility") {
    const count = ownedGroupCount(state, property.ownerId ?? "", "UTILITY");
    const multiplier = count >= 2 ? 10 : 4;
    return (state.dice[0] + state.dice[1]) * multiplier;
  }
  if (property.houses > 0) return tile.rent[property.houses];
  return ownsFullGroup(state, property.ownerId ?? "", tile.group) ? tile.rent[0] * 2 : tile.rent[0];
};

const drawCard = (state: GameState, kind: "chance" | "community_chest"): CardDefinition => {
  if (kind === "chance") {
    const card = CHANCE_DECK[state.chanceDeckIndex % CHANCE_DECK.length];
    state.chanceDeckIndex += 1;
    return card;
  }
  const card = COMMUNITY_CHEST_DECK[state.communityChestDeckIndex % COMMUNITY_CHEST_DECK.length];
  state.communityChestDeckIndex += 1;
  return card;
};

const applyCardAction = (state: GameState, player: Player, action: CardAction, events: string[]) => {
  if (action.type === "move_to") {
    movePlayerTo(state, player, action.target, Boolean(action.collectSalary));
    resolveLanding(state, player, events);
    return;
  }
  if (action.type === "move_relative") {
    movePlayer(state, player, action.spaces);
    resolveLanding(state, player, events);
    return;
  }
  if (action.type === "pay_bank") {
    payBank(state, player, action.amount);
    return;
  }
  if (action.type === "collect_bank") {
    changeMoney(state, player, action.amount);
    return;
  }
  if (action.type === "pay_players") {
    for (const recipient of state.players) {
      if (recipient.id !== player.id && !recipient.bankrupt) transferMoney(state, player, recipient, action.amount);
    }
    return;
  }
  if (action.type === "collect_from_players") {
    for (const payer of state.players) {
      if (payer.id !== player.id && !payer.bankrupt) transferMoney(state, payer, player, action.amount);
    }
    return;
  }
  if (action.type === "go_to_jail") {
    sendToJail(state, player);
    return;
  }
  if (action.type === "get_out_of_jail_card") {
    player.getOutOfJailCards += 1;
  }
};

const resolveLanding = (state: GameState, player: Player, events: string[]) => {
  const tile = tileAt(player.position);
  if (tile.kind === "go") {
    state.phase = "BUY_OR_MANAGE";
    return;
  }
  if (tile.kind === "tax") {
    payBank(state, player, tile.amount);
    log(state, `${player.name} paid $${tile.amount} for ${tile.label}.`, events);
  }
  if (tile.kind === "free_parking" && state.settings.freeParkingJackpot && state.bank.freeParkingPot > 0) {
    const jackpot = state.bank.freeParkingPot;
    state.bank.freeParkingPot = 0;
    changeMoney(state, player, jackpot);
    log(state, `${player.name} collected $${jackpot} from Rest Stop.`, events);
  }
  if (tile.kind === "go_to_jail") {
    log(state, `${player.name} went to holding.`, events);
    sendToJail(state, player);
    return;
  }
  if (tile.kind === "chance" || tile.kind === "community_chest") {
    const card = drawCard(state, tile.kind);
    log(state, `${player.name} drew: ${card.text}`, events);
    applyCardAction(state, player, card.action, events);
  }
  if (isOwnable(tile)) {
    resolveOwnableLanding(state, player, tile, events);
  }
  if (!player.inJail && state.phase !== "GAME_OVER") state.phase = "BUY_OR_MANAGE";
  updateWinner(state);
};

const resolveOwnableLanding = (state: GameState, player: Player, tile: OwnableTile, events: string[]) => {
  const property = state.properties[tile.id];
  if (!property.ownerId) return;
  if (property.ownerId === player.id) return;
  const owner = state.players.find((candidate) => candidate.id === property.ownerId);
  if (!owner || owner.bankrupt) return;
  const rent = calculateRent(state, tile);
  transferMoney(state, player, owner, rent);
  log(state, `${player.name} paid $${rent} rent to ${owner.name}.`, events);
};

const currentTile = (state: GameState, player: Player): BoardTile => tileAt(player.position);

const canBuildOn = (state: GameState, player: Player, tile: OwnableTile) => {
  if (tile.kind !== "property" || !tile.houseCost) return false;
  if (!ownsFullGroup(state, player.id, tile.group)) return false;
  const group = getGroupTiles(state, tile.group);
  if (group.some((groupTile) => state.properties[groupTile.id].mortgaged)) return false;
  const property = state.properties[tile.id];
  const minHouses = Math.min(...group.map((groupTile) => state.properties[groupTile.id].houses));
  return property.houses === minHouses && property.houses < 5;
};

const canSellHouseFrom = (state: GameState, player: Player, tile: OwnableTile) => {
  if (tile.kind !== "property" || state.properties[tile.id].ownerId !== player.id) return false;
  const property = state.properties[tile.id];
  if (property.houses <= 0) return false;
  const group = getGroupTiles(state, tile.group);
  const maxHouses = Math.max(...group.map((groupTile) => state.properties[groupTile.id].houses));
  return property.houses === maxHouses;
};

const canTransferProperty = (state: GameState, player: Player, tileId: TileId) => {
  const tile = tileById(tileId);
  if (!isOwnable(tile)) return false;
  const property = state.properties[tile.id];
  return property.ownerId === player.id && property.houses === 0;
};

const sanitizeMoney = (amount: number) => {
  if (!Number.isFinite(amount)) throw new Error("Trade money must be a finite amount.");
  return Math.max(0, Math.floor(amount));
};

export const reduceGame = (inputState: GameState, action: GameAction): EngineResult => {
  const state = cloneState(inputState);
  const events: string[] = [];

  if (action.type === "START_GAME") {
    const next = createInitialGameState();
    next.players = action.players.slice(0, 6).map((player, index) =>
      createPlayer(index, player.name, player.tokenId, next.settings.startingMoney),
    );
    next.phase = "ROLL";
    next.log = [{ id: 1, message: `${next.players.length} players started a new game.` }];
    return { state: next, events: next.log.map((entry) => entry.message) };
  }

  const player = assertPlayerTurn(state, action.playerId);

  if (action.type === "ROLL_AGAIN") {
    const willRollAgain = !player.inJail && state.dice[0] !== 0 && state.dice[0] === state.dice[1] && state.doublesRolledThisTurn > 0;
    if (!willRollAgain) throw new Error("Player can only roll again after doubles.");
    log(state, `${player.name} rolls again after doubles.`, events);
    endTurn(state);
    if (state.currentTurn !== inputState.currentTurn || state.phase !== "ROLL") return { state, events };
    const result = reduceGame(state, { type: "ROLL_DICE", playerId: player.id, dice: action.dice });
    return { state: result.state, events: [...events, ...result.events] };
  }

  if (action.type === "ROLL_DICE") {
    if (state.phase !== "ROLL" && state.phase !== "JAILED") throw new Error("Dice can only be rolled at the start of a turn.");
    state.dice = action.dice;
    const [dieA, dieB] = action.dice;
    const isDoubles = dieA === dieB;

    if (player.inJail) {
      if (isDoubles) {
        player.inJail = false;
        player.jailTurns = 0;
        movePlayer(state, player, dieA + dieB);
        log(state, `${player.name} rolled doubles and left holding.`, events);
        resolveLanding(state, player, events);
      } else {
        player.jailTurns += 1;
        if (player.jailTurns >= state.settings.maxJailTurns) {
          payBank(state, player, state.settings.bailAmount);
          player.inJail = false;
          player.jailTurns = 0;
          movePlayer(state, player, dieA + dieB);
          log(state, `${player.name} paid $${state.settings.bailAmount} after three holding turns.`, events);
          resolveLanding(state, player, events);
        } else {
          state.phase = "BUY_OR_MANAGE";
          log(state, `${player.name} did not roll doubles in holding.`, events);
        }
      }
      updateWinner(state);
      return { state, events };
    }

    state.doublesRolledThisTurn = isDoubles ? state.doublesRolledThisTurn + 1 : 0;
    if (state.doublesRolledThisTurn >= 3) {
      sendToJail(state, player);
      log(state, `${player.name} rolled three doubles and went to holding.`, events);
      return { state, events };
    }

    movePlayer(state, player, dieA + dieB);
    log(state, `${player.name} rolled ${dieA + dieB} and landed on ${tileAt(player.position).label}.`, events);
    resolveLanding(state, player, events);
    return { state, events };
  }

  if (action.type === "BUY_PROPERTY") {
    if (state.phase !== "BUY_OR_MANAGE") throw new Error("Property can only be bought after landing on it.");
    const tile = currentTile(state, player);
    if (!isOwnable(tile)) throw new Error("This tile cannot be bought.");
    const property = state.properties[tile.id];
    if (property.ownerId) throw new Error("This property is already owned.");
    if (player.money < tile.price) throw new Error("Player cannot afford this property.");
    property.ownerId = player.id;
    player.ownedPropertyIds.push(tile.id);
    changeMoney(state, player, -tile.price);
    log(state, `${player.name} bought ${tile.label} for $${tile.price}.`, events);
  }

  if (action.type === "PAY_BAIL") {
    if (!player.inJail) throw new Error("Player is not in holding.");
    payBank(state, player, state.settings.bailAmount);
    player.inJail = false;
    player.jailTurns = 0;
    state.phase = "ROLL";
    log(state, `${player.name} paid $${state.settings.bailAmount} bail.`, events);
  }

  if (action.type === "USE_GET_OUT_OF_JAIL_CARD") {
    if (!player.inJail || player.getOutOfJailCards <= 0) throw new Error("No holding card is available.");
    player.getOutOfJailCards -= 1;
    player.inJail = false;
    player.jailTurns = 0;
    state.phase = "ROLL";
    log(state, `${player.name} used a Get Out of Holding card.`, events);
  }

  if (action.type === "BUY_HOUSE") {
    const tile = tileById(action.tileId);
    if (!isOwnable(tile) || !canBuildOn(state, player, tile)) throw new Error("Cannot build on this property.");
    if (!tile.houseCost || player.money < tile.houseCost) throw new Error("Player cannot afford this building.");
    const property = state.properties[tile.id];
    if (property.houses === 4 && state.bank.hotels <= 0) throw new Error("No hotels are available from the bank.");
    if (property.houses < 4 && state.bank.houses <= 0) throw new Error("No houses are available from the bank.");
    property.houses += 1;
    changeMoney(state, player, -tile.houseCost);
    if (property.houses === 5) {
      state.bank.hotels -= 1;
      state.bank.houses += 4;
      log(state, `${player.name} built a hotel on ${tile.label}.`, events);
    } else {
      state.bank.houses -= 1;
      log(state, `${player.name} built a house on ${tile.label}.`, events);
    }
  }

  if (action.type === "SELL_HOUSE") {
    const tile = tileById(action.tileId);
    if (!isOwnable(tile) || !canSellHouseFrom(state, player, tile) || !tile.houseCost) {
      throw new Error("Cannot sell a building from this property.");
    }
    const property = state.properties[tile.id];
    property.houses -= 1;
    changeMoney(state, player, Math.floor(tile.houseCost / 2));
    if (property.houses === 4) {
      state.bank.hotels += 1;
      state.bank.houses -= 4;
      log(state, `${player.name} sold a hotel from ${tile.label}.`, events);
    } else {
      state.bank.houses += 1;
      log(state, `${player.name} sold a house from ${tile.label}.`, events);
    }
  }

  if (action.type === "SELL_PROPERTY") {
    const tile = tileById(action.tileId);
    if (!isOwnable(tile)) throw new Error("Unknown property.");
    const property = state.properties[tile.id];
    if (property.ownerId !== player.id || property.houses > 0 || property.mortgaged) throw new Error("Cannot sell this property.");
    property.ownerId = null;
    player.ownedPropertyIds = player.ownedPropertyIds.filter((id) => id !== tile.id);
    changeMoney(state, player, Math.floor(tile.price / 2));
    log(state, `${player.name} sold ${tile.label} back to the bank.`, events);
  }

  if (action.type === "MORTGAGE_PROPERTY") {
    const tile = tileById(action.tileId);
    if (!isOwnable(tile)) throw new Error("Unknown property.");
    const property = state.properties[tile.id];
    if (property.ownerId !== player.id || property.houses > 0 || property.mortgaged) throw new Error("Cannot mortgage this property.");
    property.mortgaged = true;
    changeMoney(state, player, tile.mortgageValue);
    log(state, `${player.name} mortgaged ${tile.label} for $${tile.mortgageValue}.`, events);
  }

  if (action.type === "UNMORTGAGE_PROPERTY") {
    const tile = tileById(action.tileId);
    if (!isOwnable(tile)) throw new Error("Unknown property.");
    const property = state.properties[tile.id];
    const cost = tile.mortgageValue + Math.ceil(tile.mortgageValue * 0.1);
    if (property.ownerId !== player.id || !property.mortgaged) throw new Error("Cannot unmortgage this property.");
    if (player.money < cost) throw new Error("Player cannot afford to unmortgage this property.");
    property.mortgaged = false;
    changeMoney(state, player, -cost);
    log(state, `${player.name} unmortgaged ${tile.label} for $${cost}.`, events);
  }

  if (action.type === "TRADE") {
    const target = state.players.find((candidate) => candidate.id === action.targetPlayerId);
    if (!target || target.bankrupt || target.id === player.id) throw new Error("Trade target is not available.");
    const offerMoney = sanitizeMoney(action.offerMoney);
    const requestMoney = sanitizeMoney(action.requestMoney);
    const offerPropertyIds = [...new Set(action.offerPropertyIds)];
    const requestPropertyIds = [...new Set(action.requestPropertyIds)];
    if (player.money < offerMoney || target.money < requestMoney) throw new Error("A player cannot afford this trade.");
    if (!offerPropertyIds.every((tileId) => canTransferProperty(state, player, tileId))) throw new Error("Offered properties cannot be traded.");
    if (!requestPropertyIds.every((tileId) => canTransferProperty(state, target, tileId))) throw new Error("Requested properties cannot be traded.");

    changeMoney(state, player, -offerMoney);
    changeMoney(state, target, offerMoney);
    changeMoney(state, target, -requestMoney);
    changeMoney(state, player, requestMoney);

    for (const tileId of offerPropertyIds) {
      state.properties[tileId].ownerId = target.id;
      player.ownedPropertyIds = player.ownedPropertyIds.filter((id) => id !== tileId);
      if (!target.ownedPropertyIds.includes(tileId)) target.ownedPropertyIds.push(tileId);
    }
    for (const tileId of requestPropertyIds) {
      state.properties[tileId].ownerId = player.id;
      target.ownedPropertyIds = target.ownedPropertyIds.filter((id) => id !== tileId);
      if (!player.ownedPropertyIds.includes(tileId)) player.ownedPropertyIds.push(tileId);
    }
    log(state, `${player.name} completed a trade with ${target.name}.`, events);
  }

  if (action.type === "DECLARE_BANKRUPTCY") {
    bankruptToBank(state, player);
    log(state, `${player.name} declared bankruptcy and returned their assets to the bank.`, events);
  }

  if (action.type === "UPDATE_SETTINGS") {
    state.settings = {
      ...state.settings,
      ...action.settings,
      startingMoney: Math.max(1, Math.floor(action.settings.startingMoney ?? state.settings.startingMoney)),
      salary: Math.max(0, Math.floor(action.settings.salary ?? state.settings.salary)),
      maxJailTurns: Math.max(1, Math.floor(action.settings.maxJailTurns ?? state.settings.maxJailTurns)),
      bailAmount: Math.max(0, Math.floor(action.settings.bailAmount ?? state.settings.bailAmount)),
      freeParkingJackpot: action.settings.freeParkingJackpot ?? state.settings.freeParkingJackpot,
    };
    log(state, `${player.name} updated game settings.`, events);
  }

  if (action.type === "END_TURN") {
    const willRollAgain = !player.inJail && state.dice[0] !== 0 && state.dice[0] === state.dice[1] && state.doublesRolledThisTurn > 0;
    log(state, willRollAgain ? `${player.name} rolls again after doubles.` : `${player.name} ended their turn.`, events);
    endTurn(state);
  }

  updateWinner(state);
  return { state, events };
};

export const getBuildableProperties = (state: GameState, player: Player) =>
  player.ownedPropertyIds
    .map((tileId) => tileById(tileId))
    .filter((tile): tile is OwnableTile => isOwnable(tile) && canBuildOn(state, player, tile));

export const getSellableBuildings = (state: GameState, player: Player) =>
  player.ownedPropertyIds
    .map((tileId) => tileById(tileId))
    .filter((tile): tile is OwnableTile => isOwnable(tile) && canSellHouseFrom(state, player, tile));

export const getMortgageableProperties = (state: GameState, player: Player) =>
  player.ownedPropertyIds
    .map((tileId) => tileById(tileId))
    .filter((tile): tile is OwnableTile => isOwnable(tile) && state.properties[tile.id].ownerId === player.id && state.properties[tile.id].houses === 0 && !state.properties[tile.id].mortgaged);

export const getUnmortgageableProperties = (state: GameState, player: Player) =>
  player.ownedPropertyIds
    .map((tileId) => tileById(tileId))
    .filter((tile): tile is OwnableTile => isOwnable(tile) && state.properties[tile.id].ownerId === player.id && state.properties[tile.id].mortgaged);
