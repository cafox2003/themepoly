import type { CSSProperties } from "react";
import type { GameTheme } from "../engine/theme";
import { CLASSIC_THEME } from "../engine/theme";
import { isOwnable } from "../engine/board";
import type { BoardTile, Player } from "../engine/types";

export const themeColor = (theme: GameTheme, key: string, fallback: string) => theme.colors[key] ?? CLASSIC_THEME.colors[key] ?? fallback;

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
  ({
    "--app-bg": themeColor(theme, "APP_BACKGROUND", "#eef2e8"),
    "--board-bg": themeColor(theme, "BOARD_BACKGROUND", "#c9dec1"),
    "--board-center": themeColor(theme, "BOARD_CENTER", "#c9dec1"),
    "--tile-bg": themeColor(theme, "TILE_BACKGROUND", "#fafbf6"),
    "--panel-bg": themeColor(theme, "PANEL_BACKGROUND", "#ffffff"),
    "--text": themeColor(theme, "TEXT", "#17201a"),
    "--muted-text": themeColor(theme, "MUTED_TEXT", "#5d6657"),
    "--accent": themeColor(theme, "ACCENT", "#15615a"),
    "--accent-contrast": themeColor(theme, "ACCENT_CONTRAST", "#ffffff"),
    "--highlight": themeColor(theme, "HIGHLIGHT", "#f7d038"),
  }) as CSSProperties;
