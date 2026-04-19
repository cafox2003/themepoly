import { FormEvent, useMemo, useState } from "react";
import { isOwnable, tileAt, tileById } from "./engine/board";
import { CLASSIC_THEME } from "./engine/theme";
import type { BoardTile, OwnableTile, Player } from "./engine/types";
import { selectBuildableProperties, selectSellableBuildings, useGameStore } from "./store/gameStore";
import { useThemeStore } from "./theme/themeStore";
import { appThemeStyle, getThemeToken, getTileImage, getTileLabel, themeColor } from "./theme/themeUtils";

const defaultNames = ["Player 1", "Player 2", "Player 3", "Player 4"];

const sampleThemes = [
  { name: "Noir City", file: "/themes/noir-city.zip" },
  { name: "Space Art Demo", file: "/themes/space-art-demo.zip" },
];

const gridAreaForIndex = (index: number) => {
  if (index === 0) return { gridRow: 11, gridColumn: 11 };
  if (index < 10) return { gridRow: 11, gridColumn: 11 - index };
  if (index === 10) return { gridRow: 11, gridColumn: 1 };
  if (index < 20) return { gridRow: 21 - index, gridColumn: 1 };
  if (index === 20) return { gridRow: 1, gridColumn: 1 };
  if (index < 30) return { gridRow: 1, gridColumn: index - 19 };
  if (index === 30) return { gridRow: 1, gridColumn: 11 };
  return { gridRow: index - 29, gridColumn: 11 };
};

const groupColor = (tile: BoardTile, theme = CLASSIC_THEME) => {
  if (!isOwnable(tile) || tile.group === "RAILROAD" || tile.group === "UTILITY") return undefined;
  return theme.colors[tile.group] ?? CLASSIC_THEME.colors[tile.group];
};

function SetupPanel() {
  const startGame = useGameStore((store) => store.startGame);
  const theme = useThemeStore((store) => store.theme);
  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState(defaultNames);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    startGame(
      names.slice(0, playerCount).map((name, index) => ({
        name,
        tokenId: theme.tokens[index % theme.tokens.length].id,
      })),
    );
  };

  return (
    <form className="setup" onSubmit={submit}>
      <div>
        <p className="eyebrow">Local game</p>
        <h1>Monopoly V1</h1>
      </div>
      <ThemeControls compact />
      <label>
        Players
        <select value={playerCount} onChange={(event) => setPlayerCount(Number(event.target.value))}>
          {[2, 3, 4, 5, 6].map((count) => (
            <option key={count} value={count}>
              {count}
            </option>
          ))}
        </select>
      </label>
      <div className="setup-grid">
        {Array.from({ length: playerCount }, (_, index) => {
          const token = theme.tokens[index % theme.tokens.length];
          return (
            <label key={index}>
              <span className="token-dot" style={{ background: token.color }} />
              Name
              <input
                value={names[index]}
                onChange={(event) => {
                  const next = [...names];
                  next[index] = event.target.value;
                  setNames(next);
                }}
              />
            </label>
          );
        })}
      </div>
      <button className="primary" type="submit">
        Start game
      </button>
    </form>
  );
}

