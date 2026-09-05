# Feature Spec: BINGO Paper Scorecard Redesign

Status: ready-for-agent

## Problem

BINGO works, but its current dark dashboard treatment does not give the Game a distinct physical character. Manual board arrangement requires repeatedly choosing a cell and a number, turn information is duplicated, Calls made by the other Player do not receive a strong arrival moment, and several controls are too small or inaccessible on phones.

The primary use case is two friends playing an online Match from separate phones. The redesign must reduce setup friction, make shared state unmistakable, and add tactile delight without obscuring the board or changing the core 1-on-1 Game.

## Goals

- Give the complete `/bingo` journey a coherent paper-scorecard identity.
- Make online play the dominant path while retaining Pass & Play as a secondary option.
- Reduce manual board arrangement to one meaningful tap per number.
- Show who made every Call through two automatically assigned Player inks.
- Keep the timer, turn, latest Call, and B-I-N-G-O progress understandable at a glance.
- Replace continuous decorative animation with short physical actions and synthesized sound.
- Meet mobile, keyboard, assistive-technology, and reduced-motion requirements.

## Non-goals

- Redesigning the global games platform or other Games.
- Removing Pass & Play.
- Protocol-level secrecy or cryptographic verification of BINGO Boards.
- Accounts, persistent profiles, downloadable audio assets, or notification permission prompts.
- Changing the 5x5 board, values 1 through 25, shared Calls, or five-line win condition.

## Visual direction

### Sunday Puzzle Scorecard

BINGO appears as a crisp, cool off-white score sheet rather than a dark application dashboard or nostalgic beige notebook. The BINGO Board is the dominant object. Printed typography carries numbers, controls, timer values, and status; handwriting is reserved for marks, stamps, and brief annotations.

Two vivid, high-contrast Player inks identify Calls. Color is always reinforced with names, initials, text, and distinguishable mark shapes. Lightweight CSS or SVG texture may suggest paper, but grain must not reduce number contrast. On desktop the score sheet remains centered rather than expanding the board excessively.

## Experience

### Entry

- `Create Online Match` is the dominant action.
- Pass & Play remains a quiet secondary action.
- A Guest following an invite enters the relevant Match directly.

### Lobby and invite

- Prefer the Web Share API for `Share invite`; retain copy-link fallback and show failures.
- Offer a QR code as an optional action.
- Keep connection status visible while the Host arranges a board.
- Show the automatically assigned Player ink beside each Player name.

### BINGO Board setup

- The first empty board contains no assigned values.
- Tapping any empty cell places the next sequential number: the first tap places `1`, the next `2`, through `25`.
- Keep a persistent `Place N` cue and show a touch preview where practical.
- `Undo` removes the most recent placement.
- Selecting two occupied cells swaps their values.
- `Clear` and `Shuffle` remain available.
- `Ready with this board` combines board confirmation and Lobby readiness.
- Editing a locked board cancels readiness.

### Match

- Attach the turn label and visible numeric timer to the board's upper edge.
- Use gentle urgency below ten seconds and stronger, non-alarm feedback only for the final three seconds.
- One tap on an enabled uncalled number immediately commits a Call.
- Represent each Call with its number, caller, and sequence position so both boards can render caller-specific marks.
- Draw a one-shot scribble across the called cell in the caller's ink.
- Show a non-modal call slip on both phones for approximately 1 to 1.5 seconds. Use stronger arrival feedback on the receiving phone, then leave the latest Call persistently visible.
- Show the previous four Calls as a compact trail. Put complete Call, Pass, and timeout chronology behind `Match notes`.
- Draw completed row, column, and diagonal strokes in the BINGO Board owner's ink. Stamp one `B-I-N-G-O` letter per completed line, sequencing multiple lines completed by one Call.
- Keep reactions behind a compact `Doodle` control and render incoming reactions as temporary hand-drawn margin marks.

### Passes and interruptions

- `Pass turn` is available during an active turn.
- Before a manual Pass, explain that the current turn will end and name the next Player.
- A timeout performs a Pass and never chooses a random number.
- A Player may Pass after the opponent times out, returning the next turn to that opponent.
- The timer continues while a browser is backgrounded.
- On return, explain whether a turn was missed and identify the current Player.
- Update the page title and use light vibration for a new turn only where supported and already permitted. Do not request notification permission.
- Keep a missed turn distinct from connection loss; existing reconnection grace behavior remains.

### Match result

- Explicitly support win, loss, forfeit, and draw. A shared Call that gives both Players a fifth line is a draw.
- Make `Request Rematch` the primary action.
- Keep `Compare Boards`, `Match notes`, and `Exit` secondary.
- Never reveal the opponent's board automatically. `Compare Boards` deliberately opens both annotated boards after the Match.
- A received rematch request must remain visible while the Player reviews the result.

## Sound, haptics, and motion

- Synthesize a soft pencil scratch for Call marks.
- Use a paper flick for an incoming call slip.
- Use a restrained stamp impact for each completed line.
- Play a short flourish for BINGO and final-three-second ticks for the active Player.
- Use optional light vibration where supported.
- Preserve a persistent sound toggle and do not play audio before the first Player interaction.
- Honor `prefers-reduced-motion`; reduced motion must retain every state transition without drawing or floating effects.
- Avoid continuous decorative pulsing, spinning, and bouncing.

## Domain and synchronization

- A **Call** is the BINGO-specific number produced by a Player's Move and applied to both BINGO Boards.
- A **Pass** ends a turn without a Call and may be voluntary or timer-driven.
- Call history must retain caller identity and order, not only called numbers.
- Pass and timeout events must be available to Match history.
- Reconnection state must reproduce caller-colored marks, turn history, completed lines, and the current timer state deterministically.
- BINGO Boards remain visually private during the Match but may continue to be present on both clients for deterministic scoring and optional post-Match comparison.

## Accessibility and responsive acceptance criteria

- All interactive targets are at least 44 by 44 CSS pixels.
- The BINGO Board remains operable at a 320px viewport width and with enlarged text.
- The board exposes grid semantics, cell labels, called state, caller identity, and completed-line state.
- Calls, turn changes, completed lines, Passes, timeout, reconnect state, and Match results are announced appropriately.
- Dialogs and sheets provide initial focus, focus containment where modal, Escape behavior, restoration, and small-height scrolling.
- Player identity never depends on color alone.
- Focus indicators remain visible against paper, ink, and marked-cell states.
- Clipboard and share failures produce actionable feedback.
- Narrow layouts do not overflow Player progress, invite, timer, or result controls.

## Validation

- Preserve and update deterministic engine and dual-client integration coverage.
- Add tests for sequential placement, swap, undo, readiness cancellation, Passes, timeout Passes, caller identity, reconnection history, simultaneous draw, optional board comparison, and rematch states.
- Add component tests for accessible names, live announcements, keyboard operation, dialog focus, reduced motion, and narrow viewport behavior where practical.
- Run the full BINGO test suite, project diagnostics, and production build.
- Inspect the complete flow on narrow mobile and desktop viewports before completion.
