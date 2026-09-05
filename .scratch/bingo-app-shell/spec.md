# Feature Spec: Game Shell, Catalog Drawer, and App-Shaped Bingo

Status: ready-for-agent

## Problem

The paper redesign landed inside the Match but stopped there. Three structural problems remain.

**Platform chrome bleeds into the Game.** `src/app/layout.tsx` wraps every route in a dark header, a constrained `<main>`, and a footer. On a phone that costs 261px — 21.6% of the Bingo Match document — and the sticky `z-50` header scrolls over the paper scorecard. There are three stacked back affordances: the layout logo, the `/bingo` nav row, and the Match `Exit` button.

**The paper identity covers a fraction of the route.** `BingoMatchplay` and everything below it are paper. The path to a Match — the `/bingo` mode-selection screen, `BingoOnlineGame`, `BingoMatchLobby`, `BingoBoardSetup` — is dark Tailwind. `BingoLocalGame` renders paper boards inside dark cards.

**Nothing is shaped like an app.** The Match document measures 1211px against an 844px viewport at 390px wide: 1.43 screens, ~367px of forced scroll before any interaction. The Board is 316px, 26% of the document. `.callSlipSlot` reserves 56px of dead space when there is no Call. Board sizing is width-driven with `aspect-ratio: 1`, so a short viewport shrinks nothing and simply pushes the Board off-screen.

The primary use case is unchanged: two friends playing an online Match from separate phones. Opening a Game should feel like opening an app, not loading a page.

## Goals

- Stop platform chrome at the Game boundary, structurally rather than conditionally.
- Present the platform home as an icon drawer whose only job is choosing a Game.
- Extend the paper identity across the entire Bingo route.
- Fit every Bingo screen in the viewport without page scrolling at default text size.
- Make the Board the largest object on every viewport by sizing it from available height.
- Remove duplicated navigation, duplicated board renderers, and unmaintained modes.

## Non-goals

- Redesigning gameplay, the deterministic engine, the Call/Pass model, or the Transport layer.
- Building a general theming registry, shell-config API, or per-Game token plumbing.
- Offline support, service workers, or an install prompt.
- Shipping TicTacToe. It stays an unlisted connectivity harness.
- Retaining Pass & Play.
- Automated end-to-end coverage of the no-scroll contract. Verification is manual.

## Domain

Two terms are added to `CONTEXT.md`:

- **Catalog**: the platform's home surface, presenting every available Game as a drawer of icons. The only place a Game is chosen; offers no Game-specific actions.
- **Game Shell**: the full-screen surface a Game owns once opened from the Catalog. Platform identity and chrome stop at its edge; the Game supplies its own visual system and its own single exit.

The term **Hub** is retired. It named a second pre-Game screen sitting beside **Lobby** with no glossary entry and no distinct purpose.

**Lobby** keeps its existing definition — "the pre-game coordination view where Players connect, ready up, and configure a Match." Merging invite, connection status, and board setup into one screen makes the code match that definition rather than introducing a new concept.

## Platform experience

### Catalog

- A dark, top-aligned icon drawer, four icons per row, fitting one screen without scrolling.
- Each Game is one icon plus a short label. Tapping it opens that Game. No per-Game action buttons.
- Icons are hand-drawn SVGs carrying each Game's own material, not generic glyphs.
- Coming-soon Games remain in the grid, dimmed with a small badge, so the drawer reads as full.
- The hero, the platform features bar, and the always-green `P2P Ready` badge are removed. A slim masthead and one footer line remain.
- TicTacToe is not listed.

### Game Shell

- Route groups separate `(platform)` from `(game)`. A Game route cannot inherit platform chrome.
- The platform keeps its dark identity. The dark-to-paper seam occurs exactly once, at the Catalog-to-Shell boundary, where it reads as opening an app.
- Opening a Game plays one short transition — roughly 220ms — expanding the tapped icon's material into the Shell. `prefers-reduced-motion` cuts instantly.
- PWA metadata only: `manifest.ts`, icons, `themeColor`, and a `viewport` export with `viewport-fit=cover`. No service worker, no install prompt.
- `viewport-fit=cover` and `env(safe-area-inset-*)` are required for full-bleed layout; the `viewport` export currently does not exist.
- No `user-scalable=no` and no `maximum-scale`. Zoom is never locked.

## Bingo experience

### Route identity

Paper covers the entire Bingo route: entry, Lobby, setup, Match, results, and comparison. `BingoBoardSetup` no longer renders its own dark grid.

### Entry and Lobby

- Tapping Bingo in the Catalog opens the Shell and begins creating an online Match immediately. There is no intermediate mode-selection screen.
- Invite, connection status, and board setup are one screen. The setup Board is dominant from the first frame.
- The invite is a single pill above the Board. While signaling resolves it shows a quiet preparing state and becomes tappable when a Match ID exists.
- Signaling failure surfaces in the pill as an actionable retry with a plain-language reason. It must not discard the arranged Board or replace the screen.
- Connection state is a one-line status, not two Player cards.
- A Guest arriving from an invite link sees the identical screen without the invite pill. There is one setup layout.
- Pass & Play is removed.

