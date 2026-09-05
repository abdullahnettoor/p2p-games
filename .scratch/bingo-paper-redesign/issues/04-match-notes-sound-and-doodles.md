# 04: Add Match Notes, Physical Feedback, and Doodles

Status: ready-for-human

Blocked by: 01, 03

## What to build

Complete the tactile and social feedback system around the scorecard without allowing effects to compete with gameplay.

## Acceptance criteria

- [x] Keep the latest Call persistently visible beside the board status.
- [x] Show the previous four Calls as a compact caller-colored trail.
- [x] Provide expandable Match notes containing all Calls, Passes, and timeouts in order.
- [x] Convert the reaction launcher into one compact Doodle control.
- [x] Render incoming reactions as temporary hand-drawn margin doodles with accessible text equivalents.
- [x] Synthesize pencil-scratch, paper-flick, line-stamp, BINGO, defeat/draw, and final-three-second timer feedback through Web Audio.
- [x] Preserve the persistent sound preference and browser interaction gate.
- [x] Use optional light vibration only where supported and permitted.
- [x] Update the document title when a backgrounded Player's turn begins without requesting notification permission.
- [x] Muted and reduced-motion modes preserve all state information.
- [x] Audio precedence prevents overlapping effects from becoming noisy.
- [x] Tests cover history rendering, reaction transport, mute behavior, and event-to-sound mapping.
