---
name: Bingo Sunday Puzzle Scorecard
description: A crisp paper scorecard system for fast one-on-one Bingo on separate phones.
colors:
  paper: "#F7F9F4"
  paper-raised: "#FFFFFF"
  paper-shadow: "#DCE3DE"
  desk: "#E6ECE8"
  graphite: "#27313A"
  graphite-muted: "#65716F"
  rule: "#AAB7B3"
  rule-soft: "#D9E0DC"
  host-ink: "#175E9C"
  guest-ink: "#A63D57"
  warning: "#A85B16"
  urgent: "#B42335"
  focus: "#087E8B"
  cell-hover: "#EEF4F0"
  cell-pressed: "#E4EDE7"
  sheet-shadow-strong: "rgba(20, 37, 43, 0.18)"
  sheet-shadow-soft: "rgba(20, 37, 43, 0.12)"
  slip-shadow: "rgba(20, 37, 43, 0.16)"
  rule-strong: "rgba(39, 49, 58, 0.3)"
  paper-overlay: "rgba(255, 255, 255, 0.78)"
typography:
  headline:
    fontFamily: "Avenir Next, Avenir, Trebuchet MS, sans-serif"
    fontSize: "clamp(1.5rem, 5vw, 2.25rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.025em"
  masthead:
    fontFamily: "Avenir Next, Avenir, Trebuchet MS, sans-serif"
    fontSize: "clamp(1.75rem, 9vw, 2.625rem)"
    fontWeight: 900
    lineHeight: 0.88
    letterSpacing: "0.08em"
  title:
    fontFamily: "Avenir Next, Avenir, Trebuchet MS, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Avenir Next, Avenir, Trebuchet MS, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "Arial Narrow, Avenir Next Condensed, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.08em"
  compact-label:
    fontFamily: "Arial Narrow, Avenir Next Condensed, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.06em"
  player-name:
    fontFamily: "Avenir Next, Avenir, Trebuchet MS, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 800
    lineHeight: 1.2
  turn:
    fontFamily: "Avenir Next, Avenir, Trebuchet MS, sans-serif"
    fontSize: "clamp(1rem, 4vw, 1.125rem)"
    fontWeight: 800
    lineHeight: 1.15
  stamp:
    fontFamily: "Avenir Next, Avenir, Trebuchet MS, sans-serif"
    fontSize: "clamp(0.875rem, 4vw, 1.125rem)"
    fontWeight: 900
    lineHeight: 1
  call-number:
    fontFamily: "Avenir Next, Avenir, Trebuchet MS, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 900
    lineHeight: 1
rounded:
  mark: "4px"
  control: "8px"
  sheet: "14px"
  workspace: "24px"
  round: "999px"
  slip: "3px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.graphite}"
    textColor: "{colors.paper-raised}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.graphite}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
    height: "44px"
  score-sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.sheet}"
    padding: "16px"
---

# Design System: Bingo Sunday Puzzle Scorecard

*Governed by the [Shared Game Design Rules](../../../docs/design/GAME-DESIGN-RULES.md).*

---

## 1. Identity

- **Creative North Star: "Sunday Puzzle Scorecard"**
  Bingo looks like a fresh score sheet pulled from a weekend puzzle booklet, marked in ink by two friends during live play. The paper is cool and clean rather than nostalgic cream. Printed labels, numbers, rules, and controls stay precise. Player actions appear as irregular, tactile ink laid over that print.
- **Theme & Metaphor:**
  - Cool paper stock on a quiet desk surface, isolating the game from the platform launcher without artificial skeuomorphic clutter.
  - Two assigned player inks (fountain blue for Host, berry red for Guest) represent live human marks.
  - Actionable text remains crisp print; handwriting is reserved for marks, stamps, and strike lines.
- **Key Characteristics:**
  - A square score sheet is the dominant object on all viewports.
  - Graphite print establishes visual hierarchy without heavy dashboard containers.
  - Host blue and Guest berry remain stable from Lobby through Match to Results.
  - Hand-drawn SVG marks carry personality without compromising numeral legibility.
  - Motion happens once when state changes, then settles immediately into a static resting state.

---

## 2. Game Tokens

All tokens are scoped under `.bingoTokenScope` in [`src/games/bingo/bingoTokens.css`](./bingoTokens.css). Each literal exists for an explicit functional purpose:

