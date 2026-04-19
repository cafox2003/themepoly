import type { CSSProperties } from "react";
import type { GameTheme } from "../engine/theme";
import { CLASSIC_THEME } from "../engine/theme";
import { isOwnable } from "../engine/board";
import type { BoardTile, Player } from "../engine/types";

export const themeColor = (theme: GameTheme, key: string, fallback: string) => theme.colors[key] ?? CLASSIC_THEME.colors[key] ?? fallback;

const hexToRgb = (color: string) => {
  const match = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!match) return null;
  const hex = match[1].length === 3 ? match[1].split("").map((character) => character + character).join("") : match[1];
  const value = Number.parseInt(hex, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const readableTextFor = (background: string, dark = "#17201a", light = "#f8fbf4") => {
  const rgb = hexToRgb(background);
  if (!rgb) return dark;
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance > 0.48 ? dark : light;
};

export const getTileLabel = (theme: GameTheme, tile: BoardTile) => {
  if (isOwnable(tile)) return theme.properties[tile.id]?.name ?? theme.board[tile.id]?.label ?? tile.label;
  return theme.board[tile.id]?.label ?? tile.label;
};

export const getTileImage = (theme: GameTheme, tile: BoardTile) => {
  if (isOwnable(tile)) return theme.properties[tile.id]?.image ?? theme.board[tile.id]?.image;
  return theme.board[tile.id]?.image;
};

export const getThemeToken = (theme: GameTheme, player: Player) =>
  theme.tokens.find((token) => token.id === player.tokenId) ?? CLASSIC_THEME.tokens.find((token) => token.id === player.tokenId) ?? CLASSIC_THEME.tokens[0];

export const appThemeStyle = (theme: GameTheme): CSSProperties =>
  {
    const appBackground = themeColor(theme, "APP_BACKGROUND", "#eef2e8");
    const boardCenter = themeColor(theme, "BOARD_CENTER", "#c9dec1");
    const panelBackground = themeColor(theme, "PANEL_BACKGROUND", "#ffffff");
    const text = theme.colors.TEXT ?? readableTextFor(appBackground);
    return {
      "--app-bg": appBackground,
      "--app-text": readableTextFor(appBackground),
      "--board-bg": themeColor(theme, "BOARD_BACKGROUND", "#c9dec1"),
      "--board-center": boardCenter,
      "--tile-bg": themeColor(theme, "TILE_BACKGROUND", "#fafbf6"),
      "--panel-bg": panelBackground,
      "--text": text,
      "--muted-text": theme.colors.MUTED_TEXT ?? text,
      "--board-center-text": readableTextFor(boardCenter),
      "--panel-text": readableTextFor(panelBackground),
      "--accent": themeColor(theme, "ACCENT", "#15615a"),
      "--accent-contrast": themeColor(theme, "ACCENT_CONTRAST", "#ffffff"),
      "--highlight": themeColor(theme, "HIGHLIGHT", "#f7d038"),
    } as CSSProperties;
  };
