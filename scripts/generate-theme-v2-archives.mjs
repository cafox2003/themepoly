import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";

const archivesDir = "themes/archives";
const archiveNames = [
  "cubing",
  "dungeon-defenders",
  "lord-of-the-rings",
  "pokemon",
  "pusheen-cafe",
  "star-wars",
  "winx-club",
];

const palettes = {
  cubing: {
    bg: "#eef7ff",
    panel: "#ffffff",
    stroke: "#1d2939",
    colors: ["#f04438", "#fdb022", "#12b76a", "#2e90fa", "#ffffff", "#667085"],
  },
  "dungeon-defenders": {
    bg: "#1e2632",
    panel: "#f1eadf",
    stroke: "#2b1f1a",
    colors: ["#7f1d1d", "#d97706", "#2563eb", "#16a34a", "#7c3aed", "#94a3b8"],
  },
  "lord-of-the-rings": {
    bg: "#e8ddc4",
    panel: "#fff8e8",
    stroke: "#3f3326",
    colors: ["#caa24a", "#2f6b45", "#6b4f2a", "#d9c58f", "#7c2d12", "#475569"],
  },
  pokemon: {
    bg: "#e6f3ff",
    panel: "#fffdf2",
    stroke: "#263238",
    colors: ["#ef4444", "#facc15", "#22c55e", "#38bdf8", "#fb923c", "#a855f7"],
  },
  "pusheen-cafe": {
    bg: "#f6e8de",
    panel: "#fff8f2",
    stroke: "#4d403b",
    colors: ["#b9ada6", "#f59abd", "#ffd36a", "#9ac7d9", "#d99b61", "#88c986"],
  },
  "star-wars": {
    bg: "#111827",
    panel: "#f8fafc",
    stroke: "#0f172a",
    colors: ["#60a5fa", "#facc15", "#22c55e", "#ef4444", "#a78bfa", "#94a3b8"],
  },
  "winx-club": {
    bg: "#fce7f3",
    panel: "#fff7ed",
    stroke: "#4c1d95",
    colors: ["#f97316", "#facc15", "#22c55e", "#ec4899", "#38bdf8", "#8b5cf6"],
  },
};

const xml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");

const normalize = (value) => String(value).replace(/\s+/g, " ").trim();

const symbolFor = (themeId, text, index = 0) => {
  const label = normalize(text).toLowerCase();
  if (themeId === "cubing") {
    if (/timer|stackmat|inspection/.test(label)) return "timer";
    if (/algorithm|oll|pll|case/.test(label)) return "algorithm";
    if (/scramble|pair|slot|cross|layer|cube|2x2|3x3|mega|pyraminx/.test(label)) return "cube";
    return "cube";
  }
  if (themeId === "dungeon-defenders") {
    if (/chest|loot/.test(label)) return "chest";
    if (/crystal|mana|core/.test(label)) return "crystal";
    if (/tower|missile|fireball|aura|trap|blockade|barricade/.test(label)) return "tower";
    if (/forge|relic/.test(label)) return "forge";
    return index % 2 ? "shield" : "sword";
  }
  if (themeId === "lord-of-the-rings") {
    if (/ring|hoard|treasure/.test(label)) return "ring";
    if (/tree|shire|leaf|garden|bywater/.test(label)) return "tree";
    if (/mordor|dragon|dungeon/.test(label)) return "mountain";
    if (/eagle|route|pony/.test(label)) return "route";
    return "gate";
  }
  if (themeId === "pokemon") {
    if (/ball|trainer|badge|voucher|start/.test(label)) return "ball";
    if (/power|thunder|electric/.test(label)) return "bolt";
    if (/leaf|grove|patch|garden|bulbasaur|oddish/.test(label)) return "leaf";
    if (/water|pond|creek|bay|lapras|squirtle|psyduck/.test(label)) return "water";
    if (/fire|charmander|den/.test(label)) return "flame";
    return "star";
  }
  if (themeId === "pusheen-cafe") {
    if (/cookie|biscuit|crumb|jar/.test(label)) return "cookie";
    if (/donut|macaron|custard|pudding|shortcake|cupcake/.test(label)) return "donut";
    if (/boba|tea|milk|cup/.test(label)) return "cup";
    if (/yarn|quilt/.test(label)) return "yarn";
    if (/fort|tax/.test(label)) return "jail";
    return "cat";
  }
  if (themeId === "star-wars") {
    if (/freighter|route|shuttle|hyperspace|platform/.test(label)) return "ship";
    if (/saber|kyber/.test(label)) return "saber";
    if (/helmet|detention|captured/.test(label)) return "helmet";
    if (/holocron|holonet|mission/.test(label)) return "holocron";
    if (/power|converter/.test(label)) return "bolt";
    return "planet";
  }
  if (themeId === "winx-club") {
    if (/flame|dragon|bloom/.test(label)) return "flame";
    if (/sun|stella|light|moon/.test(label)) return "sun";
    if (/leaf|flora|garden/.test(label)) return "leaf";
    if (/music|song|musa/.test(label)) return "music";
    if (/wave|cloud|water/.test(label)) return "wave";
    if (/circuit|tech|spell|charm|hex/.test(label)) return "spark";
    return "wing";
  }
  return "star";
};

