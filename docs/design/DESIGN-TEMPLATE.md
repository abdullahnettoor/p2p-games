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

*(All text and interactive color pairs documented here are verified by automated contrast tests in `npm test`.)*

## 3. Surface and Board

- **Surface Treatment:** Background materials, colors, boundaries, and shadows.
- **Board Sizing & Geometry:** How the board sizes from available vertical height (ADR 0009) and caps at max width.
- **Grid & Dividers:** Line weights, border styles, and alignment rhythm.
- **Compact Viewport Adaptations:** Padding, gutter, and layout behavior on 320px–390px mobile screens.

## 4. Pieces and Marks

- **Host Mark:** Visual appearance, stroke style, and geometry in Host blue ink.
- **Guest Mark:** Visual appearance, stroke style, and geometry in Guest red ink.
- **Differentiators:** How the two marks are distinguished by shape, line quality, and label so they never rely on color alone.
- **Completed Lines & State Changes:** Line strike-throughs, stamp fills, or win condition indicators. Overlap handling between Host and Guest paths.

## 5. Motion

- **Keyframe Transitions:** Specific animations used during state changes (e.g. drawing strokes, stamps, sliding slips).
- **Duration & Timing:** Keep transitions brief ($\le 300\text{ms}$), one-shot, and settle into static states.
- **Reduced Motion Fallbacks:** Explicit handling under `@media (prefers-reduced-motion: reduce)` (instant display, crossfade, no infinite loops).

## 6. Game Components

- **Buttons & Controls:** Primary, secondary, and utility buttons; dimensions ($\ge 44\text{px}$ primary, $\ge 36\text{px}$ compact chrome); hover, active, and focus styles.
- **Scoreboard & Player Indicators:** Presentation of Host and Guest names, labels (`"You"`, `"Opponent"`), and turn ownership.
- **Timer & Urgent States:** Turn countdown styling, warning thresholds, and clear visual hierarchy.
- **Overlays & Dialogs:** Sheets, drawers, or modals used for rules, history, and reactions without causing board reflow.

## 7. Entry-Screen Contract Mapping

Map the game's tokens to the shared entry-screen contract:

| Shared Entry Token | Game Token Mapping | Purpose |
| :--- | :--- | :--- |
| `--entry-surface` | `var(--<game>-surface)` | Background of entry/lobby screens |
| `--entry-surface-raised`| `var(--<game>-surface-raised)` | Cards and interactive containers |
| `--entry-ink` | `var(--<game>-ink)` | Primary titles and body copy |
| `--entry-ink-muted` | `var(--<game>-ink-muted)` | Subheadings, hints, and muted labels |
| `--entry-accent` | `var(--<game>-host-ink)` | Accent elements and brand touches |
| `--entry-rule` | `var(--<game>-rule)` | Dividing lines and input borders |
| `--entry-focus` | `var(--<game>-focus)` | Focus outline color |
| `--entry-urgent` | `var(--<game>-urgent)` | Timeout, error, and destructive actions |

## 8. Do's and Don'ts

### Do
- **Do** prioritize board clarity and fast readability above decorative detail.
- **Do** test all screens at narrow 320px mobile viewport widths and 200% text zoom.
- **Do** provide non-color indicators for all player ownership and game state.

### Don't
- **Don't** swap Host blue and Guest red inks or use them as generic UI colors.
- **Don't** add persistent vertical rows that cause the Match board to scroll.
- **Don't** use decorative continuous animations during active gameplay.

## 9. Screenshot References

Reference baseline visual captures of the game's primary screens (at 390 × 844 viewport):
- Choice / Entry screen
- Room creation / Host lobby
- Room join / Guest code input
- Match play (Host turn, Guest turn, Timer urgency)
- Match result / Game over screen
```
