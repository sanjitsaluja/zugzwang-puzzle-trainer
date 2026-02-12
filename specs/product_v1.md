# Zugzwang — Chess Puzzle Trainer

## Overview

Zugzwang is a web-based chess puzzle trainer featuring 4,462 puzzles from the Susan Polgar collection. Users progress linearly through puzzles, playing out full checkmate sequences against Stockfish's best defense.

---

## Core Experience

### Puzzle Flow

1. User loads puzzle (FEN position displayed on board)
2. Prompt shows "White to move" / "Black to move" and puzzle type ("Mate in 2")
3. User makes a move
4. **If correct**: Stockfish plays best defense, user continues until checkmate
5. **If incorrect**: Puzzle marked as **failed**, but user can continue playing to understand the position
6. **On checkmate**: Puzzle complete; subtle success indicator shown only if solved correctly
7. User clicks "Next" to advance

### Validation Logic

- **Engine enabled**: Stockfish analyzes position to verify user's move leads to mate in required moves
- **Engine disabled**: Validate against stored solution moves from JSON (first move only, then auto-play sequence)

### Feedback Philosophy

- Minimal, non-intrusive
- Success: subtle visual confirmation (e.g., brief green glow, soft sound)
- Failure: no explicit "wrong" message—puzzle silently marked failed, user discovers why through continued play

---

## Data Source

**Repository**: https://github.com/denialromeo/4462-chess-problems

**JSON structure**:
```json
{
  "problemid": 1,
  "first": "White to Move",
  "type": "Mate in One",
  "fen": "3q1rk1/5pbp/5Qp1/8/8/2B5/5PPP/6K1 w - - 0 1",
  "moves": "f6-g7"
}
```

**Fields**:
- `problemid`: Sequential ID (1–4462)
- `first`: Who moves first
- `type`: Puzzle type (Mate in One, Mate in Two, etc.)
- `fen`: Board position in FEN notation
- `moves`: Solution moves in `from-to` format (e.g., `f6-g7`, `f7-f8q` for promotion)

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | React 18+ | UI components |
| Build | Vite | Fast dev/build |
| Language | TypeScript | Type safety |
| Board UI | @lichess-org/chessground | Chess board rendering, drag/drop, touch |
| Chess Logic | chess.js | Move validation, FEN parsing, game state |
| Engine | stockfish (npm) | WASM Stockfish for move validation & opponent play |
| Hosting | Vercel | Free static hosting |
| Persistence | localStorage | Progress, stats |

### Key Libraries

**@lichess-org/chessground**
- Lichess's production chess UI
- 10KB gzipped, no dependencies
- Mobile/touch ready
- GPL-3.0 license

**chess.js**
- Move generation and validation
- FEN/PGN parsing
- Game state management (check, checkmate, draw)

**stockfish (npm)**
- Chess.com's WASM build
- Use "lite" variant (~7MB) for mobile performance
- Runs in Web Worker

---

## Persistence (localStorage)

### Schema

```typescript
interface PuzzleState {
  status: 'unattempted' | 'success' | 'fail';
  timeMs: number | null;      // Time to solve (ms)
  attempts: number;           // Number of attempts
}

interface AppState {
  currentPuzzleId: number;    // 1-indexed
  puzzles: Record<number, PuzzleState>;
  settings: {
    engineEnabled: boolean;
  };
}
```

### Derived Stats (computed on read)

- Total puzzles attempted
- Total solved correctly
- Success rate (%)
- Average solve time
- Current puzzle position (e.g., "42 / 4462")

---

## UI Components

### Main View (Single Page)

See images in the folder
- @desktop.png
- @mobile.png

Various states (feedback)
- @states_1.png
- @states_2.png

### Components

1. **PuzzleInfo**
   - Puzzle number + total ("42 / 4462")
   - Puzzle type ("Mate in 2")
   - Who moves ("White to move")

2. **ChessBoard**
   - Chessground instance
   - Auto-orients based on `first` field (white at bottom if white to move)
   - Legal move highlighting
   - Drag/drop + click-click move input

3. **Timer**
   - Starts when puzzle loads
   - Stops on checkmate
   - Displays MM:SS format

4. **NextButton**
   - Hidden during active puzzle
   - Appears after checkmate
   - Advances to next puzzle

5. **SettingsModal**
   - Engine on/off toggle
   - (Future: board theme, sound, etc.)

6. **StatsView**
   - Accessible via icon/link
   - Shows aggregate statistics
   - Could be modal or slide-out panel

### Responsive Behavior

- **Desktop**: Board ~500-600px, info beside or above
- **Tablet**: Board fills width with padding, info above
- **Mobile**: Board fills width, info stacked above, controls below