const iconSvg = (symbol, palette, color) => {
  const stroke = palette.stroke;
  if (symbol === "cube") return `<g stroke="${stroke}" stroke-width="6" stroke-linejoin="round"><path d="M80 35 118 57v46L80 125l-38-22V57Z" fill="${color}"/><path d="M80 35v45m38-23L80 80 42 57m38 23v45" fill="none"/><path d="M61 46v46m38-46v46M48 80h64M55 105h50" fill="none" stroke-width="4"/></g>`;
  if (symbol === "timer") return `<g stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><rect x="40" y="59" width="80" height="46" rx="18" fill="${color}"/><path d="M58 59v-9h44v9M64 82h32M51 112h58" fill="none"/><circle cx="80" cy="82" r="8" fill="${palette.panel}"/></g>`;
  if (symbol === "algorithm") return `<g stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M43 84c10-26 34-37 60-22" fill="none"/><path d="m104 48 2 25-24-3" fill="none"/><path d="M116 91c-11 25-36 35-61 18" fill="none"/><path d="m54 124-1-25 24 4" fill="none"/><circle cx="80" cy="86" r="18" fill="${color}"/></g>`;
  if (symbol === "chest") return `<g stroke="${stroke}" stroke-width="6" stroke-linejoin="round"><path d="M42 68h76v49H42Z" fill="${color}"/><path d="M50 54h60l8 14H42Z" fill="#d9a441"/><path d="M80 54v63M42 83h76" fill="none"/><rect x="72" y="78" width="16" height="18" rx="3" fill="${palette.panel}"/></g>`;
  if (symbol === "crystal") return `<g stroke="${stroke}" stroke-width="6" stroke-linejoin="round"><path d="M80 28 113 69 93 128H67L47 69Z" fill="${color}"/><path d="M47 69h66M80 28v100M67 128 80 69l13 59" fill="none" opacity=".8"/></g>`;
  if (symbol === "tower") return `<g stroke="${stroke}" stroke-width="6" stroke-linejoin="round"><path d="M55 52h50l-5 78H60Z" fill="${color}"/><path d="M51 52V34h15v14h14V34h14v14h15v18Z" fill="#c7b7a3"/><path d="M72 130V98h16v32M66 73h28" fill="none"/></g>`;
  if (symbol === "forge") return `<g stroke="${stroke}" stroke-width="6" stroke-linejoin="round"><path d="M49 81h62v43H49Z" fill="#7f1d1d"/><path d="M60 81c4-25 34-25 40 0" fill="${color}"/><path d="M64 124h32M72 99h16" fill="none" stroke-linecap="round"/></g>`;
  if (symbol === "shield") return `<path d="M80 30 119 48v32c0 27-16 44-39 53-23-9-39-26-39-53V48Z" fill="${color}" stroke="${stroke}" stroke-width="6" stroke-linejoin="round"/>`;
  if (symbol === "sword") return `<g stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M104 28 91 82 61 112 48 99 78 69Z" fill="${color}"/><path d="M58 91 38 111M48 81l31 31M32 118l10 10" fill="none"/></g>`;
  if (symbol === "ring") return `<circle cx="80" cy="80" r="42" fill="none" stroke="#d9b65b" stroke-width="18"/><circle cx="80" cy="80" r="42" fill="none" stroke="${stroke}" stroke-width="5"/>`;
  if (symbol === "tree") return `<g stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M80 124V67" fill="none"/><path d="M80 67c-21-31-45-17-38 8 5 18 25 25 38 8 13 17 33 10 38-8 7-25-17-39-38-8Z" fill="${color}"/><path d="M65 124h30" fill="none"/></g>`;
  if (symbol === "mountain") return `<g stroke="${stroke}" stroke-width="6" stroke-linejoin="round"><path d="M31 119 69 45l17 32 13-18 30 60Z" fill="${color}"/><path d="M69 45 59 82l27-5 13-18" fill="${palette.panel}"/></g>`;
  if (symbol === "route") return `<g stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M41 116c45-12 25-67 79-78" fill="none"/><path d="M96 35h27v27M48 111l-10 15M74 90l-10 15M96 63l-10 15" fill="none"/><circle cx="80" cy="80" r="15" fill="${color}"/></g>`;
  if (symbol === "gate") return `<g stroke="${stroke}" stroke-width="6" stroke-linejoin="round"><path d="M44 124V59c0-22 16-37 36-37s36 15 36 37v65H92V86H68v38Z" fill="${color}"/><path d="M68 86h24M80 22v64" fill="none"/></g>`;
  if (symbol === "ball") return `<g stroke="${stroke}" stroke-width="6"><circle cx="80" cy="80" r="48" fill="${palette.panel}"/><path d="M33 80a47 47 0 0 1 94 0Z" fill="${color}"/><path d="M32 80h96" fill="none"/><circle cx="80" cy="80" r="17" fill="${palette.panel}"/></g>`;
  if (symbol === "bolt") return `<path d="M89 24 45 87h31l-8 49 47-66H82Z" fill="${color}" stroke="${stroke}" stroke-width="6" stroke-linejoin="round"/>`;
  if (symbol === "leaf") return `<g stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M119 39C75 35 43 57 42 112c48 1 75-25 77-73Z" fill="${color}"/><path d="M45 111c23-27 42-45 69-66" fill="none"/></g>`;
  if (symbol === "water") return `<path d="M80 30c29 35 43 56 43 76 0 22-18 36-43 36s-43-14-43-36c0-20 14-41 43-76Z" fill="${color}" stroke="${stroke}" stroke-width="6" stroke-linejoin="round"/>`;
  if (symbol === "flame") return `<path d="M86 28c3 24 30 31 30 65 0 27-18 45-36 45-24 0-40-16-40-41 0-20 14-34 24-48 3 16 11 22 22 25-8-18-8-30 0-46Z" fill="${color}" stroke="${stroke}" stroke-width="6" stroke-linejoin="round"/>`;
  if (symbol === "star") return `<path d="m80 32 13 29 32 3-24 22 7 32-28-17-28 17 7-32-24-22 32-3Z" fill="${color}" stroke="${stroke}" stroke-width="6" stroke-linejoin="round"/>`;
  if (symbol === "cat") return `<g stroke="${stroke}" stroke-width="6" stroke-linejoin="round"><path d="M48 64 56 41 72 57h16l16-16 8 23c8 8 12 17 12 28 0 28-21 43-44 43S36 120 36 92c0-11 4-20 12-28Z" fill="${color}"/><circle cx="66" cy="91" r="4" fill="${stroke}"/><circle cx="94" cy="91" r="4" fill="${stroke}"/><path d="M76 103h8m-4-4v8M55 104h16M89 104h16" fill="none" stroke-linecap="round" stroke-width="4"/></g>`;
  if (symbol === "cookie") return `<g stroke="${stroke}" stroke-width="6"><circle cx="80" cy="82" r="43" fill="${color}"/><circle cx="63" cy="70" r="5" fill="${stroke}"/><circle cx="93" cy="64" r="5" fill="${stroke}"/><circle cx="101" cy="96" r="5" fill="${stroke}"/><circle cx="72" cy="105" r="5" fill="${stroke}"/></g>`;
  if (symbol === "donut") return `<g stroke="${stroke}" stroke-width="6"><circle cx="80" cy="82" r="43" fill="#c9855b"/><circle cx="80" cy="82" r="16" fill="${palette.panel}"/><path d="M47 78c17-20 48-22 68 0" stroke="${color}" stroke-width="14" stroke-linecap="round" fill="none"/></g>`;
  if (symbol === "cup") return `<g stroke="${stroke}" stroke-width="6" stroke-linejoin="round"><path d="M54 48h52l-8 70H62Z" fill="${palette.panel}"/><path d="M106 64h18c0 20-8 30-26 30" fill="none"/><path d="M65 67h30" stroke="${color}" stroke-width="10" stroke-linecap="round"/></g>`;
  if (symbol === "yarn") return `<g stroke="${stroke}" stroke-width="6"><circle cx="80" cy="82" r="42" fill="${color}"/><path d="M47 83c23-20 45-26 68-13M57 111c10-25 27-44 50-57M55 63c31 14 52 31 65 54" fill="none" stroke="#5f9db6" stroke-linecap="round"/></g>`;
  if (symbol === "jail") return `<g stroke="${stroke}" stroke-width="6" stroke-linejoin="round"><rect x="49" y="45" width="62" height="72" fill="${color}"/><path d="M63 47v68M80 47v68M97 47v68" fill="none"/></g>`;
  if (symbol === "ship") return `<g stroke="${stroke}" stroke-width="6" stroke-linejoin="round"><path d="M31 93 91 45l38 22-58 50Z" fill="${color}"/><path d="M55 99 79 48M70 119l-5-43M95 98l17 20" fill="none" stroke-linecap="round"/></g>`;
  if (symbol === "saber") return `<g stroke="${stroke}" stroke-width="6" stroke-linecap="round"><path d="M49 112 105 39" stroke="${color}" stroke-width="12"/><path d="M39 126 58 101M49 103l21 16" fill="none"/></g>`;
  if (symbol === "helmet") return `<g stroke="${stroke}" stroke-width="6" stroke-linejoin="round"><path d="M43 83c0-30 15-51 39-51s39 21 39 51v37H43Z" fill="${color}"/><path d="M58 78h44M67 93h26M80 34v86" fill="none" stroke-linecap="round"/></g>`;
  if (symbol === "holocron") return `<g stroke="${stroke}" stroke-width="6" stroke-linejoin="round"><path d="M80 32 121 58v48l-41 24-41-24V58Z" fill="${color}"/><path d="M80 32v98M39 58l41 24 41-24M39 106l41-24 41 24" fill="none"/></g>`;
  if (symbol === "planet") return `<g stroke="${stroke}" stroke-width="6"><circle cx="80" cy="80" r="39" fill="${color}"/><path d="M31 92c20-24 64-39 98-32" fill="none" stroke-linecap="round"/><path d="M47 104c27 7 63 0 86-19" fill="none" stroke-linecap="round"/></g>`;
  if (symbol === "sun") return `<g stroke="${stroke}" stroke-width="6" stroke-linecap="round"><circle cx="80" cy="80" r="29" fill="${color}"/><path d="M80 25v18M80 117v18M25 80h18M117 80h18M41 41l13 13M106 106l13 13M119 41l-13 13M54 106l-13 13"/></g>`;
  if (symbol === "music") return `<g stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"><path d="M67 105V45l48-10v59" fill="none"/><circle cx="55" cy="110" r="13" fill="${color}"/><circle cx="103" cy="99" r="13" fill="${color}"/></g>`;
  if (symbol === "wave") return `<path d="M31 99c17-25 35-25 53 0s35 25 53 0v28H31Z" fill="${color}" stroke="${stroke}" stroke-width="6" stroke-linejoin="round"/><path d="M34 74c14-14 28-14 42 0s28 14 42 0" fill="none" stroke="${stroke}" stroke-width="6" stroke-linecap="round"/>`;
  if (symbol === "spark") return `<g stroke="${stroke}" stroke-width="6" stroke-linejoin="round"><path d="M80 29 91 66l37 14-37 14-11 37-11-37-37-14 37-14Z" fill="${color}"/><path d="M44 39h18M53 30v18M111 110h18M120 101v18" stroke-linecap="round"/></g>`;
  if (symbol === "wing") return `<g stroke="${stroke}" stroke-width="6" stroke-linejoin="round"><path d="M77 111C36 104 27 68 49 35c20 14 29 40 28 76Z" fill="${color}"/><path d="M83 111c41-7 50-43 28-76-20 14-29 40-28 76Z" fill="#f9a8d4"/><path d="M57 60c8 14 13 29 15 46M103 60c-8 14-13 29-15 46" fill="none"/></g>`;
  return `<circle cx="80" cy="80" r="44" fill="${color}" stroke="${stroke}" stroke-width="6"/>`;
};

