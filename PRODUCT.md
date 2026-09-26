# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Friends who want to start a quick 1-on-1 game from separate phones without installing an app or creating accounts. Pass & Play on one device is supported but is not the primary playing situation.

## Product Purpose

Provide lightweight browser games that two friends can enter quickly, play directly with each other, and understand without onboarding. Success means low setup friction, clear shared game state, and a complete Match that feels responsive on a phone.

## Positioning

The platform connects two Players directly through a shareable link and peer-to-peer Transport, avoiding accounts, downloads, advertisements, and a persistent game server.

## Operating Context

A Host creates a Match and shares its invite link through an external messaging channel. A Guest opens the link on another phone, both Players configure and ready their game state in the Lobby, and they play a short synchronous Match.

## Capabilities and Constraints

- The initial release supports browser-based, 1-on-1 Games.
- BINGO uses private 5x5 Player boards containing the numbers 1 through 25 and a shared sequence of called numbers.
- Both Players must submit valid boards and become ready before an online Match starts.
- Gameplay is deterministic on both clients and transmitted through peer-to-peer Transport.
- Active online Matches support turn timing, voluntary Passes, transient reactions, reconnection, and rematches.
- A timed-out turn passes to the other Player without making a random Call; the next normal turn returns after the other Player calls, passes, or times out.
- The experience must remain usable across mobile phones, tablets, and desktop browsers, with separate phones as the primary target.
- The BINGO redesign may improve setup, turn feedback, local handoff, motion, sound, and accessibility while preserving the core 1-on-1 Game, board, connection, and five-line win condition.

## Brand Commitments

BINGO should feel like a familiar, polished mobile game expressed as a physical scorecard: restrained paper material, legible printed information, hand-drawn marks, two automatically assigned Player inks, and short tactile feedback. The material treatment must not make controls unfamiliar or reduce board clarity.

All Games must comply with the [Shared Game Design Rules](docs/design/GAME-DESIGN-RULES.md), which define core accessibility, Host (blue) / Guest (red) ink invariants, motion, and viewport constraints.

## Evidence on Hand

- Product and BINGO requirements: `.scratch/p2p-bingo-game/spec.md`
- Shared Game Design Rules: `docs/design/GAME-DESIGN-RULES.md`
- Per-game DESIGN.md Template: `docs/design/DESIGN-TEMPLATE.md`
- Existing BINGO implementation: `src/games/bingo/`
- Existing domain language: `CONTEXT.md`
- There are no confirmed customer claims, testimonials, performance benchmarks, or bespoke visual assets.

## Product Principles

- Get two friends from invitation to play with as little friction as possible.
- Make shared Match state and turn ownership immediately understandable on a phone.
- Keep game rules deterministic and communication peer-to-peer.
- Favor short, purposeful feedback over distracting or continuous effects.
- Preserve legibility and operability while giving each Game room for its own character.
- Adhere to the platform design rules (Host blue / Guest red, text contrast ≥ 4.5:1, 44px targets, viewport contract).

## Accessibility & Inclusion

The interface must support touch, keyboard, assistive technology, reduced-motion preferences, and readable layouts at narrow mobile widths and enlarged text sizes, adhering to the standards outlined in [Shared Game Design Rules](docs/design/GAME-DESIGN-RULES.md).
