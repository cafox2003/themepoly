import type { BoardTile, OwnableTile, TileId } from "./types";

const property = (
  index: number,
  id: TileId,
  label: string,
  group: OwnableTile["group"],
  price: number,
  rent: number[],
  houseCost?: number,
): OwnableTile => ({
  id,
  index,
  kind: group === "RAILROAD" ? "railroad" : group === "UTILITY" ? "utility" : "property",
  label,
  group,
  price,
  mortgageValue: Math.floor(price / 2),
  rent,
  houseCost,
});

export const BOARD: BoardTile[] = [
  { id: "GO", index: 0, kind: "go", label: "GO" },
  property(1, "MEDITERRANEAN_AVENUE", "Mediterranean Avenue", "BROWN", 60, [2, 10, 30, 90, 160, 250], 50),
  { id: "COMMUNITY_CHEST_1", index: 2, kind: "community_chest", label: "Community Chest" },
  property(3, "BALTIC_AVENUE", "Baltic Avenue", "BROWN", 60, [4, 20, 60, 180, 320, 450], 50),
  { id: "INCOME_TAX", index: 4, kind: "tax", label: "Income Tax", amount: 200 },
  property(5, "READING_RAILROAD", "Reading Railroad", "RAILROAD", 200, [25, 50, 100, 200]),
  property(6, "ORIENTAL_AVENUE", "Oriental Avenue", "LIGHT_BLUE", 100, [6, 30, 90, 270, 400, 550], 50),
  { id: "CHANCE_1", index: 7, kind: "chance", label: "Chance" },
  property(8, "VERMONT_AVENUE", "Vermont Avenue", "LIGHT_BLUE", 100, [6, 30, 90, 270, 400, 550], 50),
  property(9, "CONNECTICUT_AVENUE", "Connecticut Avenue", "LIGHT_BLUE", 120, [8, 40, 100, 300, 450, 600], 50),
  { id: "JAIL", index: 10, kind: "jail", label: "Jail / Just Visiting" },
  property(11, "ST_CHARLES_PLACE", "St. Charles Place", "PINK", 140, [10, 50, 150, 450, 625, 750], 100),
  property(12, "ELECTRIC_COMPANY", "Electric Company", "UTILITY", 150, [4, 10]),
  property(13, "STATES_AVENUE", "States Avenue", "PINK", 140, [10, 50, 150, 450, 625, 750], 100),
  property(14, "VIRGINIA_AVENUE", "Virginia Avenue", "PINK", 160, [12, 60, 180, 500, 700, 900], 100),
  property(15, "PENNSYLVANIA_RAILROAD", "Pennsylvania Railroad", "RAILROAD", 200, [25, 50, 100, 200]),
  property(16, "ST_JAMES_PLACE", "St. James Place", "ORANGE", 180, [14, 70, 200, 550, 750, 950], 100),
  { id: "COMMUNITY_CHEST_2", index: 17, kind: "community_chest", label: "Community Chest" },
  property(18, "TENNESSEE_AVENUE", "Tennessee Avenue", "ORANGE", 180, [14, 70, 200, 550, 750, 950], 100),
  property(19, "NEW_YORK_AVENUE", "New York Avenue", "ORANGE", 200, [16, 80, 220, 600, 800, 1000], 100),
  { id: "FREE_PARKING", index: 20, kind: "free_parking", label: "Free Parking" },
  property(21, "KENTUCKY_AVENUE", "Kentucky Avenue", "RED", 220, [18, 90, 250, 700, 875, 1050], 150),
  { id: "CHANCE_2", index: 22, kind: "chance", label: "Chance" },
  property(23, "INDIANA_AVENUE", "Indiana Avenue", "RED", 220, [18, 90, 250, 700, 875, 1050], 150),
  property(24, "ILLINOIS_AVENUE", "Illinois Avenue", "RED", 240, [20, 100, 300, 750, 925, 1100], 150),
  property(25, "B_AND_O_RAILROAD", "B. & O. Railroad", "RAILROAD", 200, [25, 50, 100, 200]),
  property(26, "ATLANTIC_AVENUE", "Atlantic Avenue", "YELLOW", 260, [22, 110, 330, 800, 975, 1150], 150),
  property(27, "VENTNOR_AVENUE", "Ventnor Avenue", "YELLOW", 260, [22, 110, 330, 800, 975, 1150], 150),
  property(28, "WATER_WORKS", "Water Works", "UTILITY", 150, [4, 10]),
  property(29, "MARVIN_GARDENS", "Marvin Gardens", "YELLOW", 280, [24, 120, 360, 850, 1025, 1200], 150),
  { id: "GO_TO_JAIL", index: 30, kind: "go_to_jail", label: "Go To Jail" },
  property(31, "PACIFIC_AVENUE", "Pacific Avenue", "GREEN", 300, [26, 130, 390, 900, 1100, 1275], 200),
  property(32, "NORTH_CAROLINA_AVENUE", "North Carolina Avenue", "GREEN", 300, [26, 130, 390, 900, 1100, 1275], 200),
  { id: "COMMUNITY_CHEST_3", index: 33, kind: "community_chest", label: "Community Chest" },
  property(34, "PENNSYLVANIA_AVENUE", "Pennsylvania Avenue", "GREEN", 320, [28, 150, 450, 1000, 1200, 1400], 200),
  property(35, "SHORT_LINE", "Short Line", "RAILROAD", 200, [25, 50, 100, 200]),
  { id: "CHANCE_3", index: 36, kind: "chance", label: "Chance" },
  property(37, "PARK_PLACE", "Park Place", "DARK_BLUE", 350, [35, 175, 500, 1100, 1300, 1500], 200),
  { id: "LUXURY_TAX", index: 38, kind: "tax", label: "Luxury Tax", amount: 100 },
  property(39, "BOARDWALK", "Boardwalk", "DARK_BLUE", 400, [50, 200, 600, 1400, 1700, 2000], 200),
];

export const ownableTiles = BOARD.filter((tile): tile is OwnableTile =>
  tile.kind === "property" || tile.kind === "railroad" || tile.kind === "utility",
);

export const tileById = (tileId: TileId): BoardTile => {
  const tile = BOARD.find((candidate) => candidate.id === tileId);
  if (!tile) throw new Error(`Unknown tile ${tileId}`);
  return tile;
};

export const tileAt = (position: number): BoardTile => BOARD[position % BOARD.length];

export const isOwnable = (tile: BoardTile): tile is OwnableTile =>
  tile.kind === "property" || tile.kind === "railroad" || tile.kind === "utility";
