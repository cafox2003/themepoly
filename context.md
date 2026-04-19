# Themepoly Project Context

## 1. Current Status

Themepoly is a React + TypeScript property-trading board game with a working v1 pass-and-play game and a v1 theme system.

The app currently supports:

- Frontend-only local play on one device.
- A deterministic, framework-free game engine in `src/engine`.
- Zustand stores for game state and active theme state.
- A fixed 40-space property-trading board driven by canonical tile IDs.
- Theme zip upload through the Themes utility tab.
- One-click loading for bundled sample themes.
- Locally persisted theme library using browser storage after a theme is loaded.
- Theme-controlled labels, colors, board background, token images, and per-space transparent images.
- Deploy-safe sample theme zips in `public/themes`.
- Additional theme source packages in `themes/source`.
- Basic dice and token movement animations.
- Responsive desktop/tablet/mobile board layout.
- Engine test coverage through Vitest.

The dev server is normally run with:

```bash
npm run dev
```

The project verification commands are:

```bash
npm test
npm run build
```

## 2. Architecture

### 2.1 Game Engine

Location:

- `src/engine/types.ts`
- `src/engine/board.ts`
- `src/engine/state.ts`
- `src/engine/cards.ts`
- `src/engine/engine.ts`

The engine is pure TypeScript with no React dependency. It is designed to be shared with a future authoritative server.

Engine principles:

- The whole game is represented by one serializable `GameState`.
- Gameplay is processed through high-level `GameAction` objects.
- Randomness is injected from the outside. The engine does not roll dice itself.
- Board position is index-based, using a fixed 40-space board.
- Every board space has a stable canonical ID defined in `src/engine/types.ts`.
- Theme data changes presentation only. It does not change gameplay logic.

### 2.2 Client

Primary files:

- `src/App.tsx`
- `src/styles.css`
- `src/store/gameStore.ts`
- `src/theme/themeStore.ts`
- `src/theme/themeLoader.ts`
- `src/theme/themeUtils.ts`

The React UI renders only from current game state and active theme state.

The client currently handles:

- Game setup.
- Board rendering.
- Player summaries.
- Turn controls.
- Buy/build/sell management.
- Mortgage and unmortgage management.
- Basic player-to-player trades.
- Rule settings for starting money, GO salary, bail, holding turns, and Rest Stop jackpot.
- Save/load game snapshots as JSON files.
- Game log.
- Theme upload.
- Reset to the default theme.
- Theme selection/import/export through a dedicated Themes utility tab.
- Local saved-theme selection for previously loaded theme zips.

### 2.3 Future Server

The server does not exist yet.

The intended future architecture is:

1. Client sends actions over WebSocket.
2. Server validates the action.
3. Server injects random values, such as dice.
4. Server applies the shared engine.
5. Server broadcasts the full updated `GameState` snapshot.

No client-side prediction is planned for the first multiplayer version.

## 3. Implemented Gameplay

The current v1 engine supports:

- Starting a local game.
- Dice rolling with externally supplied dice.
- Player movement.
- Salary when passing or landing on GO where rules/card action specify it.
- Property purchasing.
- Rent payments.
- Complete color-group rent bonuses.
- Railroad-style transport rent scaling by owned transport count.
- Utility rent based on dice total and owned utility count.
- Holding-space flow.
- Bail payment.
- Get Out of Holding cards.
- Forced bail after failed holding rolls.
- Three consecutive doubles sends the player to holding.
- Opportunity and Town Fund cards using a fixed safe action vocabulary.
- Houses and hotels.
- Even building rules within a color group.
- Selling buildings.
- Selling undeveloped properties back to the bank.
- Mortgaging and unmortgaging undeveloped properties.
- Basic player-to-player trades involving money and undeveloped or mortgaged deeds.
- Bankruptcy and winner detection, including transferring assets to a rent creditor or releasing assets to the bank.
- Optional Rest Stop jackpot rule toggle and settings UI.
- Save/load JSON game snapshots.

Auctions are intentionally excluded.

## 4. Current Limitations

Known gameplay gaps:

- Bankruptcy handling does not yet include a full liquidation/payment-choice flow before bankruptcy.
- Mortgage transfers do not yet charge immediate mortgage interest to a new owner after trades or bankruptcy.
- Trading is an immediate local agreement flow; there is no offer/accept negotiation or hidden confirmation step.
- Card decks are expanded placeholder decks, not full official-style deck coverage.
- House/hotel rules exist, and the UI exposes basic build/sell controls, but deed/detail modals are still absent.
- No multiplayer.
- No server.

## 5. Theme System v1

### 5.1 Theme Philosophy

Themes are pure data. They must not alter gameplay logic.

Themes can control:

- Board-space labels.
- Property names.
- Board-space images.
- Property-space images.
- Token labels, colors, and images.
- Board center/background image.
- UI and group colors.
- Theme-specific card display text.

Themes cannot:

- Add arbitrary scripts.
- Change board topology.
- Change property prices/rents.
- Change rule behavior.
- Execute custom code.

### 5.2 Theme Package Format

Themes are uploaded as `.zip` files.

Required root file:

