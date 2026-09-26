# Game Design System Template

Every Game in `src/games/<game>/` must provide a `DESIGN.md` adhering to this template.

Before completing this document, read and verify compliance with the [Shared Game Design Rules](./GAME-DESIGN-RULES.md).

---

```markdown
---
name: "<Game Name> <Design Theme>"
description: "<One-sentence creative thesis and context>"
colors:
  # Key color literals used in this game
  surface: "#..."
  ink: "#..."
  host-ink: "#..." # Blue family
  guest-ink: "#..." # Red family
  focus: "#..."
typography:
  # Font stacks and sizing scales
---

# Design System: <Game Name>

*Governed by the [Shared Game Design Rules](../../../docs/design/GAME-DESIGN-RULES.md).*

## 1. Identity

- **Creative North Star:** Metaphor and thesis for the game's sensory world (e.g. "Sunday Puzzle Scorecard", "Notebook Margin").
- **Theme & Metaphor:** Describe the materials, textures, and physical references that anchor the aesthetic.
- **Route Scope:** The boundaries where this design applies (e.g. only inside the game's route; platform retains dark catalog).
- **Key Characteristics:** 3 to 5 core design tenets that make this game distinct while remaining fast and legible.

## 2. Game Tokens

Document every custom CSS property defined in `<game>Tokens.css`. **Every literal value must have a documented reason for existence.**

| Token | Literal / Value | Contrast Ratio (vs Background) | Reason for Existence |
| :--- | :--- | :--- | :--- |
| `--<game>-surface` | `#...` | N/A | Base paper or table background |
| `--<game>-ink` | `#...` | `>= 4.5:1` | Primary readable text and numerals |
| `--<game>-host-ink` | `#...` (Blue family) | `>= 4.5:1` | Host marks and identity; blue family |
| `--<game>-guest-ink` | `#...` (Red family) | `>= 4.5:1` | Guest marks and identity; red family |
| `--<game>-focus` | `#...` | `>= 3.0:1` | High-visibility focus ring |
| ... | ... | ... | ... |

*(All text and interactive color pairs documented here are verified against the game's CSS tokens by automated contrast tests in `npm test`.)*

### Named Rules
Document any specific rules governing token usage (e.g. two-ink rule, clean-paper rule).

### Typography Hierarchy & Rules
Document font stacks, typography hierarchy (headline, title, body, label, board numerals), and principles (e.g. "Print first").

## 3. Surface and Board

- **Surface Treatment:** Background materials, colors, boundaries, and shadows.
- **Elevation & Depth (Shadow Vocabulary):** Documented shadow literals and elevation levels (e.g. "One sheet, one shadow").
- **Board Sizing & Geometry:** How the board sizes from available vertical height (ADR 0009) and caps at max width.
- **Grid & Dividers:** Line weights, border styles, and alignment rhythm.
- **Viewport Layout Contract (ADR 0009):**
  - 100dvh-first Shell screens: Containers may page-scroll only when content genuinely cannot fit; they must not clip content to preserve a nominal no-scroll state.
  - Board is sized by available height, remains square, capped on wide screens.
  - Non-board chrome budget is approximately 150px.
  - Mid-game interactions (rules, notes, reactions) open as overlays/sheets without causing board reflow.
  - Landscape reflow (e.g. board-left, status-right).
  - Safe fallback: Standard vertical scrolling at 200% text zoom or extreme landscape without clipping.

## 4. Pieces and Marks

- **Host Mark:** Visual appearance, stroke style, and geometry in Host blue ink.
- **Guest Mark:** Visual appearance, stroke style, and geometry in Guest red ink.
- **Board Cells & Number Contrast:** Cell state styling (enabled tap, disabled/called states avoid contrast-breaking opacity).
- **Differentiators:** How the two marks are distinguished by shape, line quality, and label so they never rely on color alone.
- **Completed Lines & State Changes:** Line strike-throughs, stamp fills, or win condition indicators. Overlap handling between Host and Guest paths.

## 5. Motion

- **Keyframe Transitions:** Specific animations used during state changes (e.g. drawing strokes, stamps, sliding slips).
- **Duration & Timing:** Keep transitions brief ($\le 300\text{ms}$), one-shot, and settle into static states immediately. Zero continuous animations during active play.
- **Reduced Motion Fallbacks:** Explicit handling under `@media (prefers-reduced-motion: reduce)` (instant display, crossfade, no infinite loops).

## 6. Game Components

- **Buttons & Controls:**
  - Primary button: Minimum 44px height.
  - Secondary / Utility controls: Target at least 36 × 36 CSS pixels (or 44px where space permits), deliberately costed under ADR 0009 while exceeding WCAG 2.5.8 AA (24 × 24px).
  - Destructive styling: Handled via text/border styling rather than large red fills.
- **Navigation & Shell Utilities:** Quiet utility controls aligned above the board (icons, text, focus treatment).
- **Cards / Containers:** Radii standards (e.g. 14px sheet, 8px controls, 3px slips), padding for small (10px at 320px) vs larger viewports.
- **Scoreboard & Player Indicators:** Presentation of Host and Guest names, labels (`"You"`, `"Opponent"`), and turn ownership without duplicating turn copy.
- **Timer & Urgent States:** Turn countdown styling, warning thresholds, and clear visual hierarchy.
- **Overlays & Dialogs:** Sheets, drawers, or modals used for rules, history, and reactions without causing board reflow.

## 7. Entry-Screen Contract Mapping (Planned)

Map the game's tokens to the planned shared entry-screen contract (to be extracted in #22):

| Shared Entry Token | Game Token Mapping | Purpose |
| :--- | :--- | :--- |
| `--entry-surface` | `var(--<game>-surface)` | Background of entry/lobby screens |
| `--entry-surface-raised`| `var(--<game>-surface-raised)` | Cards and interactive containers |
| `--entry-ink` | `var(--<game>-ink)` | Primary titles and body copy |
| `--entry-ink-muted` | `var(--<game>-ink-muted)` | Secondary descriptions and helper labels |
| `--entry-accent` | `var(--<game>-host-ink)` | Accent elements and brand touches |
| `--entry-rule` | `var(--<game>-rule)` | Dividing lines and input borders |
| `--entry-focus` | `var(--<game>-focus)` | Focus outline color |
| `--entry-urgent` | `var(--<game>-urgent)` | Timeout, error, and destructive actions |

## 8. Do's and Don'ts

### Do
- **Do** keep the board as the largest and highest-contrast object on every viewport.
- **Do** test all screens at narrow 320px mobile viewport widths and 200% text zoom.
- **Do** provide non-color indicators for all player ownership and game state.
- **Do** use one-shot transitions and provide static reduced-motion states.

### Don't
- **Don't** swap Host blue and Guest red inks or use them as generic UI colors.
- **Don't** add persistent vertical rows that cause the Match board to scroll.
- **Don't** use decorative continuous animations during active gameplay.
- **Don't** hide the numeric countdown in a color-only radial gauge.

## 9. Screenshot References (Planned)

Reference baseline visual captures of the game's primary screens (at 390 × 844 viewport):
- Entry / lobby screens (e.g. baseline captures planned in #18: Choice, Host lobby, Join code, Stranger search).
- Match play screens (Host turn, Guest turn, Timer urgency).
- Match result / Game over screen.
```