const tileSvg = (themeId, label, index) => {
  const palette = palettes[themeId];
  const color = palette.colors[index % palette.colors.length];
  const symbol = symbolFor(themeId, label, index);
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
  <rect width="160" height="160" rx="18" fill="${palette.bg}"/>
  <circle cx="80" cy="80" r="61" fill="${palette.panel}" stroke="${palette.stroke}" stroke-width="5"/>
  ${iconSvg(symbol, palette, color)}
</svg>`;
};

const tokenSvg = (themeId, label, index) => {
  const palette = palettes[themeId];
  const color = palette.colors[index % palette.colors.length];
  const symbol = symbolFor(themeId, label, index);
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="64" fill="${palette.bg}"/>
  <circle cx="64" cy="64" r="52" fill="${palette.panel}" stroke="${palette.stroke}" stroke-width="5"/>
  <g transform="translate(-16 -16) scale(1)">
    ${iconSvg(symbol, palette, color)}
  </g>
</svg>`;
};

const boardSvg = (themeId, themeName) => {
  const palette = palettes[themeId];
  const icons = Array.from({ length: 12 }, (_, index) => iconSvg(symbolFor(themeId, themeName, index), palette, palette.colors[index % palette.colors.length]));
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 900">
  <rect width="900" height="900" fill="${palette.bg}"/>
  <path d="M70 690c160-90 285-94 430-17 125 67 218 53 330-28v185H70Z" fill="${palette.colors[1]}33"/>
  <circle cx="450" cy="390" r="235" fill="${palette.panel}" stroke="${palette.stroke}" stroke-width="22"/>
  <g transform="translate(270 210) scale(2.25)">
    ${icons[0]}
  </g>
  <g opacity=".22">
    <circle cx="170" cy="160" r="44" fill="${palette.colors[0]}"/>
    <circle cx="730" cy="185" r="34" fill="${palette.colors[2]}"/>
    <circle cx="715" cy="705" r="52" fill="${palette.colors[3]}"/>
    <circle cx="185" cy="720" r="30" fill="${palette.colors[4]}"/>
  </g>
  <text x="450" y="752" text-anchor="middle" font-family="Arial, sans-serif" font-size="62" font-weight="800" fill="${palette.stroke}">${xml(themeName)} V2</text>
</svg>`;
};

const nextPath = (folder, id, kind) => `assets/${folder}/${id}.${kind}`;

const generateV2 = async (archiveName) => {
  const inputPath = path.join(archivesDir, `${archiveName}.zip`);
  const outputPath = path.join(archivesDir, `${archiveName}-v2.zip`);
  const original = await JSZip.loadAsync(await readFile(inputPath));
  const rawTheme = await original.file("theme.json")?.async("string");
  if (!rawTheme) throw new Error(`${inputPath} does not contain theme.json`);
  const theme = JSON.parse(rawTheme);
  const v2 = structuredClone(theme);
  const baseId = String(theme.id);
  const palette = palettes[baseId];
  if (!palette) throw new Error(`No palette configured for ${baseId}`);

  v2.id = `${baseId}-v2`;
  v2.name = `${theme.name} V2`;
  v2.images = { ...(v2.images ?? {}), boardBackground: "assets/board/background.svg" };

  const output = new JSZip();
  output.file(v2.images.boardBackground, boardSvg(baseId, theme.name).trim());

  let imageIndex = 0;
  for (const [tileId, tile] of Object.entries(v2.board ?? {})) {
    const image = nextPath("spaces", tileId, "svg");
    tile.image = image;
    output.file(image, tileSvg(baseId, tile.label, imageIndex++).trim());
  }
  for (const [tileId, property] of Object.entries(v2.properties ?? {})) {
    const image = nextPath("spaces", tileId, "svg");
    property.image = image;
    output.file(image, tileSvg(baseId, property.name, imageIndex++).trim());
  }
  for (const [index, token] of (v2.tokens ?? []).entries()) {
    const image = nextPath("tokens", token.id, "svg");
    token.image = image;
    output.file(image, tokenSvg(baseId, token.label, index).trim());
  }

  output.file("theme.json", JSON.stringify(v2, null, 2));
  await writeFile(outputPath, await output.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  return outputPath;
};

for (const archiveName of archiveNames) {
  const outputPath = await generateV2(archiveName);
  console.log(outputPath);
}
