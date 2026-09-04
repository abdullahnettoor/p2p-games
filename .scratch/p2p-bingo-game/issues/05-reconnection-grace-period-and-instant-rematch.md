# 05: State Caching, 30s Reconnection Grace Period & Instant Rematches

**What to build:** Seamless connection resilience and instant replayability. Active Match state is continuously cached in localStorage so brief network interruptions or mobile tab switches trigger a 30-second reconnection grace period with a live countdown rather than immediate failure; if the peer fails to reconnect, a victory by forfeit is awarded. On the game-over screen, either player can request a Rematch, allowing both players to reset boards and play again over the existing DataChannel without generating a new invite link.

**Blocked by:** 03: Real-Time P2P BINGO Matchplay & Turn Timer

**Status:** ready-for-agent

- [ ] Match state and player identity cached in localStorage throughout the session.
- [ ] Disconnection detection initiating an automated 30-second reconnection grace period.
- [ ] Reconnection banner with live 30-second countdown timer displayed to the remaining Player.
- [ ] Automatic state re-synchronization upon successful peer reconnection within the grace period.
- [ ] Automatic victory by forfeit awarded if disconnected player does not return before timer expiry.
- [ ] In-place "Request Rematch" and "Accept Rematch" negotiation over the existing DataChannel.
- [ ] Board reset and transition back to Lobby/Setup state for subsequent matches without new URLs.
- [ ] Automated tests for disconnection timeout/forfeit and instant rematch lifecycle.
