---
name: Tic-Tac-Toe Notebook Margin
description: A tactile paper notebook margin design for fast, expressive one-on-one Tic-Tac-Toe rounds.
colors:
  paper: "#F8FAF6"
  paper-raised: "#FFFFFF"
  paper-shadow: "#DFE5DF"
  desk: "#E7ECE8"
  grid-line: "#E0E6E2"
  margin-line: "#E5B8BC"
  pencil: "#2E3740"
  ink: "#202930"
  ink-muted: "#5E6B69"
  host-ink: "#155A96"
  guest-ink: "#A8324E"
  rule: "#A9B6B1"
  rule-soft: "#DBE2DE"
  warning: "#A85B16"
  urgent: "#B42335"
  focus: "#087E8B"
  cell-hover: "#EDF3EE"
  cell-pressed: "#E3EDE5"
  sheet-shadow-strong: "rgba(20, 35, 30, 0.16)"
  sheet-shadow-soft: "rgba(20, 35, 30, 0.10)"
  paper-overlay: "rgba(255, 255, 255, 0.82)"
typography:
  headline:
    fontFamily: "Avenir Next, Avenir, Trebuchet MS, sans-serif"
    fontSize: "clamp(1.5rem, 5vw, 2.25rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.025em"
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
rounded:
  mark: "4px"
  control: "8px"
  sheet: "14px"
  workspace: "24px"
  round: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper-raised}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
    height: "44px"
  notebook-sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "16px"
---

# Design System: Tic-Tac-Toe Notebook Margin

*Governed by the [Shared Game Design Rules](../../../docs/design/GAME-DESIGN-RULES.md).*

---

## 1. Identity

- **Creative North Star: "Notebook Margin"**
  Tic-Tac-Toe is the universal notebook margin diversion: two people sharing a piece of squared graph paper, drafting a grid in pencil, taking turns stamping X and O in fountain pen, and keeping series score with tally marks in the left margin.
- **Theme & Metaphor:**
  The sensory world anchors on clean stationery rather than worn scrapbooks. Squared graph paper (`#F8FAF6`) carries faint light-gray grid lines (`#E0E6E2`) and a pale desaturated pink vertical margin line (`#E5B8BC`, with opacity ~0.85) defining the left tally margin. The board consists of four quick graphite pencil strokes (`#2E3740`). Player marks appear as vivid, authentic hand-drawn ink: two energetic blue strokes for Host X (`#155A96`) and one continuous looped red stroke for Guest O (`#A8324E`).
- **Route Scope:**
  This design applies exclusively under `/tictactoe` within `.tttTokenScope`. Outside this route, the catalog preserves its dark launcher shell.
- **Key Characteristics:**
  - Clean squared graph paper sheet with tactile edge elevation.
  - Four hand-drawn pencil strokes forming the 3x3 board without enclosing border boxes.
  - Expressive hand-drawn SVG marks with subtle jitter (~180ms draw-in, zero font glyphs).
  - Series tallies recorded in the left margin with a target goal marker.
  - Rapid page-turn transition between rounds (<= 400ms) with a calm crossfade fallback for reduced motion.

---

## 2. Game Tokens

All tokens are defined under `.tttTokenScope` in [`src/games/tictactoe/ticTacToeTokens.css`](./ticTacToeTokens.css). Every literal exists for an explicit, documented reason:

