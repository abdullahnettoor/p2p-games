# P2P Games

Peer-to-peer web games played directly between two browsers over WebRTC data channels with zero server-side gameplay coordination.

## Games Included

- **BINGO Sunday Puzzle**: Authentic paper-stationery themed two-player Bingo with tactile board setup, ink stamps, dynamic line-tracking, sound effects, and reaction emojis.
- **Tic-Tac-Toe**: Classic 3x3 turn-based board game.

## Key Features

- **P2P via WebRTC & PeerJS**: Direct data channel connection between peers.
- **Short Human-Friendly Room Codes**: Unambiguous 6-character room codes (`?room=CODE`) with namespaced host peer IDs (`p2pgames-<game>-<CODE>`) and collision regeneration.
- **Lobby Resilience & Mobile Recovery**: Automatic signaling reconnection upon tab backgrounding (`visibilitychange`) and network reconnection (`online`). The lobby UI explicitly indicates reconnecting status to prevent scanning dead invites.
- **Invite Options**: Share via native Web Share API, direct link copy, QR code modal, or short 6-character room code entry.

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run test suite
npm test

# Run type check
npm run typecheck

# Build for production
npm run build
```

## Multi-Device Testing

When testing multiplayer connections across real phones or different devices, **do not test directly against `http://localhost:3000` or `next dev`**.

Please refer to the comprehensive [Multi-Device Testing Guide](docs/multi-device-testing.md) for instructions on using **Vercel preview deployments** or **Cloudflare tunnels** (`cloudflared`).
