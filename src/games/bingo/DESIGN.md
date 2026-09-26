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

# Design system: Bingo Sunday Puzzle Scorecard

*Governed by the [Shared Game Design Rules](../../../docs/design/GAME-DESIGN-RULES.md).*

---

## 1. Identity

- **Creative North Star: "Sunday Puzzle Scorecard"**
  Bingo should look like a fresh score sheet pulled from a weekend puzzle booklet, then marked by two friends during play. The paper is cool and clean rather than nostalgic cream. Printed labels, numbers, rules, and controls stay precise. Player actions appear as irregular ink laid over that print.
- **Route scope:**
  This system applies only inside the Bingo route. The global games platform keeps its existing dark identity outside Bingo. Material detail stays restrained so the board reads clearly at 320px and under enlarged text.
- **Key characteristics:**
  - A square score sheet is the dominant object.
  - Graphite print establishes hierarchy without dashboard cards.
  - Host blue and Guest berry remain stable from Lobby through results.
  - Hand-drawn SVG marks carry personality without reducing legibility.
  - Motion happens once when state changes, then settles into a clear static state.

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

### Named Rules
- **The two-ink rule.** Blue and berry identify the Players. Never use either ink as a generic success or selection color.
- **The clean-paper rule.** Large regions use scorecard paper or the cool puzzle-desk token. Do not introduce beige, parchment gradients, torn edges, coffee stains, or scrapbook decoration.

### Typography Hierarchy & Rules
- **Headline font:** Avenir Next with Avenir and Trebuchet MS fallbacks
- **Body font:** Avenir Next with Avenir and Trebuchet MS fallbacks
- **Label font:** Arial Narrow with Avenir Next Condensed fallback
- **Character:** Printed type should resemble a well-made puzzle booklet: compact, direct, and easy to scan. Handwriting is drawn as SVG ink, not used for instructions or dense text.
- **Hierarchy:**
  - **Headline** (800, `clamp(1.5rem, 5vw, 2.25rem)`, 1): BINGO title and Match result only.
  - **Title** (700, `1rem`, 1.25): turn ownership and Player names.
  - **Body** (500, `1rem`, 1.5): instructions and feedback.
  - **Label** (700, `0.75rem`, `0.08em`, uppercase): timer, score, and compact controls.
  - **Board number** (800, responsive from `1rem` to `1.5rem`, tabular): one number per cell with no secondary label.
- **Print first.** Keep all actionable text in the printed type system. Reserve hand-drawn treatment for scribbles, stamps, line strokes, and short decorative annotations.

---

## 3. Surface and Board

- **Surface Treatment:**
  - Single dominant paper sheet with a 14px corner radius that reads as trimmed stock rather than a soft app card.
  - Cool scorecard paper (`#F7F9F4`) with optional low-opacity fiber speckle.
  - One cool gray edge (`#DCE3DE`), with stronger rules inside the board.
  - Internal padding: 10px on narrow phones, 16px to 24px at larger widths.
- **Elevation & Depth (Shadow Vocabulary):**
  - Paper depth is structural. The score sheet uses one cool gray cast shadow and a thin edge. Call slips may overlap the sheet with a smaller shadow. Board cells and status regions stay flat, separated by printed rules rather than nested card shadows.
  - **Sheet lift** (`0 18px 50px rgba(20, 37, 43, 0.18), 0 2px 5px rgba(20, 37, 43, 0.12)`): the primary score sheet only.
  - **Slip lift** (`0 5px 14px rgba(20, 37, 43, 0.16)`): incoming Call slip and compact menus.
  - The shadow alpha values are named tokens because they define the only two lifted paper levels in the route. A transient Call slip may lift above the turn/status region, but never above interactive Board cells.
  - **One sheet, one shadow.** Do not give every section its own floating card. Internal hierarchy comes from spacing, rules, and type.
- **Board Layout:**
  - The Match is organized around one score sheet. Its board consumes the available width up to 480px and remains square. A compact turn strip attaches directly above the grid. Player identities sit above that strip as a single scoreboard row, not separate dashboard cards.
  - At widths near 320px, route gutters shrink to 8px and score-sheet padding shrinks to 10px. The 5x5 board keeps a minimum 44px target per cell where viewport width permits. Secondary controls and recent history wrap below the board. Desktop adds breathing room and may place lightweight supporting information beside the sheet, but the board remains the largest object.
  - Use an 8px base rhythm with 4px for fine alignment. Do not duplicate the current turn in the header, Player row, and board copy.
