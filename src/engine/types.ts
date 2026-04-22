export type GamePhase = "ROLL" | "BUY_OR_MANAGE" | "JAILED" | "GAME_OVER";

export type TileKind =
  | "go"
  | "property"
  | "railroad"
  | "utility"
  | "tax"
  | "chance"
  | "community_chest"
  | "jail"
  | "go_to_jail"
  | "free_parking";

export type PropertyGroup =
  | "BROWN"
  | "LIGHT_BLUE"
  | "PINK"
  | "ORANGE"
  | "RED"
  | "YELLOW"
  | "GREEN"
  | "DARK_BLUE"
  | "RAILROAD"
  | "UTILITY";

export type TileId =
  | "GO"
  | "MEDITERRANEAN_AVENUE"
  | "COMMUNITY_CHEST_1"
  | "BALTIC_AVENUE"
  | "INCOME_TAX"
  | "READING_RAILROAD"
  | "ORIENTAL_AVENUE"
  | "CHANCE_1"
  | "VERMONT_AVENUE"
  | "CONNECTICUT_AVENUE"
  | "JAIL"
  | "ST_CHARLES_PLACE"
  | "ELECTRIC_COMPANY"
  | "STATES_AVENUE"
  | "VIRGINIA_AVENUE"
  | "PENNSYLVANIA_RAILROAD"
  | "ST_JAMES_PLACE"
  | "COMMUNITY_CHEST_2"
  | "TENNESSEE_AVENUE"
  | "NEW_YORK_AVENUE"
  | "FREE_PARKING"
  | "KENTUCKY_AVENUE"
  | "CHANCE_2"
  | "INDIANA_AVENUE"
  | "ILLINOIS_AVENUE"
  | "B_AND_O_RAILROAD"
  | "ATLANTIC_AVENUE"
  | "VENTNOR_AVENUE"
  | "WATER_WORKS"
  | "MARVIN_GARDENS"
  | "GO_TO_JAIL"
  | "PACIFIC_AVENUE"
  | "NORTH_CAROLINA_AVENUE"
  | "COMMUNITY_CHEST_3"
  | "PENNSYLVANIA_AVENUE"
  | "SHORT_LINE"
  | "CHANCE_3"
  | "PARK_PLACE"
  | "LUXURY_TAX"
  | "BOARDWALK";

interface TileBase {
  id: TileId;
  index: number;
  label: string;
}

export interface BaseTile extends TileBase {
  kind: Exclude<TileKind, "property" | "railroad" | "utility" | "tax">;
}

export interface OwnableTile extends TileBase {
  kind: "property" | "railroad" | "utility";
  group: PropertyGroup;
  price: number;
  mortgageValue: number;
  rent: number[];
  houseCost?: number;
}

export interface TaxTile extends TileBase {
  kind: "tax";
  amount: number;
}

export type BoardTile = BaseTile | OwnableTile | TaxTile;

export interface Player {
  id: string;
  name: string;
  tokenId: string;
  position: number;
  money: number;
  ownedPropertyIds: TileId[];
  inJail: boolean;
  jailTurns: number;
  getOutOfJailCards: number;
  bankrupt: boolean;
}

export interface PropertyState {
  ownerId: string | null;
  houses: number;
  mortgaged: boolean;
}

export interface BankState {
  freeParkingPot: number;
  houses: number;
  hotels: number;
}

export interface GameSettings {
  startingMoney: number;
  salary: number;
  freeParkingJackpot: boolean;
  maxJailTurns: number;
  bailAmount: number;
}

export interface GameLogEntry {
  id: number;
  message: string;
}

export interface PendingTrade {
  id: string;
  proposerId: string;
  targetPlayerId: string;
  offerMoney: number;
  requestMoney: number;
  offerPropertyIds: TileId[];
  requestPropertyIds: TileId[];
}

export interface GameState {
  version: "1.0";
  players: Player[];
  board: BoardTile[];
  properties: Record<string, PropertyState>;
  currentTurn: number;
  phase: GamePhase;
  dice: [number, number];
  doublesRolledThisTurn: number;
  bank: BankState;
  settings: GameSettings;
  themeId: string;
  chanceDeckIndex: number;
  communityChestDeckIndex: number;
  winnerId: string | null;
  pendingTrade: PendingTrade | null;
  log: GameLogEntry[];
}

export type CardAction =
  | { type: "move_to"; target: TileId; collectSalary?: boolean }
  | { type: "move_relative"; spaces: number }
  | { type: "pay_bank"; amount: number }
  | { type: "collect_bank"; amount: number }
  | { type: "pay_players"; amount: number }
  | { type: "collect_from_players"; amount: number }
  | { type: "go_to_jail" }
  | { type: "get_out_of_jail_card" };

export interface CardDefinition {
  id: string;
  text: string;
  action: CardAction;
}

export type GameAction =
  | { type: "START_GAME"; players: Array<{ name: string; tokenId: string }> }
  | { type: "ROLL_DICE"; playerId: string; dice: [number, number] }
  | { type: "ROLL_AGAIN"; playerId: string; dice: [number, number] }
  | { type: "BUY_PROPERTY"; playerId: string }
  | { type: "END_TURN"; playerId: string }
  | { type: "PAY_BAIL"; playerId: string }
  | { type: "USE_GET_OUT_OF_JAIL_CARD"; playerId: string }
  | { type: "BUY_HOUSE"; playerId: string; tileId: TileId }
  | { type: "SELL_HOUSE"; playerId: string; tileId: TileId }
  | { type: "SELL_PROPERTY"; playerId: string; tileId: TileId }
  | { type: "MORTGAGE_PROPERTY"; playerId: string; tileId: TileId }
  | { type: "UNMORTGAGE_PROPERTY"; playerId: string; tileId: TileId }
  | {
      type: "PROPOSE_TRADE";
      playerId: string;
      tradeId: string;
      targetPlayerId: string;
      offerMoney: number;
      requestMoney: number;
      offerPropertyIds: TileId[];
      requestPropertyIds: TileId[];
    }
  | { type: "ACCEPT_TRADE"; playerId: string; tradeId: string }
  | { type: "CANCEL_TRADE"; playerId: string; tradeId: string }
  | { type: "DECLARE_BANKRUPTCY"; playerId: string }
  | { type: "UPDATE_SETTINGS"; playerId: string; settings: Partial<GameSettings> };

export interface EngineResult {
  state: GameState;
  events: string[];
}
