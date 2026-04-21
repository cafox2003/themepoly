import { writeFile } from "node:fs/promises";
import JSZip from "jszip";

const zip = new JSZip();
const asset = (path, content) => {
  zip.file(path, content.trim());
  return path;
};

const catFaceSvg = (fill, accent, accessory) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="64" fill="${accent}"/>
  <path d="M31 46 39 21 58 39h12l19-18 8 25c9 8 14 19 14 31 0 27-21 43-47 43S17 104 17 77c0-12 5-23 14-31Z" fill="${fill}" stroke="#4d403b" stroke-width="5" stroke-linejoin="round"/>
  <path d="M48 40c10 4 22 4 32 0" fill="none" stroke="#7a6b65" stroke-width="5" stroke-linecap="round"/>
  <circle cx="47" cy="70" r="5" fill="#3f3532"/><circle cx="81" cy="70" r="5" fill="#3f3532"/>
  <path d="M60 80h8m-4-4v8" stroke="#3f3532" stroke-width="4" stroke-linecap="round"/>
  <path d="M34 78h15M32 88h18M79 78h15M78 88h18" stroke="#7a6b65" stroke-width="3" stroke-linecap="round"/>
  ${accessory === "cookie" ? `<circle cx="91" cy="31" r="15" fill="#d99b61" stroke="#4d403b" stroke-width="4"/><circle cx="86" cy="27" r="2.5" fill="#6d4531"/><circle cx="95" cy="32" r="2.5" fill="#6d4531"/><circle cx="88" cy="37" r="2.5" fill="#6d4531"/>` : ""}
  ${accessory === "donut" ? `<circle cx="91" cy="31" r="16" fill="#c9855b" stroke="#4d403b" stroke-width="4"/><circle cx="91" cy="31" r="7" fill="${accent}" stroke="#4d403b" stroke-width="3"/><path d="M79 27c7-8 17-7 24 0" stroke="#f59abd" stroke-width="7" stroke-linecap="round"/>` : ""}
  ${accessory === "yarn" ? `<circle cx="91" cy="31" r="15" fill="#9ac7d9" stroke="#4d403b" stroke-width="4"/><path d="M79 32c8-7 17-9 25-5M82 40c4-8 12-15 21-17" stroke="#5f9db6" stroke-width="4" stroke-linecap="round"/>` : ""}
  ${accessory === "cup" ? `<path d="M78 21h25l-4 24H82Z" fill="#ffffff" stroke="#4d403b" stroke-width="4"/><path d="M103 27h8c0 9-3 13-11 13" fill="none" stroke="#4d403b" stroke-width="4"/><path d="M84 29h13" stroke="#f59abd" stroke-width="5" stroke-linecap="round"/>` : ""}
  ${accessory === "star" ? `<path d="m91 15 5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1Z" fill="#ffd36a" stroke="#4d403b" stroke-width="4" stroke-linejoin="round"/>` : ""}
  ${accessory === "bow" ? `<path d="M78 24c-13-9-22 4-10 13 7-2 12-5 15-9Zm10 4c3 4 8 7 15 9 12-9 3-22-10-13Z" fill="#f59abd" stroke="#4d403b" stroke-width="4" stroke-linejoin="round"/><circle cx="85" cy="30" r="7" fill="#f7bfd1" stroke="#4d403b" stroke-width="4"/>` : ""}
