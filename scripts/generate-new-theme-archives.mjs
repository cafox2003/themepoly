import { writeFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";

const archivesDir = "themes/archives";

const tileIds = [
  "GO",
  "MEDITERRANEAN_AVENUE",
  "COMMUNITY_CHEST_1",
  "BALTIC_AVENUE",
  "INCOME_TAX",
  "READING_RAILROAD",
  "ORIENTAL_AVENUE",
  "CHANCE_1",
  "VERMONT_AVENUE",
  "CONNECTICUT_AVENUE",
  "JAIL",
  "ST_CHARLES_PLACE",
  "ELECTRIC_COMPANY",
  "STATES_AVENUE",
  "VIRGINIA_AVENUE",
  "PENNSYLVANIA_RAILROAD",
  "ST_JAMES_PLACE",
  "COMMUNITY_CHEST_2",
  "TENNESSEE_AVENUE",
  "NEW_YORK_AVENUE",
  "FREE_PARKING",
  "KENTUCKY_AVENUE",
  "CHANCE_2",
  "INDIANA_AVENUE",
  "ILLINOIS_AVENUE",
  "B_AND_O_RAILROAD",
  "ATLANTIC_AVENUE",
  "VENTNOR_AVENUE",
  "WATER_WORKS",
  "MARVIN_GARDENS",
  "GO_TO_JAIL",
  "PACIFIC_AVENUE",
  "NORTH_CAROLINA_AVENUE",
  "COMMUNITY_CHEST_3",
  "PENNSYLVANIA_AVENUE",
  "SHORT_LINE",
  "CHANCE_3",
  "PARK_PLACE",
  "LUXURY_TAX",
  "BOARDWALK",
];

const propertyIds = [
  "MEDITERRANEAN_AVENUE",
  "BALTIC_AVENUE",
  "READING_RAILROAD",
  "ORIENTAL_AVENUE",
  "VERMONT_AVENUE",
  "CONNECTICUT_AVENUE",
  "ST_CHARLES_PLACE",
  "ELECTRIC_COMPANY",
  "STATES_AVENUE",
  "VIRGINIA_AVENUE",
  "PENNSYLVANIA_RAILROAD",
  "ST_JAMES_PLACE",
  "TENNESSEE_AVENUE",
  "NEW_YORK_AVENUE",
  "KENTUCKY_AVENUE",
  "INDIANA_AVENUE",
  "ILLINOIS_AVENUE",
  "B_AND_O_RAILROAD",
  "ATLANTIC_AVENUE",
  "VENTNOR_AVENUE",
  "WATER_WORKS",
  "MARVIN_GARDENS",
  "PACIFIC_AVENUE",
  "NORTH_CAROLINA_AVENUE",
  "PENNSYLVANIA_AVENUE",
  "SHORT_LINE",
  "PARK_PLACE",
  "BOARDWALK",
];

const boardIds = tileIds.filter((id) => !propertyIds.includes(id));

const chanceActions = [
  { type: "move_to", target: "BOARDWALK" },
  { type: "move_to", target: "GO", collectSalary: true },
  { type: "go_to_jail" },
  { type: "move_relative", spaces: -3 },
  { type: "collect_bank", amount: 50 },
  { type: "pay_bank", amount: 15 },
  { type: "pay_players", amount: 25 },
  { type: "get_out_of_jail_card" },
  { type: "move_to", target: "ST_CHARLES_PLACE" },
  { type: "move_to", target: "READING_RAILROAD" },
  { type: "move_to", target: "ATLANTIC_AVENUE" },
  { type: "pay_bank", amount: 40 },
  { type: "collect_bank", amount: 100 },
  { type: "pay_players", amount: 20 },
  { type: "collect_from_players", amount: 15 },
  { type: "move_relative", spaces: -2 },
];

const chestActions = [
  { type: "move_to", target: "GO", collectSalary: true },
  { type: "collect_bank", amount: 200 },
  { type: "pay_bank", amount: 50 },
  { type: "go_to_jail" },
  { type: "collect_bank", amount: 50 },
  { type: "collect_from_players", amount: 10 },
  { type: "pay_bank", amount: 50 },
  { type: "get_out_of_jail_card" },
  { type: "collect_bank", amount: 20 },
  { type: "pay_bank", amount: 100 },
  { type: "collect_bank", amount: 100 },
  { type: "pay_bank", amount: 25 },
  { type: "collect_bank", amount: 75 },
  { type: "pay_players", amount: 10 },
  { type: "collect_bank", amount: 45 },
  { type: "collect_bank", amount: 100 },
];

const cardDeck = (texts, actions) => texts.map((text, index) => ({ text, action: actions[index] }));

const xml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");

const pathSafe = (id) => id.replaceAll("/", "-").toLowerCase();

const iconSvg = (symbol, palette, color) => {
  const stroke = palette.stroke;
  const panel = palette.panel;
  if (symbol === "grass") return `<g stroke="${stroke}" stroke-width="5" stroke-linejoin="round"><path d="M39 66h82v56H39Z" fill="#8b5a2b"/><path d="M39 46h82v29H39Z" fill="${color}"/><path d="M39 75h82M66 46v76M94 46v76" fill="none" opacity=".45"/></g>`;
  if (symbol === "pickaxe") return `<g stroke="${stroke}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M45 51c26-24 61-23 82 0-31-5-52 5-68 25Z" fill="${color}"/><path d="M93 65 45 126" fill="none"/><path d="M83 77 69 64" fill="none"/></g>`;
  if (symbol === "ore") return `<g stroke="${stroke}" stroke-width="5" stroke-linejoin="round"><path d="M39 42h82v82H39Z" fill="#64748b"/><path d="M58 56h18v18H58ZM89 70h16v16H89ZM66 96h15v15H66Z" fill="${color}"/></g>`;
  if (symbol === "craft") return `<g stroke="${stroke}" stroke-width="5"><rect x="42" y="42" width="76" height="76" fill="#b7793b"/><path d="M42 67h76M42 93h76M67 42v76M93 42v76" fill="none"/></g>`;
  if (symbol === "portal") return `<g stroke="${stroke}" stroke-width="6" stroke-linejoin="round"><path d="M54 126V46c0-17 12-28 26-28s26 11 26 28v80Z" fill="#312e81"/><path d="M67 122V49c0-9 6-16 13-16s13 7 13 16v73Z" fill="${color}"/><path d="M68 64c10-8 16 8 25 0M68 88c10-8 16 8 25 0" fill="none" stroke="#e9d5ff" stroke-width="4"/></g>`;
  if (symbol === "creeper") return `<g stroke="${stroke}" stroke-width="5"><rect x="48" y="36" width="64" height="64" fill="${color}"/><rect x="61" y="55" width="13" height="13" fill="${stroke}"/><rect x="86" y="55" width="13" height="13" fill="${stroke}"/><path d="M73 80h14v13H73Z" fill="${stroke}"/><path d="M64 93h32v17H64Z" fill="${stroke}"/></g>`;
  if (symbol === "sword") return `<g stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M96 31 82 86 55 113 47 105l27-27Z" fill="${color}"/><path d="M57 94 40 111M48 86l26 26M35 121l9 9" fill="none"/></g>`;
  if (symbol === "chest") return `<g stroke="${stroke}" stroke-width="6" stroke-linejoin="round"><path d="M42 69h76v48H42Z" fill="${color}"/><path d="M50 54h60l8 15H42Z" fill="#d9a441"/><path d="M80 54v63M42 84h76" fill="none"/><rect x="72" y="79" width="16" height="18" rx="3" fill="${panel}"/></g>`;
  if (symbol === "gelatinous-cube") return `<g stroke="${stroke}" stroke-width="6" stroke-linejoin="round"><path d="M40 43h80v80H40Z" fill="${color}" opacity=".72"/><path d="M58 61h17M90 61h17M67 94c10 8 17 8 27 0" fill="none" stroke-linecap="round"/><path d="M61 103 52 118M99 103l9 15" fill="none" opacity=".5"/></g>`;
  if (symbol === "owlbear") return `<g stroke="${stroke}" stroke-width="6" stroke-linejoin="round"><path d="M46 66 56 35l24 19 24-19 10 31c10 9 15 20 15 33 0 28-22 42-49 42S31 127 31 99c0-13 5-24 15-33Z" fill="${color}"/><circle cx="62" cy="83" r="12" fill="${panel}"/><circle cx="98" cy="83" r="12" fill="${panel}"/><circle cx="62" cy="83" r="4" fill="${stroke}"/><circle cx="98" cy="83" r="4" fill="${stroke}"/><path d="M80 91v17M68 111h24" fill="none" stroke-linecap="round"/></g>`;
  if (symbol === "beholder") return `<g stroke="${stroke}" stroke-width="6" stroke-linecap="round"><circle cx="80" cy="86" r="38" fill="${color}"/><circle cx="80" cy="82" r="17" fill="${panel}"/><circle cx="80" cy="82" r="7" fill="${stroke}"/><path d="M55 53 42 30M75 47 72 22M101 54l16-23M111 77l27-9M48 78l-27-9" fill="none"/><circle cx="42" cy="30" r="7" fill="${panel}"/><circle cx="72" cy="22" r="7" fill="${panel}"/><circle cx="117" cy="31" r="7" fill="${panel}"/><path d="M60 114c15 10 27 10 40 0" fill="none"/></g>`;
  if (symbol === "manticore") return `<g stroke="${stroke}" stroke-width="6" stroke-linejoin="round"><path d="M38 96c11-29 50-41 79-15v38H49Z" fill="${color}"/><path d="M111 83 132 55l-8 40" fill="none" stroke-linecap="round"/><path d="M57 76 43 55l31 12M91 68l33-12-16 22" fill="${panel}"/><circle cx="73" cy="91" r="4" fill="${stroke}"/><circle cx="98" cy="91" r="4" fill="${stroke}"/><path d="M62 119v15M103 119v15" fill="none" stroke-linecap="round"/></g>`;
  if (symbol === "mimic") return `<g stroke="${stroke}" stroke-width="6" stroke-linejoin="round"><path d="M39 75h82v49H39Z" fill="#8b5a2b"/><path d="M47 54h66l8 21H39Z" fill="${color}"/><path d="M51 84c16 18 42 18 58 0" fill="${panel}"/><path d="M55 85 62 99l7-13 7 13 7-13 7 13 7-13" fill="${stroke}"/><circle cx="64" cy="68" r="5" fill="${stroke}"/><circle cx="96" cy="68" r="5" fill="${stroke}"/></g>`;
  if (symbol === "claw") return `<g stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M49 122c2-42 11-72 26-94 4 33-5 64-26 94Z" fill="${color}"/><path d="M82 124c3-39 11-67 26-87 4 30-4 59-26 87Z" fill="${color}"/><path d="M109 121c2-27 8-48 20-63 3 22-3 43-20 63Z" fill="${color}"/></g>`;
  if (symbol === "brain") return `<g stroke="${stroke}" stroke-width="6" stroke-linejoin="round"><path d="M48 73c-11-28 19-51 42-31 24-10 47 11 36 37 13 14 3 41-20 40-13 18-45 17-53-4-26-2-33-29-5-42Z" fill="${color}"/><path d="M70 47c-8 13 2 24 15 21M103 52c-12 4-14 17-6 25M60 85c16-4 24 7 19 21M96 88c-10 9-8 21 5 27" fill="none" stroke-width="4" stroke-linecap="round"/></g>`;
  if (symbol === "blue-head") return `<g stroke="${stroke}" stroke-width="6" stroke-linejoin="round"><path d="M52 72c0-29 16-51 36-51s36 22 36 51c0 36-17 55-36 55S52 108 52 72Z" fill="${color}"/><path d="M56 50c18 12 44 12 62 0" fill="none" stroke-linecap="round"/><circle cx="75" cy="80" r="5" fill="${stroke}"/><circle cx="101" cy="80" r="5" fill="${stroke}"/><path d="M78 101c10 6 18 6 28 0" fill="none" stroke-linecap="round"/></g>`;
  if (symbol === "ray") return `<g stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M43 110 92 61" fill="none"/><path d="M79 48 114 30l-18 35 34 8-36 13 13 35-31-25-24 26 8-39-36-8Z" fill="${color}"/></g>`;
  if (symbol === "robot") return `<g stroke="${stroke}" stroke-width="6" stroke-linejoin="round"><rect x="45" y="51" width="70" height="62" rx="12" fill="${color}"/><path d="M80 51V31M67 31h26M60 113v17M100 113v17" fill="none" stroke-linecap="round"/><circle cx="66" cy="78" r="6" fill="${panel}"/><circle cx="94" cy="78" r="6" fill="${panel}"/><path d="M65 99h30" fill="none" stroke-linecap="round"/></g>`;
  if (symbol === "city") return `<g stroke="${stroke}" stroke-width="6" stroke-linejoin="round"><path d="M36 123V67h26v56M62 123V45h34v78M96 123V76h28v47Z" fill="${color}"/><path d="M48 82h6M48 98h6M75 62h8M75 80h8M75 98h8M108 91h6M108 106h6" stroke-width="4"/></g>`;
  if (symbol === "cape") return `<g stroke="${stroke}" stroke-width="6" stroke-linejoin="round"><path d="M55 33h50l20 95c-24-17-45-17-69 0Z" fill="${color}"/><path d="M55 33c4 22 15 34 25 43 10-9 21-21 25-43" fill="${panel}"/></g>`;
  if (symbol === "camera") return `<g stroke="${stroke}" stroke-width="6" stroke-linejoin="round"><rect x="41" y="59" width="78" height="53" rx="10" fill="${color}"/><path d="M60 59 67 45h26l7 14" fill="${color}"/><circle cx="80" cy="86" r="17" fill="${panel}"/><circle cx="80" cy="86" r="7" fill="${stroke}"/></g>`;
  return `<circle cx="80" cy="80" r="44" fill="${color}" stroke="${stroke}" stroke-width="6"/>`;
};

const tileSvg = (symbol, palette, color, title) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <title>${xml(title)}</title>
  <rect width="160" height="160" rx="18" fill="${palette.bg}"/>
  <circle cx="80" cy="80" r="61" fill="${palette.panel}" stroke="${palette.stroke}" stroke-width="5"/>
  ${iconSvg(symbol, palette, color)}
</svg>`;

const tokenSvg = (symbol, palette, color, title) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <title>${xml(title)}</title>
  <rect width="128" height="128" rx="64" fill="${palette.bg}"/>
  <circle cx="64" cy="64" r="52" fill="${palette.panel}" stroke="${palette.stroke}" stroke-width="5"/>
  <g transform="translate(-16 -16)">
    ${iconSvg(symbol, palette, color)}
  </g>
</svg>`;

const boardSvg = (spec) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 900">
  <title>${xml(spec.name)} board center</title>
  <rect width="900" height="900" fill="${spec.palette.bg}"/>
  <path d="M70 690c160-90 285-94 430-17 125 67 218 53 330-28v185H70Z" fill="${spec.palette.colors[1]}33"/>
  <circle cx="450" cy="390" r="235" fill="${spec.palette.panel}" stroke="${spec.palette.stroke}" stroke-width="22"/>
  <g transform="translate(270 210) scale(2.25)">
    ${iconSvg(spec.heroSymbol, spec.palette, spec.palette.colors[0])}
  </g>
  <g opacity=".25">
    <circle cx="165" cy="165" r="48" fill="${spec.palette.colors[0]}"/>
    <circle cx="735" cy="180" r="34" fill="${spec.palette.colors[2]}"/>
    <circle cx="720" cy="710" r="56" fill="${spec.palette.colors[3]}"/>
    <circle cx="180" cy="725" r="32" fill="${spec.palette.colors[4]}"/>
  </g>
  <text x="450" y="755" text-anchor="middle" font-family="Arial, sans-serif" font-size="62" font-weight="800" fill="${spec.palette.stroke}">${xml(spec.name)}</text>
</svg>`;

const fantasyNames = {
  MEDITERRANEAN_AVENUE: "Gelatinous Cube Lair",
  BALTIC_AVENUE: "Ochre Jelly Pool",
  READING_RAILROAD: "Dungeon Mine Cart",
  ORIENTAL_AVENUE: "Owlbear Den",
  VERMONT_AVENUE: "Feathered Ruins",
  CONNECTICUT_AVENUE: "Moonlit Talon Grove",
  ST_CHARLES_PLACE: "Beholder Vault",
  ELECTRIC_COMPANY: "Arcane Lantern",
  STATES_AVENUE: "Eye Ray Gallery",
  VIRGINIA_AVENUE: "Floating Eye Keep",
  PENNSYLVANIA_RAILROAD: "Goblin Wagon Route",
  ST_JAMES_PLACE: "Manticore Cliffs",
  TENNESSEE_AVENUE: "Venom Tail Ridge",
  NEW_YORK_AVENUE: "Winged Predator Roost",
  KENTUCKY_AVENUE: "Mimic Market",
  INDIANA_AVENUE: "Treasure Teeth Alley",
  ILLINOIS_AVENUE: "False Chest Hall",
  B_AND_O_RAILROAD: "Cavern Ferry",
  ATLANTIC_AVENUE: "Hydra Marsh",
  VENTNOR_AVENUE: "Basilisk Crossing",
  WATER_WORKS: "Potion Spring",
  MARVIN_GARDENS: "Chimera Garden",
  PACIFIC_AVENUE: "Dragonbone Gate",
  NORTH_CAROLINA_AVENUE: "Kraken Shrine",
  PENNSYLVANIA_AVENUE: "Lich Tower",
  SHORT_LINE: "Portal Caravan",
  PARK_PLACE: "Ancient Red Dragon",
  BOARDWALK: "Tarrasque Throne",
};

const specs = [
  {
    id: "minecraft",
    name: "Minecraft",
    palette: {
      bg: "#d8f5d0",
      panel: "#fff8dc",
      stroke: "#263320",
      colors: ["#58a941", "#8b5a2b", "#38bdf8", "#a78bfa", "#f59e0b", "#64748b", "#ef4444"],
    },
    heroSymbol: "grass",
    board: {
      GO: ["Spawn Point", "grass"],
      COMMUNITY_CHEST_1: ["Loot Chest", "chest"],
      INCOME_TAX: ["Tool Repair", "pickaxe"],
      CHANCE_1: ["Redstone Signal", "ore"],
      JAIL: ["Bedrock Cell / Visiting", "portal"],
      COMMUNITY_CHEST_2: ["Loot Chest", "chest"],
      FREE_PARKING: ["Village Rest", "craft"],
      CHANCE_2: ["Redstone Signal", "ore"],
      GO_TO_JAIL: ["Fall Into Lava", "portal"],
      COMMUNITY_CHEST_3: ["Loot Chest", "chest"],
      CHANCE_3: ["Redstone Signal", "ore"],
      LUXURY_TAX: ["Diamond Pick Tax", "pickaxe"],
    },
    properties: {
      MEDITERRANEAN_AVENUE: ["Dirt Hut", "grass"],
      BALTIC_AVENUE: ["Oak Plank Shack", "craft"],
      READING_RAILROAD: ["Minecart Rail", "ore"],
      ORIENTAL_AVENUE: ["Coal Cave", "ore"],
      VERMONT_AVENUE: ["Iron Vein", "ore"],
      CONNECTICUT_AVENUE: ["Copper Cavern", "ore"],
      ST_CHARLES_PLACE: ["Wheat Farm", "grass"],
      ELECTRIC_COMPANY: ["Redstone Torch", "ore"],
      STATES_AVENUE: ["Beehive Meadow", "grass"],
      VIRGINIA_AVENUE: ["Horse Stable", "grass"],
      PENNSYLVANIA_RAILROAD: ["Nether Tunnel", "portal"],
      ST_JAMES_PLACE: ["Creeper Ridge", "creeper"],
      TENNESSEE_AVENUE: ["Skeleton Spawner", "sword"],
      NEW_YORK_AVENUE: ["Zombie Village", "sword"],
      KENTUCKY_AVENUE: ["Lapis Grotto", "ore"],
      INDIANA_AVENUE: ["Emerald Market", "ore"],
      ILLINOIS_AVENUE: ["Enchanting Room", "craft"],
      B_AND_O_RAILROAD: ["Ocean Boat Route", "chest"],
      ATLANTIC_AVENUE: ["Prismarine Reef", "ore"],
      VENTNOR_AVENUE: ["Coral Monument", "grass"],
      WATER_WORKS: ["Water Bucket Works", "ore"],
      MARVIN_GARDENS: ["Axolotl Cave", "grass"],
      PACIFIC_AVENUE: ["End Portal Room", "portal"],
      NORTH_CAROLINA_AVENUE: ["Shulker City", "chest"],
      PENNSYLVANIA_AVENUE: ["Dragon Island", "sword"],
      SHORT_LINE: ["Elytra Launch", "portal"],
      PARK_PLACE: ["Ancient City", "craft"],
      BOARDWALK: ["Diamond Beacon", "ore"],
    },
    tokens: [
      ["steve-pick", "Pickaxe", "#8b5a2b", "pickaxe"],
      ["diamond-block", "Diamond Block", "#38bdf8", "ore"],
      ["creeper-face", "Creeper", "#58a941", "creeper"],
      ["crafting-table", "Crafting Table", "#a16207", "craft"],
      ["nether-portal", "Nether Portal", "#8b5cf6", "portal"],
      ["iron-sword", "Iron Sword", "#94a3b8", "sword"],
    ],
    chanceTexts: [
      "Take the minecart to Diamond Beacon.",
      "Respawn at Spawn Point. Collect $200.",
      "You dug straight down. Go to Bedrock Cell.",
      "Backtrack three blocks.",
      "Found emeralds. Collect $50.",
      "Repair your tools. Pay $15.",
      "Share torches with every player. Pay each $25.",
      "Keep an escape pearl.",
      "Advance to Wheat Farm.",
      "Ride the rail to Minecart Rail.",
      "Sail to Prismarine Reef.",
      "Pay a server upkeep fee of $40.",
      "Village trade pays $100.",
      "Patch everyone’s creeper holes. Pay each $20.",
      "Collect $15 from every player for the realm fund.",
      "Ender pearl misfire. Move back 2 spaces.",
    ],
    chestTexts: [
      "Return to Spawn Point. Collect $200.",
      "Bonus chest jackpot. Collect $200.",
      "Buy replacement armor. Pay $50.",
      "Mob swarm. Go to Bedrock Cell.",
      "Sell extra wheat. Collect $50.",
      "Server party. Collect $10 from every player.",
      "Enchanting cost. Pay $50.",
      "Keep an escape pearl.",
      "Smelted ore payout. Collect $20.",
      "Anvil repair. Pay $100.",
      "Ancient loot cache. Collect $100.",
      "Villager fee. Pay $25.",
      "Community build grant. Collect $75.",
      "Gift everyone food. Pay each player $10.",
      "Redstone rebate. Collect $45.",
      "Beacon bonus matures. Collect $100.",
    ],
    colors: {
      APP_BACKGROUND: "#d8f5d0",
      BOARD_BACKGROUND: "#9ccc65",
      BOARD_CENTER: "#bde7a8",
      TILE_BACKGROUND: "#fff8dc",
      PANEL_BACKGROUND: "#fffdf3",
      TEXT: "#263320",
      MUTED_TEXT: "#5b6b4a",
      ACCENT: "#2f7d32",
      ACCENT_CONTRAST: "#ffffff",
      HIGHLIGHT: "#f5c84b",
      BROWN: "#8b5a2b",
      LIGHT_BLUE: "#5ec4ef",
      PINK: "#d46ca8",
      ORANGE: "#f28c28",
      RED: "#d64545",
      YELLOW: "#f5c84b",
      GREEN: "#3fa34d",
      DARK_BLUE: "#355c9c",
    },
  },
  {
    id: "fantasy-monsters",
    name: "Fantasy Monsters",
    palette: {
      bg: "#efe5d0",
      panel: "#fff7e8",
      stroke: "#33251f",
      colors: ["#73c7a3", "#9b6b44", "#a855f7", "#d97706", "#c2410c", "#0ea5e9", "#7c3aed"],
    },
    heroSymbol: "beholder",
    board: {
      GO: ["Tavern Gate", "chest"],
      COMMUNITY_CHEST_1: ["Rumor Scroll", "chest"],
      INCOME_TAX: ["Guild Dues", "claw"],
      CHANCE_1: ["Wandering Monster", "beholder"],
      JAIL: ["Cursed Cell / Visiting", "mimic"],
      COMMUNITY_CHEST_2: ["Rumor Scroll", "chest"],
      FREE_PARKING: ["Campfire Rest", "claw"],
      CHANCE_2: ["Wandering Monster", "manticore"],
      GO_TO_JAIL: ["Caught in a Trap", "mimic"],
      COMMUNITY_CHEST_3: ["Rumor Scroll", "chest"],
      CHANCE_3: ["Wandering Monster", "owlbear"],
      LUXURY_TAX: ["Dragon Hoard Tax", "claw"],
    },
    properties: Object.fromEntries(Object.entries(fantasyNames).map(([id, name], index) => {
      const symbols = ["gelatinous-cube", "gelatinous-cube", "chest", "owlbear", "owlbear", "owlbear", "beholder", "beholder", "beholder", "beholder", "chest", "manticore", "manticore", "manticore", "mimic", "mimic", "mimic", "chest", "claw", "claw", "gelatinous-cube", "claw", "claw", "claw", "beholder", "chest", "claw", "claw"];
      return [id, [name, symbols[index]]];
    })),
    tokens: [
      ["gelatinous-cube", "Gelatinous Cube", "#73c7a3", "gelatinous-cube"],
      ["owlbear", "Owlbear", "#9b6b44", "owlbear"],
      ["beholder", "Beholder", "#a855f7", "beholder"],
      ["manticore", "Manticore", "#d97706", "manticore"],
      ["mimic", "Mimic", "#8b5a2b", "mimic"],
      ["claw", "Dragon Claw", "#c2410c", "claw"],
    ],
    chanceTexts: [
      "A legendary roar sends you to Tarrasque Throne.",
      "Return to Tavern Gate. Collect $200.",
      "The mimic bites. Go to Cursed Cell.",
      "Retreat 3 rooms.",
      "The patron tips you $50.",
      "Pay $15 for antivenom.",
      "Buy everyone torches. Pay each $25.",
      "Keep a warding charm.",
      "Advance to Beholder Vault.",
      "Take the Dungeon Mine Cart.",
      "Advance to Hydra Marsh.",
      "Pay a $40 adventuring license.",
      "Monster bounty pays $100.",
      "Repair everyone’s armor. Pay each $20.",
      "Collect $15 from every player for the quest fund.",
      "A trapdoor drops you back 2 spaces.",
    ],
    chestTexts: [
      "Return to Tavern Gate. Collect $200.",
      "Treasure chest windfall. Collect $200.",
      "Healer’s fee. Pay $50.",
      "Captured by cultists. Go to Cursed Cell.",
      "Sell monster parts. Collect $50.",
      "Tavern birthday. Collect $10 from every player.",
      "Pay scribe fees of $50.",
      "Keep a warding charm.",
      "Potion refund. Collect $20.",
      "Armor insurance due. Pay $100.",
      "Ancient inheritance. Collect $100.",
      "Hireling fee. Pay $25.",
      "Village reward. Collect $75.",
      "Donate to the temple. Pay each player $10.",
      "Magic spring rebate. Collect $45.",
      "Royal bounty matures. Collect $100.",
    ],
    colors: {
      APP_BACKGROUND: "#efe5d0",
      BOARD_BACKGROUND: "#c8b58a",
      BOARD_CENTER: "#d7c39a",
      TILE_BACKGROUND: "#fff7e8",
      PANEL_BACKGROUND: "#fffaf0",
      TEXT: "#33251f",
      MUTED_TEXT: "#6b5b50",
      ACCENT: "#7c2d12",
      ACCENT_CONTRAST: "#ffffff",
      HIGHLIGHT: "#e5b75a",
      BROWN: "#7a4f2b",
      LIGHT_BLUE: "#75c7d8",
      PINK: "#b76ba3",
      ORANGE: "#d97706",
      RED: "#a83232",
      YELLOW: "#e5b75a",
      GREEN: "#4f8f55",
      DARK_BLUE: "#4a5f99",
    },
  },
  {
    id: "megamind",
    name: "Megamind",
    palette: {
      bg: "#dbeafe",
      panel: "#f8fbff",
      stroke: "#111827",
      colors: ["#2563eb", "#22d3ee", "#7c3aed", "#ef4444", "#facc15", "#94a3b8", "#111827"],
    },
    heroSymbol: "blue-head",
    board: {
      GO: ["Metro City Entrance", "city"],
      COMMUNITY_CHEST_1: ["Minion Memo", "robot"],
      INCOME_TAX: ["Evil Lair Bill", "brain"],
      CHANCE_1: ["Presentation!", "camera"],
      JAIL: ["Dehydration Cell / Visiting", "ray"],
      COMMUNITY_CHEST_2: ["Minion Memo", "robot"],
      FREE_PARKING: ["Invisible Car Spot", "cape"],
      CHANCE_2: ["Presentation!", "camera"],
      GO_TO_JAIL: ["Dehydrated", "ray"],
      COMMUNITY_CHEST_3: ["Minion Memo", "robot"],
      CHANCE_3: ["Presentation!", "camera"],
      LUXURY_TAX: ["Black Cape Cleaning", "cape"],
    },
    properties: {
      MEDITERRANEAN_AVENUE: ["Blue Room", "blue-head"],
      BALTIC_AVENUE: ["Baby Pod Alley", "city"],
      READING_RAILROAD: ["Invisible Car Route", "cape"],
      ORIENTAL_AVENUE: ["Minion’s Lab", "robot"],
      VERMONT_AVENUE: ["Gadget Bench", "ray"],
      CONNECTICUT_AVENUE: ["Brainbot Bay", "brain"],
      ST_CHARLES_PLACE: ["Metro Tower Lobby", "city"],
      ELECTRIC_COMPANY: ["Fusion Core", "ray"],
      STATES_AVENUE: ["Mayor’s Balcony", "city"],
      VIRGINIA_AVENUE: ["Roxanne’s Studio", "camera"],
      PENNSYLVANIA_RAILROAD: ["Doom Tram", "robot"],
      ST_JAMES_PLACE: ["Evil Lair Atrium", "cape"],
      TENNESSEE_AVENUE: ["Fake Hero Museum", "cape"],
      NEW_YORK_AVENUE: ["Training Warehouse", "ray"],
      KENTUCKY_AVENUE: ["Brainbot Hangar", "brain"],
      INDIANA_AVENUE: ["Copper Dome Lab", "robot"],
      ILLINOIS_AVENUE: ["Metro Man Museum", "cape"],
      B_AND_O_RAILROAD: ["News Van Route", "camera"],
      ATLANTIC_AVENUE: ["Observatory Deck", "city"],
      VENTNOR_AVENUE: ["Laser Array", "ray"],
      WATER_WORKS: ["Hydration Tank", "robot"],
      MARVIN_GARDENS: ["Disguise Closet", "cape"],
      PACIFIC_AVENUE: ["Mega Lair Command", "blue-head"],
      NORTH_CAROLINA_AVENUE: ["Doom Button Room", "ray"],
      PENNSYLVANIA_AVENUE: ["Brainbot Factory", "brain"],
      SHORT_LINE: ["Escape Pod Track", "robot"],
      PARK_PLACE: ["Metro City Skyline", "city"],
      BOARDWALK: ["Presentation Stage", "blue-head"],
    },
    tokens: [
      ["blue-genius", "Blue Genius", "#2563eb", "blue-head"],
      ["minion-bot", "Minion Bot", "#94a3b8", "robot"],
      ["dehydration-ray", "Dehydration Ray", "#22d3ee", "ray"],
      ["brainbot", "Brainbot", "#7c3aed", "brain"],
      ["black-cape", "Black Cape", "#111827", "cape"],
      ["news-camera", "News Camera", "#ef4444", "camera"],
    ],
    chanceTexts: [
      "A flawless presentation sends you to Presentation Stage.",
      "Return to Metro City Entrance. Collect $200.",
      "The dehydration ray backfires. Go to the cell.",
      "Monologue too long. Move back 3 spaces.",
      "Merch royalties arrive. Collect $50.",
      "Pay $15 for dramatic smoke.",
      "Give every player a gift basket. Pay each $25.",
      "Keep an escape remote.",
      "Advance to Metro Tower Lobby.",
      "Take the Invisible Car Route.",
      "Advance to Observatory Deck.",
      "Pay a $40 city permit.",
      "Brainbot delivery pays $100.",
      "Repair everyone’s gadgets. Pay each $20.",
      "Collect $15 from every player for your presentation budget.",
      "Wrong cape entrance. Move back 2 spaces.",
    ],
    chestTexts: [
      "Return to Metro City Entrance. Collect $200.",
      "Villain plan succeeds. Collect $200.",
      "Lab cleanup. Pay $50.",
      "Captured on camera. Go to the cell.",
      "Sell spare gadgets. Collect $50.",
      "Birthday broadcast. Collect $10 from every player.",
      "Pay science fair fees of $50.",
      "Keep an escape remote.",
      "Dry-cleaning refund. Collect $20.",
      "Insurance premium due. Pay $100.",
      "Inheritance from evil school. Collect $100.",
      "Consultation fee. Pay $25.",
      "City appreciation grant. Collect $75.",
      "Donate to public repairs. Pay each player $10.",
      "Power rebate. Collect $45.",
      "Royalty check matures. Collect $100.",
    ],
    colors: {
      APP_BACKGROUND: "#dbeafe",
      BOARD_BACKGROUND: "#b7cff5",
      BOARD_CENTER: "#c7d2fe",
      TILE_BACKGROUND: "#f8fbff",
      PANEL_BACKGROUND: "#ffffff",
      TEXT: "#111827",
      MUTED_TEXT: "#4b5563",
      ACCENT: "#2563eb",
      ACCENT_CONTRAST: "#ffffff",
      HIGHLIGHT: "#facc15",
      BROWN: "#7c4a2d",
      LIGHT_BLUE: "#67e8f9",
      PINK: "#c084fc",
      ORANGE: "#f97316",
      RED: "#ef4444",
      YELLOW: "#facc15",
      GREEN: "#22c55e",
      DARK_BLUE: "#1d4ed8",
    },
  },
];

const buildTheme = (spec) => {
  const board = Object.fromEntries(boardIds.map((id) => [id, { label: spec.board[id][0], image: `assets/spaces/${id}.svg` }]));
  const properties = Object.fromEntries(propertyIds.map((id) => [id, { name: spec.properties[id][0], image: `assets/spaces/${id}.svg` }]));
  return {
    version: "1.0",
    id: spec.id,
    name: spec.name,
    images: { boardBackground: "assets/board/background.svg" },
    board,
    properties,
    cards: {
      chance: cardDeck(spec.chanceTexts, chanceActions),
      communityChest: cardDeck(spec.chestTexts, chestActions),
    },
    tokens: spec.tokens.map(([id, label, color]) => ({ id, label, color, image: `assets/tokens/${id}.svg` })),
    colors: spec.colors,
  };
};

const generateArchive = async (spec) => {
  const zip = new JSZip();
  const theme = buildTheme(spec);
  zip.file(theme.images.boardBackground, boardSvg(spec).trim());

  let index = 0;
  for (const id of boardIds) {
    const [label, symbol] = spec.board[id];
    zip.file(`assets/spaces/${id}.svg`, tileSvg(symbol, spec.palette, spec.palette.colors[index % spec.palette.colors.length], label).trim());
    index += 1;
  }
  for (const id of propertyIds) {
    const [label, symbol] = spec.properties[id];
    zip.file(`assets/spaces/${id}.svg`, tileSvg(symbol, spec.palette, spec.palette.colors[index % spec.palette.colors.length], label).trim());
    index += 1;
  }
  for (const [tokenIndex, [id, label, color, symbol]] of spec.tokens.entries()) {
    zip.file(`assets/tokens/${id}.svg`, tokenSvg(symbol, spec.palette, color ?? spec.palette.colors[tokenIndex % spec.palette.colors.length], label).trim());
  }

  zip.file("theme.json", JSON.stringify(theme, null, 2));
  const outputPath = path.join(archivesDir, `${spec.id}.zip`);
  await writeFile(outputPath, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  console.log(outputPath);
};

for (const spec of specs) {
  await generateArchive(spec);
}
