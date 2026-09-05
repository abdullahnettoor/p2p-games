# 03: Real-Time P2P BINGO Matchplay & Turn Timer

**What to build:** Live synchronized peer-to-peer 1-on-1 BINGO gameplay. Moves submitted by the active player are broadcast across the DataChannel, marked on both players' boards, validated deterministically on both clients, and accompanied by a synchronized 30-second turn countdown timer that automatically passes the turn if time runs out. The match detects when 5 lines are formed and displays a definitive game-over screen declaring Winner and Loser.

**Blocked by:** 02: P2P Transport Layer & Multiplayer Match Lobby

**Status:** completed

- [x] Deterministic starting player selection on Match launch.
- [x] Turn indicator clearly showing which Player's turn it is.
- [x] Submitting a Move broadcasts the selected number across the Transport.
- [x] Opponent's board automatically marks the called number and recalculates completed lines.
- [x] Active 30-second countdown timer for each turn with visual urgency cues.
- [x] Automatic turn pass (or random valid selection) when the 30-second timer expires.
- [x] Symmetrical win verification on both clients upon completing 5 lines (B-I-N-G-O).
- [x] Game-over screen displaying Match result (Winner / Loser).
- [x] Dual-client integration test executing a full Match from start to victory.