</svg>`;

const tileSvg = (fill, icon) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="20" fill="${fill}"/>
  <circle cx="80" cy="80" r="56" fill="#fff8f2" stroke="#6a5850" stroke-width="5"/>
  ${icon === "cat" ? `<path d="M50 65 58 43 74 58h12l16-15 8 22c8 7 12 16 12 26 0 24-19 38-42 38S38 115 38 91c0-10 4-19 12-26Z" fill="#b9ada6" stroke="#6a5850" stroke-width="5" stroke-linejoin="round"/><circle cx="66" cy="88" r="4" fill="#3f3532"/><circle cx="94" cy="88" r="4" fill="#3f3532"/><path d="M76 97h8m-4-4v8M56 97h15M89 97h15" stroke="#3f3532" stroke-width="3" stroke-linecap="round"/>` : ""}
  ${icon === "cookie" ? `<circle cx="80" cy="82" r="39" fill="#d99b61" stroke="#6a5850" stroke-width="6"/><circle cx="63" cy="72" r="5" fill="#6d4531"/><circle cx="88" cy="64" r="5" fill="#6d4531"/><circle cx="98" cy="92" r="5" fill="#6d4531"/><circle cx="72" cy="103" r="5" fill="#6d4531"/>` : ""}
  ${icon === "donut" ? `<circle cx="80" cy="82" r="40" fill="#c9855b" stroke="#6a5850" stroke-width="6"/><circle cx="80" cy="82" r="16" fill="#fff8f2" stroke="#6a5850" stroke-width="5"/><path d="M48 78c16-18 47-20 67 0" stroke="#f59abd" stroke-width="14" stroke-linecap="round"/>` : ""}
  ${icon === "cup" ? `<path d="M55 49h50l-8 62H63Z" fill="#ffffff" stroke="#6a5850" stroke-width="6" stroke-linejoin="round"/><path d="M106 63h17c0 19-8 29-24 29" fill="none" stroke="#6a5850" stroke-width="6"/><path d="M65 66h31" stroke="#f59abd" stroke-width="9" stroke-linecap="round"/>` : ""}
  ${icon === "yarn" ? `<circle cx="80" cy="82" r="38" fill="#9ac7d9" stroke="#6a5850" stroke-width="6"/><path d="M49 83c21-19 43-25 66-13M57 108c10-24 27-42 50-54M55 65c29 13 50 30 63 51" stroke="#5f9db6" stroke-width="6" stroke-linecap="round"/>` : ""}
  ${icon === "star" ? `<path d="m80 39 12 27 29 3-22 20 7 29-26-15-26 15 7-29-22-20 29-3Z" fill="#ffd36a" stroke="#6a5850" stroke-width="6" stroke-linejoin="round"/>` : ""}
  ${icon === "house" ? `<path d="M43 83 80 48l37 35v36H54V83Z" fill="#d8eac8" stroke="#6a5850" stroke-width="6" stroke-linejoin="round"/><path d="M72 119V95h17v24" fill="#f59abd" stroke="#6a5850" stroke-width="5"/>` : ""}
  ${icon === "train" ? `<rect x="50" y="49" width="60" height="59" rx="10" fill="#cfd8dc" stroke="#6a5850" stroke-width="6"/><path d="M61 108 51 123M99 108l10 15M61 123h38" stroke="#6a5850" stroke-width="6" stroke-linecap="round"/><circle cx="67" cy="92" r="5" fill="#6a5850"/><circle cx="93" cy="92" r="5" fill="#6a5850"/><path d="M62 61h36v17H62Z" fill="#ffffff" stroke="#6a5850" stroke-width="5"/>` : ""}
  ${icon === "tax" ? `<path d="M52 51h56v68H52Z" fill="#ffffff" stroke="#6a5850" stroke-width="6"/><path d="M65 69h30M65 84h22M65 99h30" stroke="#6a5850" stroke-width="5" stroke-linecap="round"/>` : ""}
  ${icon === "jail" ? `<path d="M48 48h64v67H48Z" fill="#d7d2cf" stroke="#6a5850" stroke-width="6"/><path d="M62 51v61M80 51v61M98 51v61" stroke="#6a5850" stroke-width="6"/><circle cx="80" cy="35" r="13" fill="#b9ada6" stroke="#6a5850" stroke-width="5"/>` : ""}
</svg>`;

