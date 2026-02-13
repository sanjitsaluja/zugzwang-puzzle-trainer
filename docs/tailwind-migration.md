# Tailwind Migration Playbook

## Rules

- Prefer reusable primitives from `src/components/ui` for shared visual patterns.
- Prefer semantic component classes from `@layer components` in `src/styles/theme.css`.
- Use Tailwind utility classes directly in component files only when the style is truly one-off.
- Use token-backed values only (`var(--token-name)`) for colors, spacing, radii, typography, and motion.
- Keep `src/styles/tokens.css` as the only place where literal color values are defined.
- Prefer semantic token names over one-off values.
- Raw arbitrary-value utility chains are a last resort and should be replaced with primitives or semantic classes.
- Preserve behavior/state logic in TSX using small semantic variant names.

## Token Sources

- Theme and design tokens: `src/styles/tokens.css`
- Tailwind/base layer and keyframes: `src/styles/theme.css`

## Dark Mode Contract

- Local storage key: `zugzwang.theme`
- Allowed values: `system`, `light`, `dark`
- Runtime behavior:
  - `system`: no `data-theme` attribute; follows `prefers-color-scheme`
  - `light` / `dark`: sets `data-theme` on `<html>`

## Conversion Pattern

- Replace old class selectors with primitive components and semantic class names.
- Extract reusable blocks into dedicated primitives (`Panel`, `Button`, `Label`, `MetricCard`).
- For state styles, map logic to small semantic variants (`success`, `danger`, `default`).
- If one-off utility classes are needed, keep them short and avoid token-heavy inline chains.

## Linting

- `npm run lint`: TypeScript + React linting
- `npm run lint:css`: stylelint for CSS files
- `npm run lint:tokens`: fails on color/px literals outside token files
- `npm run lint:all`: runs all checks
