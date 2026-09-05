# ICE Configuration: STUN by Default, TURN Opt-In via Environment

WebRTC DataChannels only open if ICE connectivity checks succeed. Signaling working (both Players found each other through PeerJS) tells us nothing about whether the direct path will establish, so these are treated as two distinct failure modes.

Transport ships with public STUN servers only. TURN relays are opt-in through `NEXT_PUBLIC_TURN_URLS`, `NEXT_PUBLIC_TURN_USERNAME`, and `NEXT_PUBLIC_TURN_CREDENTIAL`. There is no free public TURN relay the platform can depend on, and hardcoding one produces a false sense of coverage: the previously hardcoded `eu-0.turn.peerjs.com` and `us-0.turn.peerjs.com` entries had stopped resolving in DNS entirely, so Players behind symmetric NAT had no relay despite the config implying otherwise.

Without a configured TURN relay, Players behind symmetric NAT, a corporate firewall, or a VPN that captures UDP (Cloudflare WARP being the common case) cannot connect. Transport therefore reports ICE failure with a message naming those causes rather than blaming the invite link, and applies the timeout on both Host and Guest so neither side waits indefinitely.

Verified by `npm run test:webrtc-env`, which probes whether plain WebRTC can complete ICE on the current machine at all, independent of any application code.