const boardArt = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 900">
  <rect width="900" height="900" fill="#f6e8de"/>
  <path d="M90 690c150-90 290-95 430-16 113 64 202 61 290-10v146H90Z" fill="#e9d4cb"/>
  <path d="M263 305 314 154 423 260h74l109-106 51 151c52 47 81 110 81 179 0 159-126 252-288 252S162 643 162 484c0-69 29-132 101-179Z" fill="#b9ada6" stroke="#5f4d46" stroke-width="28" stroke-linejoin="round"/>
  <path d="M357 267c63 31 124 31 186 0" fill="none" stroke="#7a6b65" stroke-width="22" stroke-linecap="round"/>
  <circle cx="348" cy="463" r="25" fill="#3f3532"/><circle cx="552" cy="463" r="25" fill="#3f3532"/>
  <path d="M424 525h52m-26-24v49M276 516h87M265 580h103M537 516h87M532 580h103" stroke="#3f3532" stroke-width="18" stroke-linecap="round"/>
  <circle cx="668" cy="246" r="74" fill="#d99b61" stroke="#5f4d46" stroke-width="22"/>
  <circle cx="642" cy="223" r="14" fill="#6d4531"/><circle cx="693" cy="248" r="14" fill="#6d4531"/><circle cx="654" cy="279" r="14" fill="#6d4531"/>
