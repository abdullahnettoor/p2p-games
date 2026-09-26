# Shared Game Design Rules

This document defines the non-negotiable visual, accessibility, and architectural rules that apply to every Game built for the platform.

Each Game owns its visual identity, token file, and `DESIGN.md` (see [ADR 0008: Game Shell isolation](../adr/0008-game-shell-isolation.md)). The Catalog retains its dark launcher identity; there is no shared platform-wide token layer (`--p-*`). Instead, coherence across Games is established through these shared rules and the per-game [`DESIGN.md` template](./DESIGN-TEMPLATE.md).

---

## 1. Player Inks & Identity

- **Host = Blue ink; Guest = Red ink.**
  - Every Game must assign the Host to the blue color family and the Guest to the red color family.
  - A Game may calibrate the specific shades to fit its visual world (e.g. Bingo uses fountain blue `#175E9C` and berry red `#A63D57`; a notebook game may use blue ballpoint and red pencil), but **a Game may never swap them or assign them arbitrarily**.
- **Player inks are reserved.**
  - Host blue and Guest red represent Player identity and Player-committed marks/actions only.
  - Neither ink may be used as a generic status color (e.g. do not use Host blue for "connection success" or Guest red for "generic input error").
- **Never color alone.**
  - Player identity and game state must never be communicated by color alone (WCAG 1.4.1).
  - Inks must always be paired with explicit text labels (e.g. `"You"`, `"Opponent"`, Player names), distinct glyph shapes (e.g. crosses vs. loops, X vs. O), or textual state descriptions.

---

## 2. Accessibility & Contrast

- **Text Contrast (WCAG 1.4.3 AA):**
  - All body text, headings, numbers, and actionable labels must achieve a contrast ratio of at least **4.5:1** against their background.
  - Large text (at least 18pt / 24px regular or 14pt / 18.66px bold) and graphical components / user interface controls (WCAG 1.4.11 AA) must achieve at least **3.0:1**.
  - Documented text and background token pairs in each Game's `DESIGN.md` are audited by automated unit tests in `npm test`.
- **Visible Focus:**
  - Every interactive control must provide a high-contrast focus indicator (e.g. a 3px outline with 2px offset) that remains clearly visible against both the game surface and adjacent ink marks.
- **Tapping Target Sizes (WCAG 2.5.5 / 2.5.8):**
  - Primary interactive gameplay targets (board cells, primary buttons) must measure at least **44 × 44 CSS pixels**.
  - Non-board secondary chrome (utility buttons, sound toggles, sheet triggers) may be reduced to a minimum of **36 × 36 CSS pixels** only when strictly costed to satisfy the mobile viewport budget (see [ADR 0009](../adr/0009-viewport-fit-contract-for-game-surfaces.md)), exceeding the WCAG 2.5.8 AA minimum of 24 × 24px.

---

## 3. Motion & Reduced Motion

- **Motion serves clarity, not spectacle.**
  - Animations must be brief (typically $\le 300\text{ms}$), one-shot, and settle into a clear, static resting state immediately.
  - No continuous pulsing, idle animations, or spinning decorations during active gameplay.
- **Reduced Motion Policy (WCAG 2.3.3):**
  - Every Game must implement `@media (prefers-reduced-motion: reduce)`.
  - When reduced motion is requested, animated transitions (e.g. ink draw-in, stamp drop, page turn) must be replaced with instant state changes or subtle crossfades.

---

## 4. Viewport Layout Contract (ADR 0009)

Every Game surface is hosted in a full-bleed `100dvh` container that conforms to [ADR 0009: Viewport-fit contract for Game surfaces](../adr/0009-viewport-fit-contract-for-game-surfaces.md):

- **No page scroll at default zoom:**
  - On viewports of at least **320 × 568px** at default text scale, the entire Match surface must fit within the viewport without vertical scrolling.
- **Board sized by available height:**
  - The board is sized dynamically from available vertical height and capped by width, remaining the dominant object on screen.
- **Non-Board chrome budget:**
  - Chrome outside the board (utility bar, scoreboard, turn indicator, actions) must remain compact (budgeted to approximately 150px total height on small screens).
- **Overlays over reflow:**
  - Mid-game interactions (rules, notes, match logs, reactions) must appear as sheets, drawers, or floating overlays rather than pushing or reflowing the board.
- **Safe fallback:**
  - If content genuinely cannot fit (e.g. at 200% text zoom or extreme landscape), the container must fall back to standard vertical scrolling. Content must **never be clipped**.

---

## 5. Token Layering & Scoping

- **Game ownership of tokens:**
  - Each Game defines its own custom properties under its own class scope:
    - Bingo: `--bingo-*` under `.bingoTokenScope`
    - Tic-Tac-Toe: `--ttt-*` under `.tttTokenScope`
  - A Game's tokens must never be used outside that Game's directory (`src/games/<game>/`). This is enforced by automated guardrail tests in `npm test`.
- **Shared Entry-Screen Contract:**
  - Shared lobby and entry flows (choice screen, room code entry, stranger search, invite pill) consume a small semantic CSS contract:
    - `--entry-surface`: Primary screen background
    - `--entry-surface-raised`: Elevated card and control background
    - `--entry-ink`: Primary text and foreground print
    - `--entry-ink-muted`: Secondary text and subtle labels
    - `--entry-accent`: Highlight or primary brand accent
    - `--entry-rule`: Grid borders and divider lines
    - `--entry-focus`: Keyboard focus ring color
    - `--entry-urgent`: Alert, destructive, and timeout indicator
  - Each Game's token file maps these variables to its own game tokens so shared screens render faithfully within that Game's aesthetic.

---

## 6. Documenting a Game's Design

Every Game must have a `DESIGN.md` in its root directory (`src/games/<game>/DESIGN.md`) structured according to the [Per-Game DESIGN.md Template](./DESIGN-TEMPLATE.md).