function BoardToken({ player }: { player: Player }) {
  const theme = useThemeStore((store) => store.theme);
  const token = getThemeToken(theme, player);
  return (
    <span className="board-token" style={{ background: token.color }} title={player.name}>
      {token.image ? <img src={token.image} alt="" /> : player.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function BoardTileView({ tile }: { tile: BoardTile }) {
  const state = useGameStore((store) => store.state);
  const theme = useThemeStore((store) => store.theme);
  const owner = isOwnable(tile) ? state.players.find((player) => player.id === state.properties[tile.id].ownerId) : null;
  const property = isOwnable(tile) ? state.properties[tile.id] : null;
  const playersHere = state.players.filter((player) => player.position === tile.index && !player.bankrupt);
  const color = groupColor(tile, theme);
  const tileImage = getTileImage(theme, tile);
  const label = getTileLabel(theme, tile);

  return (
    <section className={`tile tile-${tile.kind}`} style={gridAreaForIndex(tile.index)}>
      {tileImage ? <img className="tile-art" src={tileImage} alt="" /> : null}
      {color ? <span className="color-band" style={{ background: color }} /> : null}
      <div className="tile-copy">
        <span className="tile-name">
          {label.split("\n").map((line, index) => (
            <span key={`${line}-${index}`}>{line}</span>
          ))}
        </span>
        {isOwnable(tile) ? <span className="tile-price">${tile.price}</span> : null}
        {owner ? <span className="owner-mark">{owner.name}</span> : null}
        {property?.houses ? <span className="building-mark">{property.houses === 5 ? "Hotel" : `${property.houses} house${property.houses > 1 ? "s" : ""}`}</span> : null}
      </div>
      <div className="token-row">
        {playersHere.map((player) => (
          <BoardToken key={player.id} player={player} />
        ))}
      </div>
    </section>
  );
}

function Board() {
  const board = useGameStore((store) => store.state.board);
  const state = useGameStore((store) => store.state);
  const theme = useThemeStore((store) => store.theme);
  const current = state.players[state.currentTurn];
  const currentTile = current ? tileAt(current.position) : null;

  return (
    <div className="board-shell">
      <div className="board">
        {board.map((tile) => (
          <BoardTileView key={tile.id} tile={tile} />
        ))}
        <div
          className="board-center"
          style={{
            backgroundImage: theme.images?.boardBackground
              ? `linear-gradient(135deg, rgba(255,255,255,0.76), rgba(255,255,255,0.35)), url(${theme.images.boardBackground})`
              : undefined,
          }}
        >
          <p className="eyebrow">Current turn</p>
          <h2>{current?.name ?? "No game"}</h2>
          <p>{currentTile ? getTileLabel(theme, currentTile) : "Start a game to play."}</p>
          <div className="dice-display">
            <span>{state.dice[0] || "-"}</span>
            <span>{state.dice[1] || "-"}</span>
          </div>
          <p className="phase">{state.phase.replaceAll("_", " ")}</p>
        </div>
      </div>
    </div>
  );
}

function PropertyCard({ tile, actionLabel, onAction }: { tile: OwnableTile; actionLabel: string; onAction: () => void }) {
  const state = useGameStore((store) => store.state);
  const theme = useThemeStore((store) => store.theme);
  const property = state.properties[tile.id];
  return (
    <div className="property-card">
      <div>
        <strong>{getTileLabel(theme, tile)}</strong>
        <span>{property.houses === 5 ? "Hotel" : `${property.houses} buildings`}</span>
      </div>
      <button type="button" onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  );
}

function TurnControls() {
  const state = useGameStore((store) => store.state);
  const theme = useThemeStore((store) => store.theme);
  const error = useGameStore((store) => store.error);
  const clearError = useGameStore((store) => store.clearError);
  const rollDice = useGameStore((store) => store.rollDice);
  const buyProperty = useGameStore((store) => store.buyProperty);
  const endTurn = useGameStore((store) => store.endTurn);
  const payBail = useGameStore((store) => store.payBail);
  const useJailCard = useGameStore((store) => store.useJailCard);
  const buyHouse = useGameStore((store) => store.buyHouse);
  const sellHouse = useGameStore((store) => store.sellHouse);
  const sellProperty = useGameStore((store) => store.sellProperty);

  const current = state.players[state.currentTurn];
  const currentTile = current ? tileAt(current.position) : null;
  const canBuy = currentTile && isOwnable(currentTile) && !state.properties[currentTile.id].ownerId && state.phase === "BUY_OR_MANAGE";
  const willRollAgain = state.dice[0] !== 0 && state.dice[0] === state.dice[1] && state.doublesRolledThisTurn > 0 && !current.inJail;
  const buildable = useMemo(() => selectBuildableProperties(state), [state]);
  const sellableBuildings = useMemo(() => selectSellableBuildings(state), [state]);
  const sellableProperties = current
    ? current.ownedPropertyIds
        .map((tileId) => tileById(tileId))
        .filter((tile): tile is OwnableTile => isOwnable(tile) && state.properties[tile.id].houses === 0)
    : [];

  if (!current) return null;

  return (
    <aside className="panel">
      <div>
        <p className="eyebrow">Actions</p>
        <h2>{current.name}</h2>
      </div>
      {error ? (
        <button type="button" className="error" onClick={clearError}>
          {error}
        </button>
      ) : null}
      <div className="button-row">
        <button type="button" className="primary" disabled={state.phase !== "ROLL" && state.phase !== "JAILED"} onClick={rollDice}>
          Roll dice
        </button>
        <button type="button" disabled={state.phase === "ROLL" || state.phase === "GAME_OVER"} onClick={endTurn}>
          {willRollAgain ? "Roll again" : "End turn"}
        </button>
      </div>
      {current.inJail ? (
        <div className="jail-actions">
          <button type="button" onClick={payBail}>
            Pay $50 bail
          </button>
          <button type="button" disabled={current.getOutOfJailCards === 0} onClick={useJailCard}>
            Use jail card
          </button>
        </div>
      ) : null}
      {canBuy && isOwnable(currentTile) ? (
        <button type="button" className="buy-button" onClick={buyProperty}>
          Buy {getTileLabel(theme, currentTile)} for ${currentTile.price}
        </button>
      ) : null}
      <ManagementList title="Build" empty="Own a full color group to build.">
        {buildable.map((tile) => (
          <PropertyCard key={tile.id} tile={tile} actionLabel={`Buy $${tile.houseCost}`} onAction={() => buyHouse(tile.id)} />
        ))}
      </ManagementList>
      <ManagementList title="Sell Buildings" empty="No buildings can be sold.">
        {sellableBuildings.map((tile) => (
          <PropertyCard key={tile.id} tile={tile} actionLabel="Sell" onAction={() => sellHouse(tile.id)} />
        ))}
      </ManagementList>
      <ManagementList title="Sell Properties" empty="No undeveloped properties.">
        {sellableProperties.map((tile) => (
          <PropertyCard key={tile.id} tile={tile} actionLabel={`Sell $${Math.floor(tile.price / 2)}`} onAction={() => sellProperty(tile.id)} />
        ))}
      </ManagementList>
    </aside>
  );
}

function ManagementList({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="management-list">
      <h3>{title}</h3>
      {hasChildren ? children : <p>{empty}</p>}
    </section>
  );
}

function PlayersPanel() {
  const state = useGameStore((store) => store.state);
  const theme = useThemeStore((store) => store.theme);
  return (
    <aside className="panel players-panel">
      <p className="eyebrow">Players</p>
      {state.players.map((player, index) => {
        const token = getThemeToken(theme, player);
        const positionTile = tileAt(player.position);
        return (
          <div className={`player-card ${index === state.currentTurn ? "active" : ""}`} key={player.id}>
            <span className="token-dot" style={{ background: token.color }} />
            <div>
              <strong>{player.name}</strong>
              <span>
                ${player.money} · {getTileLabel(theme, positionTile)}
              </span>
            </div>
            <small>{player.ownedPropertyIds.length} deeds</small>
          </div>
        );
      })}
    </aside>
  );
}

function ThemeControls({ compact = false }: { compact?: boolean }) {
  const theme = useThemeStore((store) => store.theme);
  const error = useThemeStore((store) => store.error);
  const loadThemeFile = useThemeStore((store) => store.loadThemeFile);
  const resetTheme = useThemeStore((store) => store.resetTheme);
  const clearError = useThemeStore((store) => store.clearError);

  return (
    <div className={compact ? "theme-controls compact" : "theme-controls"}>
      <div className="theme-actions">
        <label className="theme-load">
          Load theme
          <input
            accept=".zip,application/zip"
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void loadThemeFile(file);
              event.currentTarget.value = "";
            }}
          />
        </label>
        <button type="button" onClick={resetTheme}>
          Classic
        </button>
        <span className="theme-name">{theme.name}</span>
      </div>
      <div className="sample-themes" aria-label="Sample theme downloads">
        {sampleThemes.map((sample) => (
          <a key={sample.file} href={sample.file} download>
            {sample.name}
          </a>
        ))}
      </div>
      {error ? (
        <button type="button" className="theme-error" onClick={clearError}>
          {error}
        </button>
      ) : null}
    </div>
  );
}

function LogPanel() {
  const log = useGameStore((store) => store.state.log);
  return (
    <aside className="panel log-panel">
      <p className="eyebrow">Game log</p>
      <ol>
        {log.map((entry) => (
          <li key={entry.id}>{entry.message}</li>
        ))}
      </ol>
    </aside>
  );
}

export default function App() {
  const state = useGameStore((store) => store.state);
  const theme = useThemeStore((store) => store.theme);
  const winner = state.winnerId ? state.players.find((player) => player.id === state.winnerId) : null;

  if (state.players.length === 0) {
    return (
      <main className="app setup-page" style={appThemeStyle(theme)}>
        <SetupPanel />
      </main>
    );
  }

  return (
    <main className="app" style={appThemeStyle(theme)}>
      <header className="topbar">
        <div>
          <p className="eyebrow">Theme-ready engine</p>
          <h1>Monopoly V1</h1>
        </div>
        <ThemeControls />
        <div className="bank-pill">Free Parking ${state.bank.freeParkingPot}</div>
      </header>
      {winner ? <div className="winner-banner">{winner.name} wins.</div> : null}
      <div className="game-layout">
        <PlayersPanel />
        <Board />
        <TurnControls />
      </div>
      <LogPanel />
    </main>
  );
}