- **Viewport Layout Contract (ADR 0009):**
  - The Match, Lobby, result, and comparison surfaces are `100dvh`-first Shell screens. Their containers may page-scroll only when content genuinely cannot fit; they must not clip content to preserve a nominal no-scroll state.
  - The Board is sized by available height in the active Match, remains square, and is capped near 480px on wide screens. The non-Board Match budget is approximately 150px: Shell bar, status strip, and action row share that budget.
  - Board cells are at least 44px by 44px. Other controls target at least 36px by 36px (or 44px where space permits), including controls on result and comparison screens.
  - Call slips and transient announcements overlay the active turn/status region rather than covering interactive Board cells or reserving a Board flow slot. Match notes and rules open as sheets or popovers without persistent height; quick reactions remain direct controls in the action row.
  - Landscape uses a Board-left/status-right reflow. Recent Calls and expanded Match notes stack below the status strip in the right column, using freed horizontal space while keeping the Board the largest object.
  - Result is a full Shell screen. Compare Boards is a separate full Shell screen with both annotated Boards and the same ordered history, Player identity, and line descriptions. A received rematch request remains visible in both screens.
  - At 200% text zoom, text and controls may cause page scrolling when the content genuinely cannot fit; no content is clipped and browser zoom remains enabled.

---

## 4. Pieces and Marks

- **Host Mark (Fountain Blue `#175E9C`):**
  - Host identity, Host Calls, and Host-owned line strokes.
  - Rendered as an irregular two-stroke hand-drawn cross with slight angle variation.
  - Drawn using SVG stroke paths with round caps and controlled overflow beyond the cell.
- **Guest Mark (Berry Red `#A63D57`):**
  - Guest identity, Guest Calls, and Guest-owned line strokes.
  - Rendered as a rough loop and diagonal slash mark.
  - Completely distinct in geometry, stroke count, and texture from the Host cross.
- **Board Cells & Numeral Contrast:**
  - Cells use graphite numbers over paper with one shared printed grid.
  - Enabled cells commit on one tap. Disabled and called cells remain stable without opacity that harms number contrast.
- **Shape & Label Differentiation (Never Color Alone):**
  - Each name has an ink-colored cross or loop matching that Player's board marks, plus a text label such as `You` or `Opponent`.
  - Ink color never carries identity alone. Names and ownership wording remain visible.
  - The active Player is indicated once in the board-attached turn strip.
  - Cells display caller names in accessibility labels (`"Cell 14, called by Host (You)"`). Crosses vs. loops ensure complete clarity for colorblind players.
- **Winning Lines:**
  - Completed rows, columns, and diagonals draw separate owner-ink paths above cell marks.
  - Overlapping lines remain visible through slight path offsets and translucent ink.

---

## 5. Motion

- **Keyframe Animations:**
  - `bingo-ink-draw`: 180ms stroke-dashoffset animation simulating ink laying onto paper.
  - `bingo-stamp-in`: 220ms stamp drop with a subtle scale (1.45 → 1.0) and slight angle jitter.
  - `bingo-slip-in`: 240ms entry for the incoming call slip with a 3-degree tilt and horizontal slide.
  - `bingo-timer-nudge`: Subtle 2px shake when the turn timer drops into urgent (< 3s) time.
  - `bingo-doodle-in`: Quick 200ms entry for transient celebratory doodles.
- **Execution Policy:**
  - Transitions are brief, fire once on state transition, and settle into a clear static state immediately. No continuous spinning or pulsing during active play.
- **Reduced Motion Fallback:**
  - Under `@media (prefers-reduced-motion: reduce)`, animation duration and transition duration collapse to `0.01ms`, instantly displaying static resting states without movement.

---

## 6. Game Components

- **Buttons:**
  - **Shape:** Compact rectangular controls with 8px corners.
  - **Primary:** Graphite fill, white print, strong label weight, minimum 44px height.
  - **Secondary:** White or transparent paper with a graphite rule. Secondary controls target at least 36px by 36px (or 44px where space permits). Destructive actions use text and border changes, not a large red fill.
  - **Hover / Focus:** A small tonal shift on hover. Focus uses a 3px teal outline with 2px offset. Pressing may translate by 1px.
- **Navigation:**
  - Exit and sound controls are quiet utility buttons aligned above the score sheet. They keep familiar icons, visible text where space permits, 44px targets (costed down to 36px where space requires per ADR 0009), and strong focus treatment.