</svg>`;

const tileAsset = (id, fill, icon) => asset(`assets/spaces/${id}.svg`, tileSvg(fill, icon));
const tokenAsset = (id, fill, accent, accessory) => asset(`assets/tokens/${id}.svg`, catFaceSvg(fill, accent, accessory));

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

const chanceTexts = [
  "Follow the cookie trail to Cupcake Castle.",
  "Nap-walk to GO. Collect $200.",
  "Too many snack crumbs. Go directly to the blanket fort.",
  "Scoot back 3 spaces for a better sunbeam.",
  "Sticker royalties arrive. Collect $50.",
  "Pay $15 for emergency sprinkles.",
  "Share snack packs with every player. Pay each $25.",
  "Keep a blanket-fort pass.",
  "Advance to Biscuit Boutique.",
  "Ride the treat cart to Cookie Express.",
  "Advance to Bubble Tea Pier.",
  "Pay a $40 cute booth permit.",
  "Cafe shift tips pay $100.",
  "Help everyone redecorate. Pay each $20.",
  "Collect $15 from each player for the snack fund.",
  "Roll backward 2 spaces into a cozier spot.",
];

const chestTexts = [
  "Waddle to GO. Collect $200.",
  "Your plush preorder sells out. Collect $200.",
  "Vet checkup. Pay $50.",
  "Crumbs on the counter. Go directly to the blanket fort.",
  "Bake sale bonus. Collect $50.",
  "Birthday snacks. Collect $10 from every player.",
  "Craft class fee. Pay $50.",
  "Keep a blanket-fort pass.",
  "Refund on extra frosting. Collect $20.",
  "Treat insurance premium due. Pay $100.",
  "Grandma sends a care package. Collect $100.",
  "Cat cafe consultation. Pay $25.",
  "Community bake grant. Collect $75.",
  "Donate to the kitten fund. Pay each player $10.",
  "Utility rebate for cozy lamps. Collect $45.",
  "Holiday snack jar matures. Collect $100.",
];

const cards = (texts, actions) => texts.map((text, index) => ({ text, action: actions[index] }));

const theme = {
  version: "1.0",
  id: "pusheen-cafe",
  name: "Pusheen Cafe",
  images: {
    boardBackground: asset("assets/board/background.svg", boardArt),
  },
  board: {
    GO: { label: "Snack Run", image: tileAsset("GO", "#f9dbe7", "cat") },
    COMMUNITY_CHEST_1: { label: "Treat Jar", image: tileAsset("COMMUNITY_CHEST_1", "#fef4c9", "cookie") },
    INCOME_TAX: { label: "Treat Tax", image: tileAsset("INCOME_TAX", "#ffd9d2", "tax") },
    CHANCE_1: { label: "Cookie Card", image: tileAsset("CHANCE_1", "#fde4a8", "star") },
    JAIL: { label: "Blanket Fort / Visiting", image: tileAsset("JAIL", "#d7eef1", "jail") },
    COMMUNITY_CHEST_2: { label: "Treat Jar", image: tileAsset("COMMUNITY_CHEST_2", "#fef4c9", "cookie") },
    FREE_PARKING: { label: "Nap Spot", image: tileAsset("FREE_PARKING", "#d8eac8", "cat") },
    CHANCE_2: { label: "Cookie Card", image: tileAsset("CHANCE_2", "#fde4a8", "star") },
    GO_TO_JAIL: { label: "Blanket Fort", image: tileAsset("GO_TO_JAIL", "#ffd9d2", "jail") },
    COMMUNITY_CHEST_3: { label: "Treat Jar", image: tileAsset("COMMUNITY_CHEST_3", "#fef4c9", "cookie") },
    CHANCE_3: { label: "Cookie Card", image: tileAsset("CHANCE_3", "#fde4a8", "star") },
    LUXURY_TAX: { label: "Fancy Bow Tax", image: tileAsset("LUXURY_TAX", "#ffd9d2", "tax") },
  },
  properties: {
    MEDITERRANEAN_AVENUE: { name: "Tiny Cookie Nook", image: tileAsset("MEDITERRANEAN_AVENUE", "#f0ddd2", "cookie") },
    BALTIC_AVENUE: { name: "Cinnamon Crumb Corner", image: tileAsset("BALTIC_AVENUE", "#f0ddd2", "cookie") },
    READING_RAILROAD: { name: "Cookie Express", image: tileAsset("READING_RAILROAD", "#e1e6eb", "train") },
    ORIENTAL_AVENUE: { name: "Mochi Meadow", image: tileAsset("ORIENTAL_AVENUE", "#d7eef1", "cup") },
    VERMONT_AVENUE: { name: "Macaron Lane", image: tileAsset("VERMONT_AVENUE", "#d7eef1", "donut") },
    CONNECTICUT_AVENUE: { name: "Boba Brook", image: tileAsset("CONNECTICUT_AVENUE", "#d7eef1", "cup") },
    ST_CHARLES_PLACE: { name: "Biscuit Boutique", image: tileAsset("ST_CHARLES_PLACE", "#f8d1df", "cookie") },
    ELECTRIC_COMPANY: { name: "Cozy Lamp Co.", image: tileAsset("ELECTRIC_COMPANY", "#fff0b8", "star") },
    STATES_AVENUE: { name: "Sprinkle Street", image: tileAsset("STATES_AVENUE", "#f8d1df", "donut") },
    VIRGINIA_AVENUE: { name: "Purrfect Parlor", image: tileAsset("VIRGINIA_AVENUE", "#f8d1df", "cat") },
    PENNSYLVANIA_RAILROAD: { name: "Pancake Trolley", image: tileAsset("PENNSYLVANIA_RAILROAD", "#e1e6eb", "train") },
    ST_JAMES_PLACE: { name: "Donut Den", image: tileAsset("ST_JAMES_PLACE", "#f6c38e", "donut") },
    TENNESSEE_AVENUE: { name: "Waffle Walk", image: tileAsset("TENNESSEE_AVENUE", "#f6c38e", "cookie") },
    NEW_YORK_AVENUE: { name: "Snack Stack Plaza", image: tileAsset("NEW_YORK_AVENUE", "#f6c38e", "cup") },
    KENTUCKY_AVENUE: { name: "Strawberry Shortcake Row", image: tileAsset("KENTUCKY_AVENUE", "#f7a5a5", "donut") },
    INDIANA_AVENUE: { name: "Cherry Tart Terrace", image: tileAsset("INDIANA_AVENUE", "#f7a5a5", "cookie") },
    ILLINOIS_AVENUE: { name: "Cupcake Castle", image: tileAsset("ILLINOIS_AVENUE", "#f7a5a5", "house") },
    B_AND_O_RAILROAD: { name: "Boba Line", image: tileAsset("B_AND_O_RAILROAD", "#e1e6eb", "train") },
    ATLANTIC_AVENUE: { name: "Bubble Tea Pier", image: tileAsset("ATLANTIC_AVENUE", "#ffe38f", "cup") },
    VENTNOR_AVENUE: { name: "Custard Cove", image: tileAsset("VENTNOR_AVENUE", "#ffe38f", "donut") },
    WATER_WORKS: { name: "Milk Fountain", image: tileAsset("WATER_WORKS", "#d7eef1", "cup") },
    MARVIN_GARDENS: { name: "Pudding Garden", image: tileAsset("MARVIN_GARDENS", "#ffe38f", "cookie") },
    PACIFIC_AVENUE: { name: "Yarn Ball Park", image: tileAsset("PACIFIC_AVENUE", "#b9dfb1", "yarn") },
    NORTH_CAROLINA_AVENUE: { name: "Nap Quilt Square", image: tileAsset("NORTH_CAROLINA_AVENUE", "#b9dfb1", "house") },
    PENNSYLVANIA_AVENUE: { name: "Sunbeam Studio", image: tileAsset("PENNSYLVANIA_AVENUE", "#b9dfb1", "star") },
    SHORT_LINE: { name: "Sundae Shuttle", image: tileAsset("SHORT_LINE", "#e1e6eb", "train") },
    PARK_PLACE: { name: "Plushie Penthouse", image: tileAsset("PARK_PLACE", "#a7c8ef", "cat") },
    BOARDWALK: { name: "Cookie Crown Cafe", image: tileAsset("BOARDWALK", "#a7c8ef", "cookie") },
  },
  cards: {
    chance: cards(chanceTexts, chanceActions),
    communityChest: cards(chestTexts, chestActions),
  },
  tokens: [
    { id: "cookie-cat", label: "Cookie Cat", color: "#b9ada6", image: tokenAsset("cookie-cat", "#b9ada6", "#f9dbe7", "cookie") },
    { id: "donut-cat", label: "Donut Cat", color: "#8f7f78", image: tokenAsset("donut-cat", "#b9ada6", "#f7bfd1", "donut") },
    { id: "yarn-cat", label: "Yarn Cat", color: "#7aa8b7", image: tokenAsset("yarn-cat", "#b9ada6", "#d7eef1", "yarn") },
    { id: "boba-cat", label: "Boba Cat", color: "#c9855b", image: tokenAsset("boba-cat", "#b9ada6", "#f6e8de", "cup") },
    { id: "star-cat", label: "Star Cat", color: "#d9a83f", image: tokenAsset("star-cat", "#b9ada6", "#fff0b8", "star") },
    { id: "bow-cat", label: "Bow Cat", color: "#d66b93", image: tokenAsset("bow-cat", "#b9ada6", "#f8d1df", "bow") },
  ],
  colors: {
    APP_BACKGROUND: "#f6e8de",
    BOARD_BACKGROUND: "#e9d4cb",
    BOARD_CENTER: "#f7d8e4",
    TILE_BACKGROUND: "#fff8f2",
    PANEL_BACKGROUND: "#fffaf6",
    TEXT: "#4d403b",
    MUTED_TEXT: "#7a6b65",
    ACCENT: "#d66b93",
    ACCENT_CONTRAST: "#ffffff",
    HIGHLIGHT: "#ffd36a",
    BROWN: "#9b6f55",
    LIGHT_BLUE: "#9fd7e1",
    PINK: "#f59abd",
    ORANGE: "#f2a05b",
    RED: "#e86f72",
    YELLOW: "#ffd36a",
    GREEN: "#88c986",
    DARK_BLUE: "#7aa8d8",
  },
};

zip.file("theme.json", JSON.stringify(theme, null, 2));
const archive = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
await writeFile("public/themes/pusheen-cafe.zip", archive);