### Match surface

Persistent, always on screen, totalling roughly 150px of non-Board height:

1. **Shell bar** — exit, sound, rules. ~44px.
2. **Status strip** — both Players with ink, name, B-I-N-G-O stamps, and line count; whose turn; numeric timer. ~56px.
3. **Board** — flex-grow, square, sized by available height and capped by width.
4. **Action row** — Pass, Doodle, Match notes. ~48px.

Demoted from persistent space:

- The Call slip becomes a transient overlay floating over the Board edge. The unconditional 56px slot is removed.
- The B-I-N-G-O tracker merges into the status strip.
- The recent-Calls trail renders below the Board only when height permits. It is the first thing cut at 320px.
- Match notes and rules become pull-up sheets.
- Reactions become a popover from the action row.
- The reconnection banner becomes an overlay pinned to the Shell bar. It must never reflow the Board.

### Rules

A quiet `?` control in the Shell bar opens a paper rules sheet, available in the Lobby and during a Match. It names this variant specifically: 25 numbers, call any uncalled number, five completed lines spell B-I-N-G-O, turns may be Passed, and the timer Passes on expiry. A Guest arriving from a link has seen no prior Bingo screen.

### Exit

One control. Immediate in the Lobby. During an active Match it confirms and names the consequence — "Leave the Match? *Name* wins by forfeit" — in the same voice as the existing Pass confirmation. Platform gesture-and-hardware back routes through the same guard via a history entry.

### Results

- The result becomes a full Shell screen, not a modal over the Board.
- `Compare Boards` becomes its own full screen. Two annotated Boards do not fit a capped modal at 320px.
- The focus placement, focus restoration, Escape behavior, and live-announcement semantics built for the existing result dialog must be preserved through the conversion to screen navigation, not dropped.

## Layout contract

- Every Bingo screen is a `100dvh` flex column that does not page-scroll at default text size on viewports of at least 320x568.
- The Board is sized by available height and capped by width. Width-driven `aspect-ratio: 1` sizing is replaced.
- Anything appearing mid-Match overlays rather than reflows.
- Desktop caps the Board near 480px and spends the freed horizontal space on a side column carrying the recent-Calls trail and expanded notes, so desktop gains information rather than whitespace. The notes sheet is not needed there.
- Landscape reflows to a two-column layout — Board left, status right — because landscape is what happens when someone rotates mid-Match.
- When content genuinely cannot fit, the container falls back to normal page scrolling. Clipped content is a bug; scrolled content is the documented fallback.

## Accessibility

- Board cells remain at least 44x44 CSS pixels. This is a correctness floor for a tapping game, not a preference.
- Non-Board controls may be 36x36, down from 44x44. This satisfies WCAG 2.5.8 Target Size (Minimum, AA at 24x24) and gives up only 2.5.5 (AAA).
- The no-scroll contract is guaranteed to 200% text zoom, matching WCAG 1.4.4 Resize Text (AA). Beyond that the layout scrolls.
- Vertical scrolling as the overflow fallback satisfies WCAG 1.4.10 Reflow rather than violating it.
- The net position is full WCAG AA. Only AAA target size is traded away.
- All Board semantics, live announcements, focus behavior, reduced-motion handling, and colour-independent Player identity from the existing implementation are preserved.

## Codebase changes

- `BingoScorecard.module.css` (1513 lines) splits into `bingoTokens.css`, imported once for the shared token scope, plus per-component modules co-located with their components. This removes the single worst merge hotspot before parallel work begins.
- A `BingoGrid` primitive owns paper, printed rules, square cells, height-driven sizing, and focus rings. Setup, Match play, and Compare compose it and own their own interaction models and semantics. `BingoBoardView` and `BingoBoardSetup` currently duplicate grid rendering, which will diverge under height-driven sizing.
- `BingoLocalGame` and its test are deleted.
- `BingoSoundToggle` hardcodes dark Tailwind classes and is only paper because one call site overrides `className`. It moves onto tokens.
- `src/app/globals.css` sets a dark `body` background globally; the Game Shell must not inherit it.
- `src/app/tictactoe` moves under the game route group and stays unlisted.
- `DESIGN.md` has already moved to `src/games/bingo/DESIGN.md`; root placement wrongly implied it governs the platform. It still needs the layout contract added.

## Validation

- All existing unit, engine, state, hook, and integration tests continue to pass. Roughly 61 component tests across 19 files are in the blast radius; engine, state, hooks, transport, lobby, and audio tests should be untouched.
- Component tests cover the drawer, the invite pill states, sequential setup through the shared primitive, the exit guard, and the result screens.
- Typecheck, full test suite, and production build pass.
- No committed end-to-end suite is added. The no-scroll contract is verified by one-off measurement during implementation and by manual inspection, reported per viewport: 320x568, 390x844, 844x390 landscape, and 1440x900, plus 200% text zoom.

## Known risk

The no-scroll contract is the premise of this work and has no automated guard. The first future row added to a Bingo screen will break it silently, which is exactly how the current 1211px document came about.