- **Cards / Containers:**
  - Corner style: The main sheet uses 14px. Small paper slips use 3px.
  - Background: Cool scorecard paper with optional low-opacity fiber speckle.
  - Shadow strategy: Only the main sheet and temporary slips lift.
  - Border: One cool gray edge, with stronger rules inside the board.
  - Internal padding: 10px on narrow phones, 16px to 24px at larger widths.
- **Player Key & Scoreboard:**
  - Compact horizontal strip displaying Host (cross icon + name + `"You"`/`"Opponent"`) and Guest (loop icon + name).
  - Turn indicator states `"Your turn"` or `"Their turn"` in bold printed graphite.
- **Progress Stamps:**
  - B-I-N-G-O letters resemble small rubber stamps in the board owner's ink.
  - When one Call completes multiple lines, new stamps enter in sequence with a short stagger.
  - The final state stays fully readable without animation.
- **Call Slip:**
  - The newest Call appears as a small white paper slip near the board edge on both screens.
  - It names the caller and number, uses the caller's ink, and never blocks cells or requires dismissal.
  - Its entrance is brief. The slip remains long enough to read, then may settle into recent history.
- **Turn Timer:**
  - Textual countdown (`15s`, `10s`, `3s`) paired with a shrinking ink bar.
  - Changes from graphite to amber (`#A85B16`) at 10s, and to urgent red (`#B42335`) at 3s.
- **Overlays & Dialogs:**
  - Match Notes and Rules open as lightweight bottom sheets or popovers, preserving the board's flow slot without height reflow.
  - Call Slip floats over the status/turn strip at the board edge, never blocking interactive cells.

---

## 7. Entry-Screen Contract Mapping

Bingo maps the shared entry contract tokens to its scoped game tokens:

| Shared Entry Token | Bingo Token Mapping | Mapped Value | Purpose |
| :--- | :--- | :--- | :--- |
| `--entry-surface` | `var(--bingo-paper)` | `#F7F9F4` | Primary background of entry/lobby screens |
| `--entry-surface-raised`| `var(--bingo-paper-raised)`| `#FFFFFF` | Cards, input fields, and elevated panels |
| `--entry-ink` | `var(--bingo-graphite)` | `#27313A` | Headings, room codes, and primary text |
| `--entry-ink-muted` | `var(--bingo-graphite-muted)`| `#65716F` | Secondary descriptions and helper labels |
| `--entry-accent` | `var(--bingo-host-ink)` | `#175E9C` | Host player accent and primary highlights |
| `--entry-accent-guest` | `var(--bingo-guest-ink)` | `#A63D57` | Guest player accent and join-room actions |
| `--entry-warning` | `var(--bingo-warning)` | `#A85B16` | Timer warning and stranger matchmaking highlights |
| `--entry-rule` | `var(--bingo-rule)` | `#AAB7B3` | Borders, dividers, and input strokes |
| `--entry-focus` | `var(--bingo-focus)` | `#087E8B` | Keyboard focus ring |
| `--entry-urgent` | `var(--bingo-urgent)` | `#B42335` | Timeout notices, error banners, destructive buttons |
| `--entry-font-label` | `var(--bingo-font-label)` | `"Arial Narrow", ...` | Compact label font for buttons and badges |

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

Baseline visual captures recorded at 390 × 844 mobile viewport with mocked transport (`npm run test:visual`):
- **Entry & Lobby Screens (Recorded in #18):**
  - Choice Screen: `tests/visual/baselines/bingo-choice.png` (`/bingo` entry presenting Create Room, Join with Code, and Play with Stranger).
  - Join Code Screen (Empty): `tests/visual/baselines/bingo-join-code-empty.png` (Room code input, placeholder, disabled submit).
  - Join Code Screen (Error): `tests/visual/baselines/bingo-join-code-error.png` (Validation error state for invalid Crockford base32 code).
  - Stranger Search: `tests/visual/baselines/bingo-stranger-search.png` (Searching pulse with elapsed timer at 0:00).
  - Host Match Lobby: `tests/visual/baselines/bingo-match-lobby.png` (Waiting for peer, room code card, copy link / QR buttons, board setup 5x5 grid).
  - Tolerance: Pixel diff $\le 0.1\%$ (`maxDiffPixelRatio: 0.001`) with pixelmatch anti-aliasing threshold `0.2`.
- **Matchplay & Results Screens (Planned):**
  - Matchplay: Active Match board, caller cross/loop marks, turn countdown strip, call slip overlay.
  - Match Result: Game over win/loss banner, final line strike-throughs, rematch invitation actions.
