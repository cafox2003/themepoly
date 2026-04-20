import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { isOwnable, tileAt, tileById } from "./engine/board";
import { CLASSIC_THEME } from "./engine/theme";
import type { BoardTile, GameSettings, OwnableTile, Player, TileId } from "./engine/types";
import {
  selectBuildableProperties,
  selectMortgageableProperties,
  selectSellableBuildings,
  selectUnmortgageableProperties,
  useGameStore,
} from "./store/gameStore";
import { useMultiplayerStore } from "./store/multiplayerStore";
import { useThemeStore } from "./theme/themeStore";
import { appThemeStyle, getThemeToken, getTileImage, getTileLabel } from "./theme/themeUtils";

const defaultNames = ["Player 1", "Player 2", "Player 3", "Player 4"];

const sampleThemes = [
  { id: "noir-city", name: "Noir City", file: "/themes/noir-city.zip" },
  { id: "space-art-demo", name: "Space Art Demo", file: "/themes/space-art-demo.zip" },
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

const boardTrackWeights = [1.15, ...Array(9).fill(0.86), 1.15];
const boardTrackTotal = boardTrackWeights.reduce((total, weight) => total + weight, 0);
const boardTrackStarts = boardTrackWeights.reduce<number[]>((starts, weight, index) => {
  starts[index + 1] = starts[index] + weight;
  return starts;
}, [0]);

const tokenOffsets = [
  [-0.95, -0.95],
  [0.95, -0.95],
  [-0.95, 0.95],
  [0.95, 0.95],
  [0, -1.35],
  [0, 1.35],
];

const boardPointForIndex = (index: number) => {
  const area = gridAreaForIndex(index);
  const column = Number(area.gridColumn) - 1;
  const row = Number(area.gridRow) - 1;
  const x = ((boardTrackStarts[column] + boardTrackWeights[column] / 2) / boardTrackTotal) * 100;
  const y = ((boardTrackStarts[row] + boardTrackWeights[row] / 2) / boardTrackTotal) * 100;
  return { x, y };
};

const groupColor = (tile: BoardTile, theme = CLASSIC_THEME) => {
  if (!isOwnable(tile) || tile.group === "RAILROAD" || tile.group === "UTILITY") return undefined;
  return theme.colors[tile.group] ?? CLASSIC_THEME.colors[tile.group];
};

const buildingLabel = (houses: number) => {
  if (houses === 5) return "Hotel";
  if (houses === 1) return "1 house";
  return `${houses} houses`;
};

function SetupPanel() {
  const startGame = useGameStore((store) => store.startGame);
  const theme = useThemeStore((store) => store.theme);
  const multiplayerStatus = useMultiplayerStore((store) => store.status);
  const multiplayerUrl = useMultiplayerStore((store) => store.url);
  const multiplayerRoomId = useMultiplayerStore((store) => store.roomId);
  const multiplayerError = useMultiplayerStore((store) => store.error);
  const connect = useMultiplayerStore((store) => store.connect);
  const createRoom = useMultiplayerStore((store) => store.createRoom);
  const joinRoom = useMultiplayerStore((store) => store.joinRoom);
  const disconnect = useMultiplayerStore((store) => store.disconnect);
  const clearMultiplayerError = useMultiplayerStore((store) => store.clearError);
  const [playerCount, setPlayerCount] = useState(2);
  const [names, setNames] = useState(defaultNames);
  const [serverUrl, setServerUrl] = useState(multiplayerUrl);
  const [joinRoomId, setJoinRoomId] = useState(() => new URLSearchParams(window.location.search).get("room") ?? "");
  const [joinPlayerName, setJoinPlayerName] = useState(defaultNames[0]);

  const setupPlayers = () =>
    names.slice(0, playerCount).map((name, index) => ({
      name,
      tokenId: theme.tokens[index % theme.tokens.length].id,
    }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    startGame(setupPlayers());
  };

  const hostRoom = async () => {
    if (multiplayerStatus !== "connected") await connect(serverUrl);
    createRoom(setupPlayers());
  };

  const joinExistingRoom = async () => {
    if (multiplayerStatus !== "connected") await connect(serverUrl);
    joinRoom(joinRoomId, joinPlayerName);
  };

  return (
    <form className="setup" onSubmit={submit}>
      <div>
        <p className="eyebrow">Local game</p>
        <h1>Themepoly V1</h1>
      </div>
      <ThemeName />
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
      <section className="setup-multiplayer">
        <div>
          <p className="eyebrow">Multiplayer</p>
          <strong>{multiplayerStatus === "connected" ? `Connected${multiplayerRoomId ? ` · ${multiplayerRoomId}` : ""}` : "Server connection"}</strong>
        </div>
        <label>
          Server
          <input value={serverUrl} onChange={(event) => setServerUrl(event.target.value)} />
        </label>
        <div className="button-row">
          <button type="button" onClick={() => void hostRoom()}>
            Host room
          </button>
          <button type="button" disabled={multiplayerStatus === "offline"} onClick={disconnect}>
            Disconnect
          </button>
        </div>
        <div className="join-row">
          <input placeholder="Your name" value={joinPlayerName} onChange={(event) => setJoinPlayerName(event.target.value)} />
          <input placeholder="Room ID" value={joinRoomId} onChange={(event) => setJoinRoomId(event.target.value)} />
          <button type="button" disabled={!joinRoomId.trim() || !joinPlayerName.trim()} onClick={() => void joinExistingRoom()}>
            Join
          </button>
        </div>
        {multiplayerError ? (
          <button type="button" className="error" onClick={clearMultiplayerError}>
            {multiplayerError}
          </button>
        ) : null}
      </section>
    </form>
  );
}

function BoardToken({ player, className = "", style }: { player: Player; className?: string; style?: React.CSSProperties }) {
  const theme = useThemeStore((store) => store.theme);
  const token = getThemeToken(theme, player);
  return (
    <span className={`board-token ${className}`} style={{ background: token.color, ...style }} title={player.name}>
      {token.image ? <img src={token.image} alt="" /> : player.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function BoardTileView({ tile }: { tile: BoardTile }) {
  const state = useGameStore((store) => store.state);
  const theme = useThemeStore((store) => store.theme);
  const owner = isOwnable(tile) ? state.players.find((player) => player.id === state.properties[tile.id].ownerId) : null;
  const ownerToken = owner ? getThemeToken(theme, owner) : null;
  const property = isOwnable(tile) ? state.properties[tile.id] : null;
  const color = groupColor(tile, theme);
  const tileImage = getTileImage(theme, tile);
  const label = getTileLabel(theme, tile);

  return (
    <section className={`tile tile-${tile.kind} ${owner ? "tile-owned" : ""}`} style={gridAreaForIndex(tile.index)}>
      {tileImage ? <img className="tile-art" src={tileImage} alt="" /> : null}
      {color ? <span className="color-band" style={{ background: color }} /> : null}
      <div className="tile-copy">
        <span className="tile-name">
          {label.split("\n").map((line, index) => (
            <span key={`${line}-${index}`}>{line}</span>
          ))}
        </span>
        {isOwnable(tile) ? <span className="tile-price">${tile.price}</span> : null}
        {property?.houses ? <span className="building-mark">{buildingLabel(property.houses)}</span> : null}
        {property?.mortgaged ? <span className="mortgage-mark">Mortgaged</span> : null}
      </div>
      {owner && ownerToken ? (
        <span className="owner-mark" title={`Owned by ${owner.name}`} style={{ "--owner-color": ownerToken.color } as React.CSSProperties}>
          <span className="owner-dot" aria-hidden="true" />
          <span className="owner-name">{owner.name}</span>
        </span>
      ) : null}
    </section>
  );
}

function BoardTokenLayer() {
  const players = useGameStore((store) => store.state.players);
  const activePlayers = players.filter((player) => !player.bankrupt);
  const positionCounts = new Map<number, number>();

  return (
    <div className="board-token-layer" aria-hidden="true">
      {activePlayers.map((player) => {
        const position = player.position;
        const stackIndex = positionCounts.get(position) ?? 0;
        positionCounts.set(position, stackIndex + 1);
        const point = boardPointForIndex(position);
        const offset = tokenOffsets[stackIndex % tokenOffsets.length];
        return (
          <BoardToken
            key={player.id}
            player={player}
            className="moving-token"
            style={
              {
                "--token-x": `${point.x}%`,
                "--token-y": `${point.y}%`,
                "--token-offset-x": offset[0],
                "--token-offset-y": offset[1],
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

function DiceDisplay({ dice }: { dice: [number, number] }) {
  const [rolling, setRolling] = useState(false);
  const previousDice = useRef(dice.join("-"));

  useEffect(() => {
    const nextDice = dice.join("-");
    if (nextDice === previousDice.current) return;
    previousDice.current = nextDice;
    setRolling(true);
    const timeout = window.setTimeout(() => setRolling(false), 520);
    return () => window.clearTimeout(timeout);
  }, [dice]);

  return (
    <div className={`dice-display ${rolling ? "rolling" : ""}`} aria-label={`Dice: ${dice[0] || "-"} and ${dice[1] || "-"}`}>
      <span>{dice[0] || "-"}</span>
      <span>{dice[1] || "-"}</span>
    </div>
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
          <p className="current-location">{currentTile ? getTileLabel(theme, currentTile) : "Start a game to play."}</p>
          <DiceDisplay dice={state.dice} />
          <p className="phase">{state.phase.replaceAll("_", " ")}</p>
        </div>
        <BoardTokenLayer />
      </div>
    </div>
  );
}

function PropertyCard({
  tile,
  actionLabel,
  onAction,
  detail,
  disabled = false,
}: {
  tile: OwnableTile;
  actionLabel: string;
  onAction: () => void;
  detail?: string;
  disabled?: boolean;
}) {
  const state = useGameStore((store) => store.state);
  const theme = useThemeStore((store) => store.theme);
  const property = state.properties[tile.id];
  return (
    <div className="property-card">
      <div>
        <strong>{getTileLabel(theme, tile)}</strong>
        <span>
          {property.houses > 0 ? buildingLabel(property.houses) : "No buildings"}
          {property.mortgaged ? " · Mortgaged" : ""}
        </span>
        {detail ? <span>{detail}</span> : null}
      </div>
      <button type="button" disabled={disabled} onClick={onAction}>
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
  const mortgageProperty = useGameStore((store) => store.mortgageProperty);
  const unmortgageProperty = useGameStore((store) => store.unmortgageProperty);
  const declareBankruptcy = useGameStore((store) => store.declareBankruptcy);
  const multiplayerStatus = useMultiplayerStore((store) => store.status);
  const claimedPlayerId = useMultiplayerStore((store) => store.claimedPlayerId);

  const current = state.players[state.currentTurn];
  const currentTile = current ? tileAt(current.position) : null;
  const canBuy = currentTile && isOwnable(currentTile) && !state.properties[currentTile.id].ownerId && state.phase === "BUY_OR_MANAGE";
  const willRollAgain = state.dice[0] !== 0 && state.dice[0] === state.dice[1] && state.doublesRolledThisTurn > 0 && !current.inJail;
  const buildable = useMemo(() => selectBuildableProperties(state), [state]);
  const sellableBuildings = useMemo(() => selectSellableBuildings(state), [state]);
  const mortgageable = useMemo(() => selectMortgageableProperties(state), [state]);
  const unmortgageable = useMemo(() => selectUnmortgageableProperties(state), [state]);
  const sellableProperties = current
    ? current.ownedPropertyIds
        .map((tileId) => tileById(tileId))
        .filter((tile): tile is OwnableTile => isOwnable(tile) && state.properties[tile.id].houses === 0 && !state.properties[tile.id].mortgaged)
    : [];

  if (!current) return null;

  const remoteBlocked = multiplayerStatus === "connected" && current.id !== claimedPlayerId;

  const hasManagement =
    buildable.length > 0 ||
    sellableBuildings.length > 0 ||
    mortgageable.length > 0 ||
    unmortgageable.length > 0 ||
    sellableProperties.length > 0;

  return (
    <details className="panel actions-panel collapsible-panel" open>
      <summary>Actions</summary>
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Actions</p>
          <h2>{current.name}</h2>
        </div>
        <button type="button" className="danger-button compact-danger" disabled={remoteBlocked} onClick={declareBankruptcy}>
          Bankrupt
        </button>
      </div>
      {error ? (
        <button type="button" className="error" onClick={clearError}>
          {error}
        </button>
      ) : null}
      {remoteBlocked ? <p className="turn-lock">Waiting for {current.name}'s controller.</p> : null}
      <div className="button-row">
        <button type="button" className="primary" disabled={remoteBlocked || (state.phase !== "ROLL" && state.phase !== "JAILED")} onClick={rollDice}>
          Roll dice
        </button>
        <button type="button" disabled={remoteBlocked || state.phase === "ROLL" || state.phase === "GAME_OVER"} onClick={endTurn}>
          {willRollAgain ? "Roll again" : "End turn"}
        </button>
      </div>
      {current.inJail ? (
        <div className="jail-actions">
          <button type="button" disabled={remoteBlocked} onClick={payBail}>
            Pay $50 bail
          </button>
          <button type="button" disabled={remoteBlocked || current.getOutOfJailCards === 0} onClick={useJailCard}>
            Use holding card
          </button>
        </div>
      ) : null}
      {canBuy && isOwnable(currentTile) ? (
        <button type="button" className="buy-button" disabled={remoteBlocked} onClick={buyProperty}>
          Buy {getTileLabel(theme, currentTile)} for ${currentTile.price}
        </button>
      ) : null}
      <details className="management-drawer" open={hasManagement}>
        <summary>Property management</summary>
        <ManagementList title="Build" empty="Own a full color group to build.">
          {buildable.map((tile) => (
            <PropertyCard
              key={tile.id}
              tile={tile}
              actionLabel={`Buy $${tile.houseCost}`}
              detail={state.properties[tile.id].houses === 4 ? "Next: hotel" : "Next: house"}
              disabled={remoteBlocked}
              onAction={() => buyHouse(tile.id)}
            />
          ))}
        </ManagementList>
        <ManagementList title="Sell Buildings" empty="No buildings can be sold.">
          {sellableBuildings.map((tile) => (
            <PropertyCard key={tile.id} tile={tile} actionLabel={`Sell $${Math.floor((tile.houseCost ?? 0) / 2)}`} disabled={remoteBlocked} onAction={() => sellHouse(tile.id)} />
          ))}
        </ManagementList>
        <ManagementList title="Mortgage" empty="No clear properties can be mortgaged.">
          {mortgageable.map((tile) => (
            <PropertyCard key={tile.id} tile={tile} actionLabel={`Get $${tile.mortgageValue}`} disabled={remoteBlocked} onAction={() => mortgageProperty(tile.id)} />
          ))}
        </ManagementList>
        <ManagementList title="Unmortgage" empty="No mortgaged properties.">
          {unmortgageable.map((tile) => {
            const cost = tile.mortgageValue + Math.ceil(tile.mortgageValue * 0.1);
            return <PropertyCard key={tile.id} tile={tile} actionLabel={`Pay $${cost}`} disabled={remoteBlocked || current.money < cost} onAction={() => unmortgageProperty(tile.id)} />;
          })}
        </ManagementList>
        <ManagementList title="Sell Properties" empty="No undeveloped properties.">
          {sellableProperties.map((tile) => (
            <PropertyCard key={tile.id} tile={tile} actionLabel={`Sell $${Math.floor(tile.price / 2)}`} disabled={remoteBlocked} onAction={() => sellProperty(tile.id)} />
          ))}
        </ManagementList>
      </details>
    </details>
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
  const claimedPlayerId = useMultiplayerStore((store) => store.claimedPlayerId);
  return (
    <details className="panel players-panel collapsible-panel" open>
      <summary>Players</summary>
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
            {claimedPlayerId === player.id ? <small className="seat-mark">You</small> : null}
          </div>
        );
      })}
    </details>
  );
}

function MultiplayerStatusPanel() {
  const status = useMultiplayerStore((store) => store.status);
  const roomId = useMultiplayerStore((store) => store.roomId);
  const claimedPlayerId = useMultiplayerStore((store) => store.claimedPlayerId);
  const seats = useMultiplayerStore((store) => store.seats);
  const error = useMultiplayerStore((store) => store.error);
  const claimPlayer = useMultiplayerStore((store) => store.claimPlayer);
  const disconnect = useMultiplayerStore((store) => store.disconnect);
  const clearError = useMultiplayerStore((store) => store.clearError);
  const players = useGameStore((store) => store.state.players);
  const claimedPlayer = players.find((player) => player.id === claimedPlayerId);
  const claimedSeatCount = players.filter((player) => Boolean(seats[player.id])).length;
  const [copied, setCopied] = useState(false);

  const copyRoom = async () => {
    if (!roomId) return;
    const url = new URL(window.location.href);
    url.searchParams.set("room", roomId);
    const copyWithInput = () => {
      const input = document.createElement("textarea");
      input.value = url.toString();
      document.body.append(input);
      input.select();
      document.execCommand("copy");
      input.remove();
    };
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url.toString());
      } catch {
        copyWithInput();
      }
    } else {
      copyWithInput();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <section className="multiplayer-status">
      <div>
        <strong>{status === "connected" ? "Multiplayer connected" : "Multiplayer"}</strong>
        {roomId ? <span>Room {roomId}</span> : null}
        {claimedPlayer ? <span>You control {claimedPlayer.name}</span> : status === "connected" ? <span>Claim a player seat</span> : <span>Offline</span>}
        {status === "connected" ? <span>{claimedSeatCount} of {players.length} seats claimed</span> : null}
      </div>
      {status === "connected" ? (
        <div className="multiplayer-actions">
          <button type="button" disabled={!roomId} onClick={() => void copyRoom()}>
            {copied ? "Copied" : "Copy room"}
          </button>
          <button type="button" onClick={disconnect}>
            Disconnect
          </button>
        </div>
      ) : null}
      {status === "connected" ? (
        <div className="seat-claim-list">
          {players.map((player) => {
            const occupant = seats[player.id];
            const isMine = player.id === claimedPlayerId;
            return (
              <button type="button" disabled={(Boolean(occupant) && !isMine) || player.bankrupt} className={isMine ? "active" : ""} key={player.id} onClick={() => claimPlayer(player.id, player.name)}>
                {isMine ? `${player.name} (you)` : occupant ? `${player.name} (taken)` : player.name}
              </button>
            );
          })}
        </div>
      ) : null}
      {error ? (
        <button type="button" className="theme-error" onClick={clearError}>
          {error}
        </button>
      ) : null}
    </section>
  );
}

function TradePanel() {
  const state = useGameStore((store) => store.state);
  const trade = useGameStore((store) => store.trade);
  const theme = useThemeStore((store) => store.theme);
  const current = state.players[state.currentTurn];
  const targets = state.players.filter((player) => player.id !== current?.id && !player.bankrupt);
  const [targetPlayerId, setTargetPlayerId] = useState(targets[0]?.id ?? "");
  const [offerMoney, setOfferMoney] = useState(0);
  const [requestMoney, setRequestMoney] = useState(0);
  const [offerPropertyIds, setOfferPropertyIds] = useState<TileId[]>([]);
  const [requestPropertyIds, setRequestPropertyIds] = useState<TileId[]>([]);

  useEffect(() => {
    if (!targets.some((target) => target.id === targetPlayerId)) {
      setTargetPlayerId(targets[0]?.id ?? "");
      setRequestPropertyIds([]);
    }
  }, [targetPlayerId, targets]);

  if (!current || targets.length === 0) return null;

  const target = targets.find((player) => player.id === targetPlayerId) ?? targets[0];
  const tradeableFor = (player: Player) =>
    player.ownedPropertyIds
      .map((tileId) => tileById(tileId))
      .filter((tile): tile is OwnableTile => isOwnable(tile) && state.properties[tile.id].houses === 0);

  const toggleTile = (tileId: TileId, selected: TileId[], setSelected: (next: TileId[]) => void) => {
    setSelected(selected.includes(tileId) ? selected.filter((id) => id !== tileId) : [...selected, tileId]);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    trade({
      targetPlayerId: target.id,
      offerMoney,
      requestMoney,
      offerPropertyIds,
      requestPropertyIds,
    });
    setOfferMoney(0);
    setRequestMoney(0);
    setOfferPropertyIds([]);
    setRequestPropertyIds([]);
  };

  return (
    <aside className="panel utility-panel">
      <div>
        <p className="eyebrow">Trade</p>
        <h2>Deal Desk</h2>
      </div>
      <form className="compact-form" onSubmit={submit}>
        <label>
          With
          <select value={target.id} onChange={(event) => setTargetPlayerId(event.target.value)}>
            {targets.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
        </label>
        <div className="two-field-grid">
          <label>
            Give $
            <input min="0" type="number" value={offerMoney} onChange={(event) => setOfferMoney(Number(event.target.value))} />
          </label>
          <label>
            Get $
            <input min="0" type="number" value={requestMoney} onChange={(event) => setRequestMoney(Number(event.target.value))} />
          </label>
        </div>
        <TradePropertyPicker
          title={`${current.name} gives`}
          tiles={tradeableFor(current)}
          selected={offerPropertyIds}
          onToggle={(tileId) => toggleTile(tileId, offerPropertyIds, setOfferPropertyIds)}
          theme={theme}
        />
        <TradePropertyPicker
          title={`${target.name} gives`}
          tiles={tradeableFor(target)}
          selected={requestPropertyIds}
          onToggle={(tileId) => toggleTile(tileId, requestPropertyIds, setRequestPropertyIds)}
          theme={theme}
        />
        <button type="submit" className="primary">
          Complete trade
        </button>
      </form>
    </aside>
  );
}

function TradePropertyPicker({
  title,
  tiles,
  selected,
  onToggle,
  theme,
}: {
  title: string;
  tiles: OwnableTile[];
  selected: TileId[];
  onToggle: (tileId: TileId) => void;
  theme: typeof CLASSIC_THEME;
}) {
  return (
    <div className="trade-picker">
      <strong>{title}</strong>
      {tiles.length ? (
        tiles.map((tile) => (
          <label key={tile.id}>
            <input type="checkbox" checked={selected.includes(tile.id)} onChange={() => onToggle(tile.id)} />
            {getTileLabel(theme, tile)}
          </label>
        ))
      ) : (
        <p>No clear deeds.</p>
      )}
    </div>
  );
}

function SettingsPanel() {
  const settings = useGameStore((store) => store.state.settings);
  const updateSettings = useGameStore((store) => store.updateSettings);
  const [draft, setDraft] = useState<GameSettings>(settings);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    updateSettings(draft);
  };

  return (
    <aside className="panel utility-panel">
      <div>
        <p className="eyebrow">Rules</p>
        <h2>Settings</h2>
      </div>
      <form className="compact-form" onSubmit={submit}>
        <label className="check-label">
          <input
            type="checkbox"
            checked={draft.freeParkingJackpot}
            onChange={(event) => setDraft({ ...draft, freeParkingJackpot: event.target.checked })}
          />
          Rest Stop jackpot
        </label>
        <div className="two-field-grid">
          <label>
            Start $
            <input min="1" type="number" value={draft.startingMoney} onChange={(event) => setDraft({ ...draft, startingMoney: Number(event.target.value) })} />
          </label>
          <label>
            GO $
            <input min="0" type="number" value={draft.salary} onChange={(event) => setDraft({ ...draft, salary: Number(event.target.value) })} />
          </label>
          <label>
            Bail $
            <input min="0" type="number" value={draft.bailAmount} onChange={(event) => setDraft({ ...draft, bailAmount: Number(event.target.value) })} />
          </label>
          <label>
            Holding turns
            <input min="1" type="number" value={draft.maxJailTurns} onChange={(event) => setDraft({ ...draft, maxJailTurns: Number(event.target.value) })} />
          </label>
        </div>
        <button type="submit">Apply settings</button>
      </form>
    </aside>
  );
}

function GameFilesPanel() {
  const state = useGameStore((store) => store.state);
  const loadSnapshotFile = useGameStore((store) => store.loadSnapshotFile);

  const downloadSnapshot = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `themepoly-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="panel utility-panel">
      <section className="file-tools">
        <div>
          <p className="eyebrow">Game</p>
          <h2>Save & Multiplayer</h2>
        </div>
        <div className="button-row">
          <button type="button" onClick={downloadSnapshot}>
            Save game
          </button>
          <label className="file-button">
            Load game
            <input
              accept="application/json,.json"
              type="file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void loadSnapshotFile(file);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </section>
      <MultiplayerStatusPanel />
    </aside>
  );
}

function ThemesPanel() {
  const theme = useThemeStore((store) => store.theme);
  const themeError = useThemeStore((store) => store.error);
  const themeSourceFile = useThemeStore((store) => store.sourceFile);
  const savedThemes = useThemeStore((store) => store.savedThemes);
  const loadThemeFile = useThemeStore((store) => store.loadThemeFile);
  const loadThemeUrl = useThemeStore((store) => store.loadThemeUrl);
  const selectSavedTheme = useThemeStore((store) => store.selectSavedTheme);
  const deleteSavedTheme = useThemeStore((store) => store.deleteSavedTheme);
  const resetTheme = useThemeStore((store) => store.resetTheme);
  const clearThemeError = useThemeStore((store) => store.clearError);
  const [loadingThemeId, setLoadingThemeId] = useState<string | null>(null);

  const loadSampleTheme = async (sample: (typeof sampleThemes)[number]) => {
    setLoadingThemeId(sample.id);
    await loadThemeUrl(sample.file, `${sample.id}.zip`);
    setLoadingThemeId(null);
  };

  const downloadTheme = () => {
    const source = themeSourceFile ?? new File([JSON.stringify(theme, null, 2)], `${theme.id || "classic"}-theme.json`, { type: "application/json" });
    const url = URL.createObjectURL(source);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = source.name || `${theme.id || "classic"}-theme.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="panel utility-panel">
      <div>
        <p className="eyebrow">Themes</p>
        <h2>Theme Library</h2>
      </div>
      <div className="button-row">
        <label className="file-button">
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
        <button type="button" className="file-button" onClick={downloadTheme}>
          Download theme
        </button>
      </div>
      <div className="default-theme-row" aria-label="Default themes">
        <button type="button" className={theme.id === "classic" ? "active" : ""} disabled={theme.id === "classic"} onClick={resetTheme}>
          Classic
        </button>
        {sampleThemes.map((sample) => (
          <button
            type="button"
            className={theme.id === sample.id ? "active" : ""}
            disabled={loadingThemeId !== null || theme.id === sample.id}
            key={sample.file}
            onClick={() => void loadSampleTheme(sample)}
          >
            {loadingThemeId === sample.id ? "Loading" : sample.name}
          </button>
        ))}
      </div>
      <div className="theme-library" aria-label="Saved themes">
        {savedThemes.map((savedTheme) => (
          sampleThemes.some((sample) => sample.id === savedTheme.id) ? null :
          <div className={`theme-library-row ${theme.id === savedTheme.id ? "active" : ""}`} key={savedTheme.id}>
            <button type="button" disabled={loadingThemeId !== null || theme.id === savedTheme.id} onClick={() => void selectSavedTheme(savedTheme.id)}>
              {savedTheme.name}
            </button>
            <button type="button" aria-label={`Remove ${savedTheme.name}`} onClick={() => void deleteSavedTheme(savedTheme.id)}>
              Remove
            </button>
          </div>
        ))}
      </div>
      {themeError ? (
        <button type="button" className="theme-error" onClick={clearThemeError}>
          {themeError}
        </button>
      ) : null}
    </aside>
  );
}

function UtilityTabs() {
  const [activeTab, setActiveTab] = useState<"trade" | "settings" | "save" | "themes">("trade");

  return (
    <details className="utility-tabs collapsible-panel" open>
      <summary>Tools</summary>
      <div className="tab-list" role="tablist" aria-label="Game utilities">
        <button type="button" className={activeTab === "trade" ? "active" : ""} onClick={() => setActiveTab("trade")}>
          Trade
        </button>
        <button type="button" className={activeTab === "settings" ? "active" : ""} onClick={() => setActiveTab("settings")}>
          Rules
        </button>
        <button type="button" className={activeTab === "save" ? "active" : ""} onClick={() => setActiveTab("save")}>
          Game
        </button>
        <button type="button" className={activeTab === "themes" ? "active" : ""} onClick={() => setActiveTab("themes")}>
          Themes
        </button>
      </div>
      <div className="tab-panel">
        {activeTab === "trade" ? <TradePanel /> : null}
        {activeTab === "settings" ? <SettingsPanel /> : null}
        {activeTab === "save" ? <GameFilesPanel /> : null}
        {activeTab === "themes" ? <ThemesPanel /> : null}
      </div>
    </details>
  );
}

function ThemeName() {
  const theme = useThemeStore((store) => store.theme);
  return <span className="theme-name">{theme.name}</span>;
}

function LogPanel() {
  const log = useGameStore((store) => store.state.log);
  return (
    <details className="log-panel collapsible-panel">
      <summary>Game log</summary>
      <ol>
        {log.map((entry) => (
          <li key={entry.id}>{entry.message}</li>
        ))}
      </ol>
    </details>
  );
}

export default function App() {
  const state = useGameStore((store) => store.state);
  const theme = useThemeStore((store) => store.theme);
  const initializeThemeLibrary = useThemeStore((store) => store.initializeThemeLibrary);
  const winner = state.winnerId ? state.players.find((player) => player.id === state.winnerId) : null;

  useEffect(() => {
    void initializeThemeLibrary();
  }, [initializeThemeLibrary]);

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
          <h1>Themepoly V1</h1>
        </div>
        <div className="bank-pill">Rest Stop ${state.bank.freeParkingPot}</div>
        <ThemeName />
      </header>
      {winner ? <div className="winner-banner">{winner.name} wins.</div> : null}
      <div className="game-layout">
        <div className="left-panels">
          <PlayersPanel />
          <LogPanel />
        </div>
        <Board />
        <div className="right-panels">
          <TurnControls />
          <UtilityTabs />
        </div>
      </div>
    </main>
  );
}
