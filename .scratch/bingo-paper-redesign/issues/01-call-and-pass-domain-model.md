# 01: Model Calls, Passes, and Timeout Turns

Status: completed

## What to build

Update the deterministic BINGO state and P2P Match flow so a Call retains caller identity and a turn may end with an explicit Pass. Timer expiry must Pass instead of selecting a random number.

## Acceptance criteria

- [x] A Call records its number, calling Player, and deterministic sequence order.
- [x] Existing called-number validation and line scoring remain deterministic on both clients.
- [x] The active Player can submit a Pass without a Call.
- [x] Timer expiry submits or applies the same domain outcome as a Pass and never selects a number.
- [x] Consecutive Passes are valid and alternate turns normally.
- [x] Simultaneous fifth lines remain a draw.
- [x] Reconnection restores Call ownership, Pass/timeout history, active Player, and board scoring.
- [x] Invalid, duplicate, out-of-turn, and post-completion Moves remain rejected.
- [x] Unit and dual-client integration tests cover Calls, voluntary Passes, timeout Passes, reconnection, and draws.

## Notes

Preserve the external `GameDefinition` boundary. Prefer one authoritative ordered Match history from which `calledNumbers` can be derived over parallel arrays that can drift.
