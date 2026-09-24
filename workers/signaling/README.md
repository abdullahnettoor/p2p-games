# Cloudflare Workers PeerJS Signaling Server

A lightweight, zero-maintenance signaling server for PeerJS WebRTC connections built on Cloudflare Workers and Durable Objects.

## Features

- **No Idle Timeouts**: Durable Objects maintain active WebSocket connections with low latency.
- **Zero Fixed Cost**: Runs on Cloudflare's free tier (Workers & Durable Objects).
- **Compatible with PeerJS Protocol**: Implements the standard PeerJS broker endpoints (`GET /id`, WebSockets handshake, Heartbeat, and SDP exchange).

## Deployment

1. Navigate to this directory:
   ```bash
   cd workers/signaling
   ```

2. Deploy using Wrangler:
   ```bash
   npx wrangler deploy
   ```

3. Note your assigned worker URL, e.g. `p2p-games-signaling.<your-subdomain>.workers.dev`.

## Configuration in Next.js Game App

Add the following to your `.env.local` in the project root:

```env
NEXT_PUBLIC_PEER_HOST=p2p-games-signaling.<your-subdomain>.workers.dev
NEXT_PUBLIC_PEER_PORT=443
NEXT_PUBLIC_PEER_PATH=/
NEXT_PUBLIC_PEER_SECURE=true
```
