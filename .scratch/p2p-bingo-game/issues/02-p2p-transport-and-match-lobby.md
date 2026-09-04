# 02: P2P Transport Layer & Multiplayer Match Lobby

**What to build:** An abstracted peer-to-peer Transport layer using WebRTC DataChannels (PeerJS) with loopback test adapter support, paired with an interactive pre-match Lobby. A Host can create a Match and copy an invite link; a Guest can join via the link without an account; both players customize their display names, configure their boards, toggle Ready status, and synchronously transition into the Match.

**Blocked by:** 01: Platform Foundation & Local Playable BINGO Engine

**Status:** ready-for-agent

- [ ] Abstracted Transport interface supporting connection lifecycle, typed signaling messages (Ready, Move, Reaction, Rematch, Heartbeat), and disconnection events.
- [ ] PeerJS WebRTC DataChannel implementation with public STUN configuration for zero-cost direct browser-to-browser connection.
- [ ] Virtual loopback Transport adapter for deterministic automated multi-client testing.
- [ ] Landing page UI with one-click "Create BINGO Match" action generating a shareable invite URL.
- [ ] Guest join flow handling invite URLs and connecting directly to the Host.
- [ ] Interactive pre-game Lobby displaying connection status, customizable Player names, and board setup.
- [ ] Dual-sided Ready toggle ensuring Match only starts when both Host and Guest are ready with valid boards.
- [ ] Automated integration tests for Host/Guest connection establishment and synchronized Lobby state transitions.
