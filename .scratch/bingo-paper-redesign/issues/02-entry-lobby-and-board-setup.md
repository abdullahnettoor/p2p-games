# 02: Redesign Entry, Invitation, and BINGO Board Setup

Status: ready-for-agent

## What to build

Make online play the dominant BINGO entry path and replace the current cell-plus-number-palette setup with sequential placement into freely chosen cells.

## Acceptance criteria

- [ ] `Create Online Match` is the dominant entry action; Pass & Play remains available as a secondary action.
- [ ] Guests following a Match invite bypass mode selection.
- [ ] The Host can use the native share sheet when supported, copy the invite otherwise, and see actionable failure feedback.
- [ ] QR display is optional and does not block setup.
- [ ] Connection status and both Player identities remain visible during setup.
- [ ] Tapping empty cells places `1` through `25` sequentially in the order cells are chosen.
- [ ] The next value is persistently identified as `Place N`.
- [ ] `Undo`, `Clear`, and `Shuffle` work predictably.
- [ ] Choosing two occupied cells swaps their values without losing any number.
- [ ] `Ready with this board` combines confirmation and readiness.
- [ ] Editing a ready board cancels readiness before accepting changes.
- [ ] Setup works with touch and keyboard and uses targets of at least 44 by 44 CSS pixels.
- [ ] Component tests cover sequential placement, correction, randomization, readiness, and sharing fallbacks.

## Dependencies

May proceed alongside issue 01, but integration with ready-state messages must preserve the current Lobby protocol.
