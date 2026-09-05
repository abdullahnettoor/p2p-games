# 01: Build the Game Shell and the Catalog Drawer

Status: ready-for-human

## What to build

Separate platform chrome from Game surfaces structurally, and replace the marketing landing page with an icon drawer.

## Acceptance criteria

- [x] `src/app` uses route groups: `(platform)` carries the header, footer, and dark identity; `(game)` renders a bare full-bleed shell with no platform chrome.
- [x] A Game route cannot inherit platform chrome by construction, not by conditional suppression.
- [x] `src/app/globals.css` no longer forces a dark `body` background onto Game routes.
- [x] The Catalog is a top-aligned icon drawer, four per row, fitting one screen without scrolling.
- [x] Each Game is one icon plus a short label, and tapping it opens that Game. No per-Game action buttons appear on the Catalog.
- [x] Game icons are hand-drawn SVGs carrying each Game's own material rather than generic library glyphs.
- [x] Coming-soon Games remain in the grid, dimmed with a small badge.
- [x] The hero, platform features bar, and `P2P Ready` badge are removed; a slim masthead and one footer line remain.
- [x] TicTacToe is not listed in the Catalog and its route moves under the game route group.
- [x] `manifest.ts`, icons, and `themeColor` are added.
- [x] A `viewport` export sets `viewport-fit=cover` so `env(safe-area-inset-*)` becomes usable.
- [x] No service worker, install prompt, `user-scalable=no`, or `maximum-scale` is added.
- [x] Opening a Game plays one short transition expanding the tapped icon's material into the Shell, cut instantly under `prefers-reduced-motion`.
- [x] Bingo still renders and plays after the move, now full-bleed.
- [x] Component tests cover drawer rendering, coming-soon state, and navigation into a Game.

## Notes

Runs in parallel with issue 02; write scopes are disjoint (`src/app/**` here, `src/games/bingo/components/**` there).

Tailwind `content` globs already match `src/app/**`, so route groups need no config change.