| Token | Literal / Value | Contrast Ratio (vs #F7F9F4) | Reason for Existence |
| :--- | :--- | :--- | :--- |
| `--bingo-paper` | `#F7F9F4` | Background | Primary score sheet paper surface; cool, slightly desaturated white stock |
| `--bingo-paper-raised` | `#FFFFFF` | N/A (1.05:1) | Lifted call slips, action cards, and secondary controls |
| `--bingo-paper-shadow` | `#DCE3DE` | N/A | Crisp paper edge contour and tactile boundary |
| `--bingo-desk` | `#E6ECE8` | N/A | Work surface surrounding the score sheet within the bare shell |
| `--bingo-graphite` | `#27313A` | 12.49:1 | Primary printed typography, titles, board numerals, and primary buttons |
| `--bingo-graphite-muted` | `#65716F` | 4.78:1 | Secondary captions, helper instructions, and subheadings (≥ 4.5:1 AA) |
| `--bingo-rule` | `#AAB7B3` | 1.89:1 | Board grid dividers, structural borders, and scorecard separators |
| `--bingo-rule-soft` | `#D9E0DC` | 1.28:1 | Subtle dividers, inactive borders, and quiet paper texture lines |
| `--bingo-rule-strong` | `rgba(39, 49, 58, 0.3)`| N/A | Heavy outer boundary for the bingo grid |
| `--bingo-host-ink` | `#175E9C` | 6.35:1 | Host player marks, Host calls, Host line strokes, and Host badge; blue family |
| `--bingo-guest-ink` | `#A63D57` | 5.78:1 | Guest player marks, Guest calls, Guest line strokes, and Guest badge; red family |
| `--bingo-warning` | `#A85B16` | 4.75:1 | Turn timer amber warning (10s down to 4s) (≥ 4.5:1 AA) |
| `--bingo-urgent` | `#B42335` | 6.13:1 | Final 3 seconds countdown, timeout notices, destructive alerts (≥ 4.5:1 AA) |
| `--bingo-focus` | `#087E8B` | 4.54:1 | High-contrast focus outline for keyboard navigation; teal tone distinct from inks |
| `--bingo-cell-hover` | `#EEF4F0` | 1.05:1 | Brief interactive hover state on enabled board cells |
| `--bingo-cell-pressed` | `#E4EDE7` | 1.13:1 | Tactile pressed state on interactive board cells |
| `--bingo-sheet-shadow-strong`| `rgba(20, 37, 43, 0.18)`| N/A | Primary cast shadow elevating the score sheet from the desk surface |
| `--bingo-sheet-shadow-soft`| `rgba(20, 37, 43, 0.12)`| N/A | Secondary ambient soft shadow under the score sheet |
| `--bingo-slip-shadow` | `rgba(20, 37, 43, 0.16)`| N/A | Lifted elevation shadow for the transient incoming call slip |
| `--bingo-paper-overlay` | `rgba(255, 255, 255, 0.78)`| N/A | Semi-opaque backdrop for modal sheets and overlays |
| `--bingo-font-print` | `"Avenir Next", Avenir, "Trebuchet MS", sans-serif` | N/A | Main printed font stack for headings, numbers, and body text |
| `--bingo-font-label` | `"Arial Narrow", "Avenir Next Condensed", sans-serif` | N/A | Compact uppercase label font stack for badges, timer, and scores |

### Invariant Rules
- **The Two-Ink Rule:** Host fountain blue (`#175E9C`) and Guest berry ink (`#A63D57`) are strictly reserved for player identity, board marks, and called line strokes. Neither ink is ever used as a generic status or selection color.
- **The Clean-Paper Rule:** Large regions use scorecard paper (`#F7F9F4`) or cool desk (`#E6ECE8`). Never introduce beige, parchment gradients, coffee stains, torn edges, or scrapbook ornamentation.

---

## 3. Surface and Board

- **Score Sheet Surface:**
  - Single dominant paper sheet with a 14px corner radius, cool gray edge (`#DCE3DE`), and structural double-shadow.
  - Internal padding shrinks from 16px–24px down to 10px on narrow (320px) phones.
- **Board Sizing & Viewport Contract (ADR 0009):**
  - The Match surface is a `100dvh` flex column with no vertical scrolling on viewports ≥ 320 × 568px at default text zoom.
  - The 5x5 board is sized dynamically from *available height*, remains strictly square, and is capped at 480px on desktop screens.
  - Board cells maintain at least 44 × 44 CSS pixels. Non-board chrome (shell bar, status strip, action row) shares an approximate 150px budget.
  - At 200% text zoom or extreme landscape, the sheet safely falls back to standard page scrolling rather than clipping.
- **Grid Layout & Alignment:**
  - 8px base grid rhythm with 4px sub-increments for compact alignment.
  - 1px printed rule (`#AAB7B3`) creates crisp separation between cells without thick card borders.

---

## 4. Pieces and Marks

- **Host Mark (Fountain Blue `#175E9C`):**
  - Rendered as an irregular two-stroke hand-drawn cross with slight angle variation.
  - Drawn using SVG stroke paths with round caps and controlled overflow beyond the cell.
- **Guest Mark (Berry Red `#A63D57`):**
  - Rendered as a rough loop and diagonal slash mark.
  - Completely distinct in geometry, stroke count, and texture from the Host cross.
- **Shape & Label Differentiation (Never Color Alone):**
  - Cells display caller names in accessibility labels (`"Cell 14, called by Host (You)"`).
  - Crosses vs. loops ensure complete clarity for colorblind players.
- **Winning Lines:**
  - Completed rows, columns, and diagonals draw owner-ink line paths above cell numbers.
  - Overlapping lines between Host and Guest are slightly offset and translucent so both remain readable.

---

## 5. Motion

- **Keyframe Animations:**
  - `bingo-ink-draw`: 180ms stroke-dashoffset animation simulating ink laying onto paper.
  - `bingo-stamp-in`: 220ms stamp drop with a subtle scale (1.45 → 1.0) and slight angle jitter.
  - `bingo-slip-in`: 240ms entry for the incoming call slip with a 3-degree tilt and horizontal slide.
  - `bingo-timer-nudge`: Subtle 2px shake when the turn timer drops into urgent (< 3s) time.
  - `bingo-doodle-in`: Quick 200ms entry for transient celebratory doodles.
- **Execution Policy:**
  - Transitions are brief, fire once on state transition, and settle immediately. No continuous spinning or pulsing during active play.
- **Reduced Motion Fallback:**
  - Under `@media (prefers-reduced-motion: reduce)`, animation duration and transition duration collapse to `0.01ms`, instantly displaying resting states without movement.

---

## 6. Game Components

- **Buttons:**
  - Primary button: Solid graphite (`#27313A`) fill, crisp white print (`#FFFFFF`), 8px radius, minimum 44px height.
  - Secondary button: White paper (`#FFFFFF`) or transparent background with graphite border.
  - Touch target: Interactive buttons maintain a minimum 44px tap target.
  - Focus style: 3px teal outline (`#087E8B`) with 2px offset.
- **Player Indicators & Scoreboard:**
  - Compact horizontal strip displaying Host (cross icon + name + `"You"`/`"Opponent"`) and Guest (loop icon + name).
  - Turn indicator states `"Your turn"` or `"Their turn"` in bold printed graphite.
- **Turn Timer:**
  - Textual countdown (`15s`, `10s`, `3s`) paired with a shrinking ink bar.
  - Changes from graphite to amber (`#A85B16`) at 10s, and to urgent red (`#B42335`) at 3s.
- **Overlays & Dialogs:**
  - Match Notes and Rules open as lightweight bottom sheets or popovers, preserving the board's flow slot without height reflow.
  - Call Slip floats over the status/turn strip at the board edge, never blocking interactive cells.

---

## 7. Entry-Screen Contract Mapping

Bingo maps its tokens to the shared entry-screen CSS contract:

| Shared Entry Token | Bingo Token Mapping | Mapped Value | Purpose |
| :--- | :--- | :--- | :--- |
| `--entry-surface` | `var(--bingo-paper)` | `#F7F9F4` | Primary background of entry/lobby screens |
| `--entry-surface-raised`| `var(--bingo-paper-raised)`| `#FFFFFF` | Cards, input fields, and elevated panels |
| `--entry-ink` | `var(--bingo-graphite)` | `#27313A` | Headings, room codes, and primary text |
| `--entry-ink-muted` | `var(--bingo-graphite-muted)`| `#65716F` | Secondary descriptions and helper labels |
| `--entry-accent` | `var(--bingo-host-ink)` | `#175E9C` | Brand touches and primary share highlights |
| `--entry-rule` | `var(--bingo-rule)` | `#AAB7B3` | Borders, dividers, and input strokes |
| `--entry-focus` | `var(--bingo-focus)` | `#087E8B` | Keyboard focus ring |
| `--entry-urgent` | `var(--bingo-urgent)` | `#B42335` | Timeout notices, error banners, destructive buttons |

---

## 8. Do's and Don'ts

### Do
- **Do** keep the board as the largest and highest-contrast object on every viewport.
- **Do** derive every scribble and mark from ordered Match history so both peers render identical ownership.
- **Do** keep line strokes separate and offset so overlapping rows and diagonals remain readable.
- **Do** use one-shot transitions and ensure static states are completely legible under reduced motion.
- **Do** test the score sheet at 320px width, keyboard navigation, and enlarged text zoom.

### Don't
- **Don't** recreate a dark dashboard inside a light card.
- **Don't** use generic cream notebook paper, torn edges, tape, ruled school lines, or cursive script.
- **Don't** pulse the active turn continuously or spin decorative icons.
- **Don't** hide the numeric countdown in a color-only radial gauge.
- **Don't** use Player ink for neutral controls, connection success, or global focus outlines.

---

## 9. Screenshot References

Baseline visual captures recorded at 390 × 844 mobile viewport:
- **Choice Screen:** `/bingo` entry presenting Create Room, Join with Code, and Play with Stranger.
- **Host Lobby:** Waiting for peer, room code card, copy link / QR buttons, board setup.
- **Guest Join Screen:** Room code input, numeric keyboard focus, validation error state.
- **Stranger Search:** Searching pulse with elapsed timer, 60s timeout state, connection error state.
- **Matchplay:** Active Match board, caller cross/loop marks, turn countdown strip, call slip overlay.
- **Match Result:** Game over win/loss banner, final line strike-throughs, rematch invitation actions.
