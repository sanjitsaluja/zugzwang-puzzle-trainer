# Semantic Typography Role Map

This app now uses a two-layer typography system:

1. Primitive scales in `/Users/ssaluja/src/zugzwang/src/styles/tokens.css` (`--type-size-body`, `--type-size-heading`, `--type-size-display` plus rhythm tokens).
2. Semantic role aliases (`--type-role-*`) consumed by `/Users/ssaluja/src/zugzwang/src/styles/theme.css`.

The goal is to keep tuning centralized and prevent one-off typography drift across app surfaces.

## Consolidation Rules

- All UI copy resolves to three shared size tiers: `body`, `heading`, `display`.
- Timer text is not special-cased anymore; `--type-role-timer-size` maps to the shared `display` tier.
- Data/UI family split is removed for now (`--type-family-data` aliases to `--type-family-ui`) to keep the system simpler.

## Core Role Groups

| Role family | Representative tokens | Used by |
| --- | --- | --- |
| App shell | `--type-role-brand-*`, `--type-role-streak-*`, `--type-role-source-*` | Header logo/streak/source metadata |
| Controls | `--type-role-button-*`, `--type-role-action-nav-size`, `--type-role-keycap-*` | Buttons, action bar arrows, keyboard hints |
| Puzzle identity | `--type-role-puzzle-id-*`, `--type-role-puzzle-total-*`, `--type-role-puzzle-pill-*`, `--type-role-puzzle-meta-*`, `--type-role-puzzle-status-*` | Puzzle number, totals, objective pills, side/status copy |
| Timer + metrics | `--type-role-timer-*`, `--type-role-metric-size` | Timer display/label and compact metric cards |
| Menu/Stats headings | `--type-role-panel-title-*`, `--type-role-panel-section-title-*`, `--type-role-panel-section-subtitle-*` | Menu title, stats title, section headings/subtitles |
| Stats data emphasis | `--type-role-panel-quick-*`, `--type-role-panel-overall-*`, `--type-role-panel-speed-*`, `--type-role-panel-callout-*` | Quick cards, overall progress, speed cards, improvement callouts |
| Settings parity | `--type-role-panel-section-*`, `--type-role-settings-control-*`, `--type-role-settings-chip-*`, `--type-role-settings-slider-*`, `--type-role-settings-shell-*` | Settings section headers, control rows, chips, sliders, shell card |
| Supporting text | `--type-role-label-*`, `--type-role-panel-support-*`, `--type-role-move-*`, `--type-role-toast-size` | Labels, helper copy, move list, toasts |

## Stats + Settings Consistency

Comparable elements intentionally share role tokens:

- Section titles: `--type-role-panel-section-title-*`
- Section subtitles: `--type-role-panel-section-subtitle-*`
- Unified app text family: `--type-family-ui` / `--type-family-data`

This keeps hierarchy and rhythm aligned between stats and settings panels.

## Mobile Typography Overrides

Mobile tuning now lives in `/Users/ssaluja/src/zugzwang/src/styles/tokens.css` under `@media (width <= 64rem)` by overriding role tokens (not per-component literals), including:

- Brand/puzzle compact roles
- Panel title/icon roles

## Guardrails

- Run `npm run lint:tokens` to catch literal color/size/typography declarations outside token files.
- During review, reject new literal `font-size`, `font-weight`, `letter-spacing`, or `line-height` values in `/Users/ssaluja/src/zugzwang/src/styles/theme.css` unless the case is truly symbolic/icon-only.
