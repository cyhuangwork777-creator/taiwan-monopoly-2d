# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**台灣大富翁 (Taiwan Monopoly)** — A 2D multiplayer board game built with Phaser 4.1.0, TypeScript, and Vite.

Core gameplay: 4 characters move around a 32-tile board, buy/upgrade properties, pay rent, draw chance/fate cards, manage bank deposits/loans, and collect special cards. Game ends when only one player remains solvent.

## Development Commands

```bash
# Start Vite dev server (runs on http://localhost:3000 or next available port)
npm run dev

# Type check (no emit)
npx tsc --noEmit

# Build production bundle
npm run build

# Preview production build
npm run preview
```

## Architecture Overview

The codebase separates concerns into **core systems** and **UI/rendering**:

### Core Systems (`src/core/`)
- **GameState** — Single source of truth: players, properties, currentRound, roadblocks, events log
- **TurnManager** — Dice rolling, player movement, doubles tracking
- **PropertySystem** — Buy, upgrade, sell properties; calculate rent with full-set bonuses
- **BankSystem** — Deposits, loans, interest, card purchases/sales
- **CardSystem** — Chance/fate card effects, special card usage (demolish, tax audit, etc.)
- **AIController** — Decision logic for AI players across purchase, upgrade, card use, bank actions

### Game Loop (`src/scenes/GameScene.ts`)
1. **startPlayerTurn()** — Check if player can move; if AI, run `handleAITurn()`; else enable roll button
2. **onRollDice()** — Roll dice, animate movement, pass start check
3. **handleLanding()** — Based on tile type, trigger property/chance/fate/bank logic
4. **endCurrentTurn()** — Advance turn manager, disable buttons, repeat

### Key Design Patterns
- **Promise-based UI dialogs** — `BankDialog.show()`, `ActionMenu.showBuyPrompt()` return Promise that resolves when user confirms. Allows async/await in game loop.
- **Fast mode** — When `fastMode=true`, all dialogs skip and AI makes decisions instantly. Used for rapid testing and AI turns.
- **Game state serialization** — `window.gameAPI.saveGame()/loadGame()` for save-load and testing state injection.

## Game Mechanics

### Building Levels
- `BuildingLevel.EMPTY = 0` — No buildings
- `BuildingLevel.HOUSE_1 through HOUSE_3 = 1-3` — Houses
- `BuildingLevel.HOTEL = 4` — Hotel (terminal state)

**Rent Multiplier:** `RENT_MULTIPLIERS = { 0: 1, 1: 2, 2: 4, 3: 8, 4: 16 }`

**Full Set Bonus:** +50% rent if player owns all 4 properties in a tier

### Card System
- **Chance cards** (drawn at chance tiles) — Apply instant effects (move, money, draw special card, upgrade property)
- **Fate cards** (drawn at fate tiles) — Apply penalties/bonuses (earthquake downgrades building, repair costs, etc.)
- **Special cards** (held by players, used via UI) — Demolish, tax audit, toll-free, equalize money, place roadblock, etc.

### Bankruptcy
Triggered when `player.money < 0`:
1. Auto-sell cheapest properties until money ≥ 0
2. If still negative, mark `isBankrupt = true` (player eliminated)
3. Called after: rent payment, certain card effects, special card use

## Testing Strategy

### Fast Mode Testing (Token-Efficient)
- **Static verification first:** `npx tsc --noEmit` + code logic review before browser testing
- **JS injection for state:** Use `window.gameAPI.saveGame()` to verify game state after actions (don't rely only on visual inspection)
- **Fast mode unsuitable for UI dialogs** — Dialogs are skipped in fast mode, so test them separately with `fastMode=false` + `loadGame()` state injection
- **Batch operations:** Use `browser_batch` to combine multiple steps (navigate, click, verify) in one round trip

### Common Test Pattern
```javascript
// Inject game state to position player before bank
window.gameAPI.loadGame({
  players: [...],
  properties: [...],
  currentPlayerIndex: 0,
  ...
})

// Wait 1 sec (startPlayerTurn has 500ms setTimeout)
// Then trigger dice roll via API, not button click (button ref stale after restart)
await new Promise(r => setTimeout(r, 1000))
window.gameAPI.rollDice()
```

## Codebase Patterns

### Event Logging
All state changes go through `gameState.addEvent({ type, playerId, message, data })`. Events appear in game log and are persisted in saves.

### CardEffect vs Special Card
- **CardEffect** (chance/fate) — Triggered on landing, auto-applied, logged
- **Special Card** — Player-initiated, requires target selection (property, player, tile), manually consumed from hand

### Dialog Callbacks Pattern
```typescript
// Dialog returns Promise, callers await it
private showBankDialog(player: Player): Promise<void> {
  return new Promise<void>(resolve => {
    this.bankDialog.show(
      player,
      (amount) => { this.bankSystem.deposit(...); resolve() },
      ...
    )
  })
}
```

## Important Notes

### Scene Restart Gotchas (Phaser 4.1.0)
- `scene.restart()` does NOT recreate class instances; only calls `shutdown()` + `create()`
- Class field initializers (e.g., `private isProcessing: boolean = false`) only run at constructor, not on restart
- After `loadGame()` scene restart, explicitly reset flags in `create()` method

### Building Reduction Investigation (Completed)
Building counts only decrease via:
1. `effectDowngradeRandom()` — Fate card "地震災害"
2. `specialDemolish()` — Special card "拆除卡"

When AI/human uses cards, notifications must clearly state **card name + affected property/target** so players know why buildings changed. See GameScene `handleAITurn()` and `executeCardWithTarget()` for notification patterns.

## Git Workflow

- Feature branches: `git checkout -b feature/name` or `fix/name`
- Commit format: Type (fix/feat/docs), message, optional `Co-Authored-By`
- PR before merge to main; code review + test
- After merge: `git checkout main && git pull origin main`

## File Structure Overview

```
src/
  scenes/        GameScene (main loop), MenuScene, ResultScene, etc.
  core/          GameState, TurnManager, PropertySystem, BankSystem, CardSystem, AIController
  ui/            BankDialog, ActionMenu, CardPopup, Dice, PlayerPanel
  renderers/     BoardRenderer, BuildingRenderer, PlayerRenderer
  config/        gameConfig (constants), boardData (tile definitions), cardData (card definitions)
  types/         TypeScript interfaces (Player, Property, Card, etc.)
  audio/         SoundManager
```

