import JSZip from "jszip";
import { BOARD, ownableTiles } from "../engine/board";
import type { GameTheme } from "../engine/theme";
import type { CardAction, TileId } from "../engine/types";

const MAX_THEME_SIZE = 100 * 1024 * 1024;
const SUPPORTED_IMAGE = /\.(png|jpe?g)$/i;
const tileIds = new Set<TileId>(BOARD.map((tile) => tile.id));
const ownableIds = new Set<TileId>(ownableTiles.map((tile) => tile.id));
const cardActionTypes = new Set<CardAction["type"]>([
  "move_to",
  "move_relative",
  "pay_bank",
  "collect_bank",
  "pay_players",
  "collect_from_players",
  "go_to_jail",
  "get_out_of_jail_card",
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertOptionalAssetPath(path: unknown, field: string): asserts path is string | undefined {
  if (path === undefined) return;
  assert(typeof path === "string" && path.length > 0, `${field} must be a non-empty string.`);
  assert(!path.startsWith("/") && !path.includes(".."), `${field} must stay inside the theme zip.`);
  assert(SUPPORTED_IMAGE.test(path), `${field} must point to a PNG or JPG asset.`);
}

function validateCardAction(value: unknown, field: string): asserts value is CardAction {
  assert(isObject(value), `${field} must be an object.`);
  assert(typeof value.type === "string" && cardActionTypes.has(value.type as CardAction["type"]), `${field}.type is not supported.`);
  if (value.type === "move_to") assert(typeof value.target === "string" && tileIds.has(value.target as TileId), `${field}.target is not a canonical tile ID.`);
  if (value.type === "move_relative") assert(typeof value.spaces === "number", `${field}.spaces must be a number.`);
  if (
    value.type === "pay_bank" ||
    value.type === "collect_bank" ||
    value.type === "pay_players" ||
    value.type === "collect_from_players"
  ) {
    assert(typeof value.amount === "number" && value.amount >= 0, `${field}.amount must be a positive number.`);
  }
}

const validateTheme = (value: unknown): GameTheme => {
  assert(isObject(value), "theme.json must contain an object.");
  assert(value.version === "1.0", "theme.json version must be 1.0.");
  assert(typeof value.id === "string" && value.id.length > 0, "theme.id is required.");
  assert(typeof value.name === "string" && value.name.length > 0, "theme.name is required.");

  const theme = value as unknown as GameTheme;
  assert(isObject(theme.board), "theme.board is required.");
  assert(isObject(theme.properties), "theme.properties is required.");
  assert(isObject(theme.cards), "theme.cards is required.");
  assert(Array.isArray(theme.cards.chance), "theme.cards.chance must be an array.");
  assert(Array.isArray(theme.cards.communityChest), "theme.cards.communityChest must be an array.");
  assert(Array.isArray(theme.tokens) && theme.tokens.length > 0, "theme.tokens must contain at least one token.");
  assert(isObject(theme.colors), "theme.colors is required.");

  if (theme.images) {
    assert(isObject(theme.images), "theme.images must be an object.");
    assertOptionalAssetPath(theme.images.boardBackground, "images.boardBackground");
    assertOptionalAssetPath(theme.images.cardBack, "images.cardBack");
  }

  for (const [tileId, tile] of Object.entries(theme.board)) {
    assert(tileIds.has(tileId as TileId), `theme.board.${tileId} is not a canonical tile ID.`);
    assert(isObject(tile), `theme.board.${tileId} must be an object.`);
    assert(typeof tile.label === "string" && tile.label.length > 0, `theme.board.${tileId}.label is required.`);
    assertOptionalAssetPath(tile.image, `theme.board.${tileId}.image`);
  }

  for (const [tileId, property] of Object.entries(theme.properties)) {
    assert(ownableIds.has(tileId as TileId), `theme.properties.${tileId} is not an ownable canonical tile ID.`);
    assert(isObject(property), `theme.properties.${tileId} must be an object.`);
    assert(typeof property.name === "string" && property.name.length > 0, `theme.properties.${tileId}.name is required.`);
    assertOptionalAssetPath(property.image, `theme.properties.${tileId}.image`);
  }

  for (const [index, token] of theme.tokens.entries()) {
    assert(isObject(token), `theme.tokens.${index} must be an object.`);
    assert(typeof token.id === "string" && token.id.length > 0, `theme.tokens.${index}.id is required.`);
    assert(typeof token.label === "string" && token.label.length > 0, `theme.tokens.${index}.label is required.`);
    assert(typeof token.color === "string" && token.color.length > 0, `theme.tokens.${index}.color is required.`);
    assertOptionalAssetPath(token.image, `theme.tokens.${index}.image`);
  }

  for (const [deckName, cards] of Object.entries({ chance: theme.cards.chance, communityChest: theme.cards.communityChest })) {
    for (const [index, card] of cards.entries()) {
      assert(isObject(card), `theme.cards.${deckName}.${index} must be an object.`);
      assert(typeof card.text === "string" && card.text.length > 0, `theme.cards.${deckName}.${index}.text is required.`);
      validateCardAction(card.action, `theme.cards.${deckName}.${index}.action`);
    }
  }

  for (const [key, color] of Object.entries(theme.colors)) {
    assert(typeof color === "string" && color.length > 0, `theme.colors.${key} must be a string.`);
  }

  return theme;
};

const resolveAsset = async (zip: JSZip, objectUrls: string[], path?: string) => {
  if (!path) return undefined;
  const file = zip.file(path);
  assert(file, `Theme asset is missing: ${path}`);
  const blob = await file.async("blob");
  const url = URL.createObjectURL(blob);
  objectUrls.push(url);
  return url;
};

export interface LoadedTheme {
  theme: GameTheme;
  objectUrls: string[];
}

export const loadThemeZip = async (file: File): Promise<LoadedTheme> => {
  assert(file.size <= MAX_THEME_SIZE, "Theme zip must be 100 MB or smaller.");
  const zip = await JSZip.loadAsync(file);
  const themeFile = zip.file("theme.json");
  assert(themeFile, "Theme zip must contain theme.json at the root.");

  const rawTheme = JSON.parse(await themeFile.async("string"));
  const theme = validateTheme(rawTheme);
  const objectUrls: string[] = [];
  const loaded: GameTheme = structuredClone(theme);

  if (loaded.images) {
    loaded.images.boardBackground = await resolveAsset(zip, objectUrls, loaded.images.boardBackground);
    loaded.images.cardBack = await resolveAsset(zip, objectUrls, loaded.images.cardBack);
  }

  for (const tile of Object.values(loaded.board)) {
    if (tile) tile.image = await resolveAsset(zip, objectUrls, tile.image);
  }
  for (const property of Object.values(loaded.properties)) {
    if (property) property.image = await resolveAsset(zip, objectUrls, property.image);
  }
  for (const token of loaded.tokens) {
    token.image = await resolveAsset(zip, objectUrls, token.image);
  }

  return { theme: loaded, objectUrls };
};