| Token | Literal / Value | Contrast Ratio (vs #F8FAF6) | Reason for Existence |
| :--- | :--- | :--- | :--- |
| `--ttt-paper` | `#F8FAF6` | Background | Primary notebook page surface; cool, slightly off-white clean stock |
| `--ttt-paper-raised` | `#FFFFFF` | N/A (1.05:1) | Lifted card containers, dialog sheets, and secondary buttons |
| `--ttt-paper-shadow` | `#DFE5DF` | N/A | Crisp paper edge contour and tactile sheet boundary |
| `--ttt-desk` | `#E7ECE8` | N/A | Background work surface surrounding the notebook sheet |
| `--ttt-grid-line` | `#E0E6E2` | 1.21:1 | Faint printed squared graph paper lines across the sheet |
| `--ttt-margin-line` | `#E5B8BC` | 1.68:1 | Vertical left margin divider; pale desaturated pink, distinct from guest red |
| `--ttt-pencil` | `#2E3740` | 11.51:1 | Hand-drawn pencil strokes for board grid lines and tally marks (>= 4.5:1) |
| `--ttt-ink` | `#202930` | 14.07:1 | Primary printed typography, headers, controls, and body text (>= 4.5:1) |
| `--ttt-ink-muted` | `#5E6B69` | 5.29:1 | Secondary captions, helper instructions, and round counters (>= 4.5:1) |
| `--ttt-host-ink` | `#155A96` | 6.81:1 | Host player X marks, series tally strokes, and accents; blue family (>= 4.5:1) |
| `--ttt-guest-ink` | `#A8324E` | 6.19:1 | Guest player O marks, series tally strokes, and accents; red family (>= 4.5:1) |
| `--ttt-rule` | `#A9B6B1` | 2.14:1 | Subtle border and card outline rule (>= 4.5:1 on dark) |
| `--ttt-rule-soft` | `#DBE2DE` | 1.25:1 | Very soft inner divider line |
| `--ttt-warning` | `#A85B16` | 4.79:1 | Turn timer amber warning (under 10s down to 4s) (>= 4.5:1) |
| `--ttt-urgent` | `#B42335` | 6.19:1 | Turn countdown final 3 seconds, timeout warnings, destructive alerts (>= 4.5:1) |
| `--ttt-focus` | `#087E8B` | 4.58:1 | High-contrast focus outline for keyboard accessibility; distinct teal (>= 3.0:1) |
| `--ttt-cell-hover` | `#EDF3EE` | 1.05:1 | Subtle interactive hover highlight on enabled board cells |
| `--ttt-cell-pressed` | `#E3EDE5` | 1.13:1 | Tactile pressed feedback on active board cells |
| `--ttt-sheet-shadow-strong` | `rgba(20, 35, 30, 0.16)` | N/A | Primary cast shadow elevating the notebook sheet from the desk |
| `--ttt-sheet-shadow-soft` | `rgba(20, 35, 30, 0.10)` | N/A | Soft ambient shadow grounding the paper sheet |
| `--ttt-paper-overlay` | `rgba(255, 255, 255, 0.82)` | N/A | Semi-opaque paper scrim backdrop for modal overlays |
| `--ttt-font-print` | `"Avenir Next", Avenir, "Trebuchet MS", sans-serif` | N/A | Main printed font stack for headings, controls, and body text |
| `--ttt-font-body` | `var(--ttt-font-print)` | N/A | Body text font stack alias |
| `--ttt-font-label` | `"Arial Narrow", "Avenir Next Condensed", sans-serif` | N/A | Compact uppercase label font stack for badges, timers, and tallies |

### Named Rules
- **The Host-Blue / Guest-Red Rule:** Host is always assigned blue ink (`#155A96`) and Guest is always red ink (`#A8324E`). They must never be swapped or used as generic status colors.
- **The Margin-Line Distinction Rule:** The margin line is rendered as a pale desaturated pink (`#E5B8BC`, lightness 81%, contrast ratio 3.69:1 vs Guest ink). It remains a quiet paper artifact and can never be confused with Guest player marks.
- **The No-Font-Glyphs Rule:** Marks on the board are rendered strictly with SVG paths simulating organic pen strokes. Plain text font characters (`X` or `O`) are forbidden on the board grid.
- **The Clean-Paper Rule:** The notebook background uses cool squared graph paper with faint grid rules. Faux-aging effects, yellow parchment gradients, and torn-edge gimmicks are forbidden.

### Typography Hierarchy & Rules
- **Headline** (800, `clamp(1.5rem, 5vw, 2.25rem)`, 1): Screen headers and series result announcements.
- **Title** (700, `1rem`, 1.25): Turn ownership and player names.
- **Body** (500, `1rem`, 1.5): Instructions, status messages, and rules copy.
- **Label** (700, `0.75rem`, `0.08em`, uppercase): Compact badges, timer counts, and score labels.
- **Print First:** All actionable UI elements and instructions use crisp printed type. Hand-drawn styling is reserved strictly for pencil board strokes, ink marks, strike-through lines, and margin tallies.

---

## 3. Surface and Board

- **Surface Treatment:**
  - Raised notebook sheet (`#F8FAF6`) featuring faint 20px x 20px squared graph lines (`#E0E6E2`).
  - Tactile 14px sheet corner radius with crisp edge definition (`#DFE5DF`).
  - Left margin line in pale desaturated pink (`#E5B8BC`) positioned 64px from sheet left edge.
- **Elevation & Depth (Shadow Vocabulary):**
  - "One sheet, one shadow": The notebook sheet rests on the desk with a primary cast shadow (`rgba(20, 35, 30, 0.16)`) and ambient soft shadow (`rgba(20, 35, 30, 0.10)`).
  - Board cells remain flat within the sheet, separated by pencil strokes rather than card containers.
- **Board Sizing & Geometry:**
  - Board is a square 3x3 grid sized dynamically from available vertical height (per ADR 0009) and capped at 420px on desktop screens.
  - Sits centered in the paper workspace to the right of the margin line.
- **Grid & Dividers:**
  - Four hand-drawn graphite pencil strokes (`#2E3740`) form the 3x3 grid: two vertical lines and two horizontal lines.
  - No enclosing bounding box: the board opens directly onto the squared paper surface.
  - Pencil strokes animate in using `ttt-line-draw` (~240ms) at the start of each round.
- **Viewport Layout Contract (ADR 0009):**
  - Match, lobby, and result screens are `100dvh`-first shell containers.
  - During active matchplay, content fits without page scrolling.
  - Board remains the dominant square element on screen; non-board chrome budget is approximately 150px.
  - Modals and sheets appear as overlays without shifting the board.

---

## 4. Pieces and Marks

- **Host Mark (Fountain Blue `#155A96`):**
  - Two crisp hand-drawn diagonal pen strokes crossing in the cell center.
  - Subtle natural curvature and ~180ms draw-in animation with round caps.
  - Slight per-mark jitter in angle (-2.5deg to +2.5deg) and control points to convey genuine handwriting.
- **Guest Mark (Ballpoint Red `#A8324E`):**
  - Single continuous hand-drawn looped pen stroke.
  - Starts near top right, sweeps counter-clockwise, and overlaps the starting point by ~8% (approx. 20° of arc overlap) to mimic the natural pen speed-up when completing an organic handwritten zero/circle, ensuring the loop never looks like an open crescent or machine-rendered ellipse.
  - ~180ms draw-in animation with slight per-mark jitter.
- **Shape & Label Differentiation (Never Color Alone):**
  - Marks differ completely in geometry (cross with two strokes vs loop with one continuous stroke).
  - Screen reader text and cell labels (`"Cell row 1 column 1, marked by Host (You)"`) guarantee accessibility without color reliance.
- **Board Cells & Interaction:**
  - Touch targets measure at least 44 x 44 CSS pixels.
  - Enabled empty cells feature subtle hover (`#EDF3EE`) and pressed (`#E3EDE5`) states.
- **Winning Line (Strike-Through):**
  - Winning 3-in-a-row is marked by a decisive hand-drawn strike-through in the winner's ink.
  - **Overshoot:** The strike-through line extends approximately 6% beyond the outer cell boundaries at both ends.
  - Animated draw-in (~220ms) with round line caps.

---

## 5. Motion

- **Keyframe Transitions:**
  - `ttt-line-draw`: 240ms pencil draw-in for the four board grid strokes and winning strike-through.
  - `ttt-mark-draw`: 180ms ink stroke draw-in for player marks.
  - `ttt-page-turn`: 360ms subtle page curl and slide transition when advancing rounds.
- **Duration & Timing:**
  - All animations are brief (<= 400ms), execute once per event, and settle into static resting states immediately.
  - Zero continuous loops or ambient pulsing during gameplay.
- **Reduced Motion Fallback:**
  - Under `@media (prefers-reduced-motion: reduce)`, animation durations collapse to 0.01ms.
  - The page turn replaces the physical slide/curl with an instant or subtle 200ms crossfade (`ttt-crossfade`).

---

## 6. Game Components

- **Buttons & Controls:**
  - Primary button: Solid graphite (`#202930`) with white print (`#FFFFFF`), 8px rounded corners, minimum 44px height.
  - Secondary button: Raised white paper (`#FFFFFF`) with ink rule (`#A9B6B1`), 8px corners, minimum 44px height.
  - Focus indicator: 3px solid teal outline (`#087E8B`) with 2px offset.
- **Navigation & Utility Shell:**
  - Minimal top utility row containing catalog back link and sound control.
- **Series Margin Tally:**
  - Located in the left margin area to the left of the pink margin line.
  - Organised in two distinct columns: Host (blue) and Guest (red).
  - Tally marks rendered using 5-bar gate groups (4 vertical strokes + 1 diagonal slash for every 5 wins).
  - Target marker: A visual goal marker indicating the match target score (e.g. `First to 2` for Best of 3).
  - Fully accessible with descriptive `aria-label` announcing total score and series objective.
- **Turn Timer:**
  - Numeric countdown paired with a shrinking pencil line below the active player.
  - Shifts to amber (`#A85B16`) under 10 seconds and urgent red (`#B42335`) under 3 seconds.
- **Overlays & Dialogs:**
  - Rules and reaction drawers open over the notebook sheet without causing layout shifts.

---

## 7. Entry-Screen Contract Mapping

Tic-Tac-Toe maps the shared entry contract tokens in `ticTacToeTokens.css`:

```css
--entry-surface: var(--ttt-paper);
--entry-surface-raised: var(--ttt-paper-raised);
--entry-surface-gradient:
  radial-gradient(ellipse 80% 50% at 50% 0%, rgba(200, 160, 90, 0.07) 0%, transparent 70%),
  radial-gradient(ellipse 60% 40% at 50% 100%, rgba(21, 90, 150, 0.05) 0%, transparent 60%),
  linear-gradient(178deg, var(--ttt-paper) 0%, var(--ttt-paper) 100%);
--entry-ink: var(--ttt-ink);
--entry-ink-muted: var(--ttt-ink-muted);
--entry-accent: var(--ttt-host-ink);
--entry-accent-guest: var(--ttt-guest-ink);
--entry-warning: var(--ttt-warning);
--entry-rule: var(--ttt-rule);
--entry-focus: var(--ttt-focus);
--entry-urgent: var(--ttt-urgent);
--entry-font-label: var(--ttt-font-label);
--entry-scrim: rgba(32, 41, 48, 0.38);
--entry-shadow: 0 18px 50px rgba(20, 35, 30, 0.18);
--entry-shadow-soft: 0 4px 12px rgba(20, 35, 30, 0.10);
```

### Invariants Preserved
- No Bingo tokens (`--bingo-*`) leaked into Tic-Tac-Toe.
- Shared entry screens (`src/components/entry/`) use exclusively the `--entry-*` contract.
- All colors meet WCAG AA (>= 4.5:1) contrast against their respective surfaces.
