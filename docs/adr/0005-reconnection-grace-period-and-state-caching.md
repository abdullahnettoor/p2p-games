# Reconnection Grace Period and State Caching

To prevent immediate game forfeiture during mobile tab-switching or brief network drops, match state is continuously cached in `localStorage`. Disconnections trigger a 30-second grace period attempting automatic WebRTC reconnection before declaring a forfeit.

## Resuming after a reload

A reload within the grace window resumes the cached Match instead of showing the entry screens. The reloaded page reclaims its previous peer id (retrying while the broker still holds it), and a Guest redials the Host whenever the link drops during a Match, which also covers the Host reloading. Only friend Matches resume: a stranger Host gives up its broker slot once paired, so its peer id can't be safely reclaimed.
