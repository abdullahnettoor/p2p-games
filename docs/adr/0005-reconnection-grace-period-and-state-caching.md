# Reconnection Grace Period and State Caching

To prevent immediate game forfeiture during mobile tab-switching or brief network drops, match state is continuously cached in `localStorage`. Disconnections trigger a 30-second grace period attempting automatic WebRTC reconnection before declaring a forfeit.
