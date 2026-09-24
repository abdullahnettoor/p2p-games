# Signaling Reconnect and Custom Broker Configuration

PeerJS signaling brokers (such as the default public `0.peerjs.com`) aggressively close idle WebSockets after 10–30 seconds. In the previous implementation, when a Host created a Match lobby and waited for a Guest to scan the QR code or open the invite link, the transport status remained `'connecting'`. When the signaling server dropped the idle socket, `peer.on('disconnected')` was ignored because the status check checked strictly for `'connected'`, abandoning the peer registration. When the Guest subsequently tried to join with the displayed match ID, the broker returned `peer-unavailable`, falsely claiming the link was invalid.

We resolved this with two complementary improvements:

1. **Automatic Signaling Reconnection in Transport**:
   `PeerJSTransport` now catches signaling disconnects regardless of whether the player is waiting in the Lobby (`status === 'connecting'`) or actively playing (`status === 'connected'`). Reconnection retains the assigned `localPlayerId`, ensuring that QR codes and invite links remain valid indefinitely. Disconnects during active gameplay no longer mark the active P2P DataChannel as down, preventing gameplay interruptions.

2. **Configurable Signaling Broker**:
   While `0.peerjs.com` remains the zero-config fallback, applications can now point to a self-hosted PeerServer or a Cloudflare Worker signaling relay via `NEXT_PUBLIC_PEER_HOST`, `NEXT_PUBLIC_PEER_PORT`, `NEXT_PUBLIC_PEER_PATH`, `NEXT_PUBLIC_PEER_SECURE`, and `NEXT_PUBLIC_PEER_PING_INTERVAL_MS`. A local dev runner (`npm run peer-server`) and a production-ready Cloudflare Worker with Durable Objects (`workers/signaling`) are provided in the repository.
