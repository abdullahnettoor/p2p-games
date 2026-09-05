# 04: Add Match Notes, Physical Feedback, and Doodles

Status: ready-for-agent

Blocked by: 01, 03

## What to build

Complete the tactile and social feedback system around the scorecard without allowing effects to compete with gameplay.

## Acceptance criteria

- [ ] Keep the latest Call persistently visible beside the board status.
- [ ] Show the previous four Calls as a compact caller-colored trail.
- [ ] Provide expandable Match notes containing all Calls, Passes, and timeouts in order.
- [ ] Convert the reaction launcher into one compact Doodle control.
- [ ] Render incoming reactions as temporary hand-drawn margin doodles with accessible text equivalents.
- [ ] Synthesize pencil-scratch, paper-flick, line-stamp, BINGO, defeat/draw, and final-three-second timer feedback through Web Audio.
- [ ] Preserve the persistent sound preference and browser interaction gate.
- [ ] Use optional light vibration only where supported and permitted.
- [ ] Update the document title when a backgrounded Player's turn begins without requesting notification permission.
- [ ] Muted and reduced-motion modes preserve all state information.
- [ ] Audio precedence prevents overlapping effects from becoming noisy.
- [ ] Tests cover history rendering, reaction transport, mute behavior, and event-to-sound mapping.
