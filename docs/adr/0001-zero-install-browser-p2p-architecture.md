# Zero-Install Browser P2P Architecture on Vercel Hobby

To keep hosting costs at zero and eliminate friction for players, the platform is hosted as a static web application on Vercel Hobby. All game state and player interactions run peer-to-peer directly inside the browser using WebRTC DataChannels (via PeerJS for signaling), avoiding backend server state and serverless timeout constraints. A pluggable Transport interface allows future fallback adapters (e.g. Supabase Broadcast) without restructuring game logic.