```text
theme.json
```

Typical package:

```text
theme.zip
  theme.json
  assets/
    board/
      background.png
    spaces/
      GO.png
      BOARDWALK.png
      ...
    tokens/
      token.png
```

The loader validates:

- Zip size is at most 100 MB.
- `theme.json` exists at the root.
- `theme.json.version` is `1.0`.
- Board IDs and property IDs are canonical.
- Card action types come from the fixed vocabulary.
- Asset paths remain inside the zip.
- Image assets are PNG, JPG, or JPEG.
- Referenced assets exist.

Invalid themes are rejected entirely and the active theme remains unchanged.

### 5.3 Theme JSON Shape

Current supported shape:

```json
{
  "version": "1.0",
  "id": "example-theme",
  "name": "Example Theme",
  "images": {
    "boardBackground": "assets/board/background.png"
  },
  "board": {
    "GO": {
      "label": "Start",
      "image": "assets/spaces/GO.png"
    }
  },
  "properties": {
    "BOARDWALK": {
      "name": "Final Fortress",
      "image": "assets/spaces/BOARDWALK.png"
    }
  },
  "cards": {
    "chance": [
      {
        "text": "Advance to Final Fortress.",
        "action": {
          "type": "move_to",
          "target": "BOARDWALK"
        }
      }
    ],
    "communityChest": []
  },
  "tokens": [
    {
      "id": "car",
      "label": "Token",
      "image": "assets/tokens/token.png",
      "color": "#d4af37"
    }
  ],
  "colors": {
    "APP_BACKGROUND": "#eef2e8",
    "BOARD_BACKGROUND": "#c9dec1",
    "BOARD_CENTER": "#c9dec1",
    "TILE_BACKGROUND": "#fafbf6",
    "PANEL_BACKGROUND": "#ffffff",
    "TEXT": "#17201a",
    "MUTED_TEXT": "#5d6657",
    "ACCENT": "#15615a",
    "ACCENT_CONTRAST": "#ffffff",
    "HIGHLIGHT": "#f7d038",
    "BROWN": "#7b4b2a",
    "LIGHT_BLUE": "#8fd4ef",
    "PINK": "#d84a9a",
    "ORANGE": "#f28c28",
    "RED": "#d62828",
    "YELLOW": "#f7d038",
    "GREEN": "#1f8f4d",
    "DARK_BLUE": "#23458f"
  }
}
```

### 5.4 Per-Space Images

Each board or property entry can include an `image` path.

The UI renders space images as a separate image layer inside each tile. Transparent PNGs are supported. If a transparent image is used, the tile background and color band remain visible underneath it.

## 6. Included Themes

Deploy-safe theme archives live in:

- `public/themes/noir-city.zip`
- `public/themes/space-art-demo.zip`

Theme source folders live in:

- `themes/source/noir-city`
- `themes/source/space-art-demo`

Theme archive build outputs live in:

- `themes/archives/noir-city.zip`
- `themes/archives/space-art-demo.zip`

Local-only experimental themes can exist on disk, but franchise-specific sources and archives are ignored by Git and should not be committed or deployed.

Asset generation script:

- `scripts/generate-theme-assets.sh`

This script generates placeholder board backgrounds, token images, and transparent per-space images for the deploy-safe themes.

## 7. Testing

Engine tests live in:

- `src/engine/engine.test.ts`

Current test coverage includes:

- Game initialization and serializable state.
- Dice movement and GO salary.
- Buying unowned properties.
- Base rent.
- Complete color-group rent.
- Transport rent.
- Utility rent.
- Doubles and third-doubles holding behavior.
- Bail.
- Get Out of Holding card use.
- Forced payment after three failed holding rolls.
- Opportunity and Town Fund card actions.
- Even house building.
- House rent.
- Selling buildings.
- Selling undeveloped properties.
- Mortgaging and unmortgaging.
- Player-to-player trades.
- Bankruptcy asset transfer and winner detection.
- Rule settings updates.
- Expanded card deck size.

Run tests with:

```bash
npm test
```

## 8. What Still Needs To Be Done

Near-term gameplay:

- Add a richer pre-bankruptcy liquidation flow for choosing sales, mortgages, and payments before failure.
- Add trade offer/accept confirmation if multiplayer or private-device play is introduced.
- Add deed/detail modals for rent ladders, mortgage terms, owner history, and house/hotel state.
- Add more nuanced card actions, such as nearest transport/utility movement and repair fees per building.

Near-term theme system:

- Add a theme preview/import confirmation screen.
- Add saved-theme storage management polish for very large theme libraries.
- Add richer validation messages with exact failing file paths.
- Add optional card artwork rendering.
- Add optional property deed/card artwork rendering.
- Add a theme authoring guide.
- Add tests for theme zip validation.

Future multiplayer:

- Add Node.js server.
- Add WebSocket action protocol.
- Move randomness to the server.
- Make server authoritative.
- Broadcast full `GameState` snapshots.
- Add reconnect flow from snapshot.

Future polish:

- Board interaction refinements for small mobile screens.
- Deed/detail modals.
- Accessibility pass.
- Visual regression checks for themes.