---

## Stockfish Integration

### Initialization

```typescript
// Load engine in Web Worker
const stockfish = new Worker('stockfish.js');

stockfish.onmessage = (e) => {
  // Parse UCI responses
};

stockfish.postMessage('uci');
stockfish.postMessage('isready');
```

### Move Validation Flow

1. User makes move
2. Apply move to chess.js board
3. Send position to Stockfish: `position fen <new_fen>`
4. Request analysis: `go depth 15`
5. Parse `bestmove` and `score mate N` from output
6. If mate in ≤ required moves exists → move is correct
7. If no forced mate → move is incorrect (mark puzzle failed)

### Opponent Response

1. After valid user move (not checkmate)
2. Stockfish already computed best defense
3. Apply best move to board
4. Animate piece movement
5. User's turn again

### Fallback (Engine Disabled)

- Validate first move against `moves` field in JSON
- Auto-play opponent responses from solution
- Less flexible but works offline/low-power devices

---

## Move Format Conversion

The JSON uses `from-to` format (e.g., `f6-g7`). Need to convert:

```typescript
function parseMove(move: string): { from: string; to: string; promotion?: string } {
  // "f6-g7" → { from: "f6", to: "g7" }
  // "f7-f8q" → { from: "f7", to: "f8", promotion: "q" }
  const [from, toRaw] = move.split('-');
  const promotion = toRaw.length > 2 ? toRaw[2] : undefined;
  const to = toRaw.slice(0, 2);
  return { from, to, promotion };
}
```

---

## State Machine

```
┌──────────────┐
│   LOADING    │ ← Initial state, loading puzzle data
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   PLAYING    │ ← User's turn, timer running
└──────┬───────┘
       │ User moves
       ▼
┌──────────────┐
│  VALIDATING  │ ← Engine analyzing move
└──────┬───────┘
       │
       ├─── Valid + Checkmate ───▶ COMPLETE (success)
       │
       ├─── Valid + Not Mate ───▶ OPPONENT_TURN
       │
       └─── Invalid ───▶ PLAYING (puzzle marked failed)

┌──────────────┐
│OPPONENT_TURN │ ← Stockfish plays, animating
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   PLAYING    │
└──────────────┘

┌──────────────┐
│   COMPLETE   │ ← Checkmate delivered
└──────┬───────┘
       │ User clicks Next
       ▼
┌──────────────┐
│   LOADING    │ ← Load next puzzle
└──────────────┘
```

---

## File Structure

```
zugzwang/
├── public/
│   └── problems.json          # Puzzle data (fetched at runtime or bundled)
├── src/
│   ├── main.tsx               # Entry point
│   ├── App.tsx                # Main app component
│   ├── components/
│   │   ├── Board.tsx          # Chessground wrapper
│   │   ├── PuzzleInfo.tsx     # Puzzle metadata display
│   │   ├── Timer.tsx          # Solve timer
│   │   ├── NextButton.tsx     # Navigation
│   │   ├── Settings.tsx       # Settings modal
│   │   └── Stats.tsx          # Statistics view
│   ├── hooks/
│   │   ├── useStockfish.ts    # Engine management
│   │   ├── usePuzzle.ts       # Puzzle state management
│   │   ├── useTimer.ts        # Timer logic
│   │   └── useLocalStorage.ts # Persistence
│   ├── lib/
│   │   ├── chess.ts           # chess.js wrapper utilities
│   │   ├── stockfish.ts       # Stockfish UCI communication
│   │   └── puzzles.ts         # Puzzle data loading/parsing
│   ├── types/
│   │   └── index.ts           # TypeScript interfaces
│   └── styles/
│       ├── chessground.css    # Chessground base styles
│       └── app.css            # App styles
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## Future Considerations (Out of Scope)

- User accounts / cloud sync
- Leaderboards
- Spaced repetition for failed puzzles
- Puzzle filtering by type/difficulty
- Custom puzzle sets
- Board themes / piece sets
- Sound effects
- Keyboard shortcuts
- Share puzzle links

---

## Open Questions

1. **Bundle vs fetch puzzles**: Include `problems.json` in bundle (~500KB) or fetch at runtime?
   - Recommendation: Bundle for offline capability and faster initial load

2. **Stockfish depth**: What analysis depth for validation?
   - Recommendation: depth 15 (fast enough, accurate for mate puzzles)

3. **Success animation**: What exactly? Options:
   - Brief green border glow
   - Checkmark icon
   - Confetti (maybe too much)
   - Subtle sound

---

## License

GPL-3.0 (required by Chessground dependency)
