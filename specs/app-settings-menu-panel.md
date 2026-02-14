# Zugzwang Menu Panel — Product Spec

**Author:** Sanjit  
**Status:** Draft  
**Last updated:** 2026-02-14

---

## Overview

The menu panel is a full-screen overlay accessed from the main puzzle screen. It contains two views — **Stats** and **Settings** — switchable via a segmented control. The panel is the single entry point for all non-puzzle interaction: reviewing progress, configuring the board, and managing data.

---

## Entry & Exit

- A single menu button on the puzzle screen opens the panel.
- The panel opens with **Stats** selected by default.
- A close button (×) in the top-left returns to the puzzle screen.
- The puzzle timer pauses while the panel is open.
- On close, any changed settings apply immediately to the board. No "save" button — all changes are live.

---

## Segmented Control

- Two segments: **Stats** | **Settings**.
- A sliding indicator animates between segments on tap.
- The header title updates to match the active segment.
- Switching segments preserves scroll position within each tab (returning to Settings shows where you left off).

---

## Stats Tab

### Summary Cards

Three cards displayed in a horizontal row:

| Card | Value | Notes |
|------|-------|-------|
| **Solved** | Integer count | Total puzzles solved correctly (first attempt or via retry queue). |
| **To Retry** | Integer count | Puzzles currently in the retry queue. |
| **Streak** | Integer + 🔥 | Consecutive puzzles solved correctly without a miss. Resets to 0 on any incorrect attempt. |

### Sub-tabs

Two sub-tabs below the summary cards: **Retry Queue** and **Progress**.

#### Retry Queue

- Lists puzzles the user got wrong, ordered by when they were failed (most recent first).
- Each entry shows: puzzle number, puzzle type (e.g., "Mate in 2"), and date failed.
- Tapping an entry navigates directly to that puzzle and closes the panel.
- When the queue is empty, show an empty state: sparkle icon, "All caught up!", "No failed puzzles to retry."
- Puzzles leave the retry queue only when solved correctly.

#### Progress

- Shows completion bars broken down by puzzle category.
- Categories: **Overall**, **Mate in 1**, **Mate in 2**, **Mate in 3+** (derived from the Susan Polgar collection groupings).
- Each bar shows: label, fraction (e.g., "18 / 820"), a fill bar, and percentage for overall.
- Progress bars reflect first-solve counts only (retried puzzles that are now solved count toward progress).

---

## Settings Tab

All settings persist to local storage and apply immediately on change.

### Board Section

#### Piece Set
- Chip selector. Options: **cburnett** (default), **merida**, **alpha**, **staunty**.
- Only one can be active at a time.
- Changing the piece set swaps the CSS class on the chessground container. No reload required.

#### Board Theme
- Chip selector with color swatches. Options: **Brown** (default), **Blue**, **Green**, **Gray**.
- Each chip shows a two-square swatch previewing the light/dark square colors.
- Changing the board theme swaps the CSS class on the chessground container.

#### Coordinates
- Toggle (default: on).
- Controls `coordinates` config on chessground.
- Shows/hides rank and file labels (a–h, 1–8) on the board edges.

#### Show Legal Moves
- Toggle (default: on).
- Controls `movable.showDests` on chessground.
- When on, tapping/clicking a piece shows dot indicators on legal destination squares.

#### Highlight Last Move
- Toggle (default: on).
- Controls `highlight.lastMove` on chessground.
- When on, the origin and destination squares of the most recent move are highlighted.

#### Animation Speed
- Slider. Range: 0ms (off) to 500ms, in 50ms increments. Default: 200ms.
- Controls `animation.duration` on chessground. Setting to 0 disables animation (`animation.enabled = false`).
- Displays current value as a label (e.g., "200ms" or "Off").

### Puzzle Section

#### Timer
- Toggle (default: on).
- Controls visibility of the solve timer on the puzzle screen.
- When off, the timer is hidden but time is still tracked internally for stats purposes.

#### Sound Effects
- Toggle (default: on).
- Controls all app sounds: piece move, correct solve, incorrect attempt.
- When off, the app is fully silent.

### Data Section

#### Reset All Progress
- Destructive action button styled in red.
- On tap, shows a confirmation dialog: "Reset all progress? This cannot be undone."
- On confirm: clears all solve history, retry queue, streak, and progress. Returns puzzle index to #1.
- On cancel: no action.

---

## Buy Me a Coffee

- Appears below the Data section in the Settings tab.
- Card-style link with ☕ emoji, title ("Buy me a coffee"), subtitle ("Support Zugzwang's development"), and a chevron.
- Tapping opens the Buy Me a Coffee URL in the system browser.

---

## Persistence

- All settings are stored in `localStorage` under a single `zugzwang-settings` key as a JSON object.
- Stats and progress are stored separately under `zugzwang-progress`.
- On first launch (no stored data), all settings use their documented defaults.
- Settings are read on app init and applied to the chessground instance before the first puzzle renders.

---

## Edge Cases

- **Mid-puzzle setting changes:** If the user opens settings during a puzzle, changes board config, and returns, the current puzzle re-renders with new settings. Puzzle state (whose turn, position) is preserved.
- **Animation speed 0:** Pieces teleport. No transition frames.
- **Reset during active retry queue:** Clearing progress also empties the retry queue. The user is returned to puzzle #1.
- **Rapid tab switching:** Only the active panel is rendered. No race conditions between Stats data loading and Settings interactions.
