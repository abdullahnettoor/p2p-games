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
  - Documented text and background token pairs in each Game's token stylesheet and `DESIGN.md` are audited by automated unit tests in `npm test`.
- **Visible Focus:**
  - Every interactive control must provide a high-contrast focus indicator (e.g. a 3px outline with 2px offset) that remains clearly visible against both the game surface and adjacent ink marks.
- **Tapping Target Sizes (WCAG 2.5.5 / 2.5.8 & ADR 0009):**
  - Board cells must measure at least **44 × 44 CSS pixels** where viewport width permits.
  - Other touch controls target at least **36 × 36 CSS pixels** (or 44px where space permits), including controls on result and comparison screens. This reduction from 44px is deliberately costed to preserve the mobile viewport budget under [ADR 0009](../adr/0009-viewport-fit-contract-for-game-surfaces.md) while comfortably exceeding the WCAG 2.5.8 AA minimum of 24 × 24px.

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

- **100dvh-first Shell screens:**
  - The Match, Lobby, result, and comparison surfaces are `100dvh`-first Shell screens.
  - Their containers may page-scroll only when content genuinely cannot fit; they must not clip content to preserve a nominal no-scroll state.
- **Board sized by available height:**
  - The board is sized dynamically from available vertical height and capped near 480px on wide screens, remaining the dominant square object on screen.
- **Non-Board chrome budget:**
  - The non-Board Match budget is approximately 150px: Shell bar, status strip, and action row share that budget.
- **Overlays over reflow:**
  - Call slips, transient announcements, and mid-game interactions (rules, notes, match logs, reactions) must appear as sheets, drawers, or floating overlays rather than pushing or reflowing the board.
- **Landscape reflow:**
  - Landscape uses a Board-left/status-right reflow. Supporting information and expanded notes stack below the status strip in the right column, using freed horizontal space while keeping the board the largest object.
- **Safe fallback:**
  - At 200% text zoom or extreme landscape, text and controls may cause page scrolling when the content genuinely cannot fit; no content is clipped and browser zoom remains enabled.

---

## 5. Token Layering & Scoping

- **Game ownership of tokens:**
  - Each Game defines its own custom properties under its own class scope:
    - Bingo: `--bingo-*` under `.bingoTokenScope`
    - Tic-Tac-Toe: `--ttt-*` under `.tttTokenScope` *(planned in #21)*
  - A Game's tokens must never be used outside that Game's directory (`src/games/<game>/`). This is enforced by automated guardrail tests in `npm test`.
- **Shared components constraint:**
  - Shared components (such as shared entry screens or platform chrome outside of a specific game folder) must never reference game-scoped tokens (`--bingo-*`, `--ttt-*`).
  - Shared entry screens consume only the shared entry contract variables (`--entry-*`).
- **Shared Entry-Screen Contract:**
  - Shared lobby and entry flows (choice screen, room code entry, stranger search, invite pill) consume a small semantic CSS contract:
    - `--entry-surface`: Primary screen background
    - `--entry-surface-raised`: Elevated card and control background
    - `--entry-ink`: Primary text and foreground print
    - `--entry-ink-muted`: Secondary text and subtle labels
    - `--entry-accent`: Host player brand accent and primary action highlights (blue family)
    - `--entry-accent-guest`: Guest player brand accent and join-code highlights (red family)
    - `--entry-warning`: Turn timer and stranger matchmaking warning
    - `--entry-rule`: Grid borders and divider lines
    - `--entry-focus`: Keyboard focus ring color
    - `--entry-urgent`: Alert, destructive, and timeout indicator
    - `--entry-font-label`: Optional compact label font for buttons and badges
  - Each Game's token file maps these variables to its own game tokens so shared screens render faithfully within that Game's aesthetic.

---

## 6. Documenting a Game's Design

Every Game must have a `DESIGN.md` in its root directory (`src/games/<game>/DESIGN.md`) structured according to the [Per-Game DESIGN.md Template](./DESIGN-TEMPLATE.md).
