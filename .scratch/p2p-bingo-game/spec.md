# Feature Spec: P2P Web Games Platform & BINGO Game

Status: ready-for-agent

## Problem Statement

Casual gamers and friends who want to play quick, real-time multiplayer 1-on-1 games (like BINGO) often face high friction: mandatory account creation, intrusive advertisements, heavy app downloads, or clunky browser implementations with unreliable connections. Furthermore, hobbyist game platforms struggle with high infrastructure and backend hosting costs when managing persistent game servers and WebSockets for real-time multiplayer matches.

## Solution

A zero-install, lightweight, browser-based peer-to-peer multiplayer platform hosted statically (e.g. on Vercel Hobby) with zero ongoing backend server cost. Players can immediately create a Match, share an invite link, connect directly via WebRTC DataChannels, configure their boards, and play a deterministic 1-on-1 game of BINGO with turn timers, synthesized sound effects, transient emoji reactions, reconnection grace periods, and instant rematches. The architecture cleanly separates the core networking/lobby shell from modular GameDefinition plugins so additional games can be introduced without modifying transport or lobby logic.

## User Stories

1. As a Host, I want to create a new BINGO Match from the landing page with one click, so that I can immediately get a shareable invite link without registering an account.
2. As a Host, I want to copy a direct Match invite URL to my clipboard, so that I can easily share it with a friend via chat or messaging apps.
3. As a Host, I want to see a live visual indicator in the Lobby showing whether a Guest is connecting or connected, so that I know when my friend has joined.
4. As a Guest, I want to open the invite URL on my browser and immediately connect to the Host's Lobby, so that I can join the Match without downloads or logins.
5. As a Player, I want to enter or customize my display name in the Lobby, so that my opponent recognizes who they are playing against.
6. As a Player, I want to populate my 5x5 BINGO board manually by clicking available numbers from 1 to 25, so that I can play with my preferred strategic layout.
7. As a Player, I want a "Randomize Board" button to auto-fill all 25 numbers in valid random order with a single tap, so that I can set up my board quickly without tedious manual entry.
8. As a Player, I want to clear or edit my board before marking myself as ready, so that I can fix any mistakes in my number layout.
9. As a Player, I want to click a "Ready" button in the Lobby once my board is set up, so that the platform knows I am prepared to begin.
10. As a Player, I want the Match to automatically start only when both the Host and Guest have submitted valid boards and toggled their Ready status, so that neither player is caught off guard.
11. As a Player, I want the platform to randomly or fairly assign the starting turn upon Match launch, so that the initial advantage is unbiased.
12. As a Player, I want a clear visual cue indicating whose turn it currently is, so that I always know when I need to make a Move.
13. As a Player, I want an active 30-second countdown timer for each turn, so that the game keeps moving at a brisk pace.
14. As a Player, I want the turn to automatically pass if the active player fails to pick a number before the 30-second timer expires, so that the Match does not stall indefinitely.
15. As an active Player, I want to click an uncalled number on my board during my turn to submit a Move, so that the number is broadcast to both players.
16. As a non-active Player, I want my opponent's selected number to immediately be marked and highlighted on my own board, so that both boards stay synchronized.
17. As a Player, I want completed rows, columns, and diagonals on my board to automatically light up and count towards the letters B-I-N-G-O, so that I can track my progress toward victory.
18. As a Player, I want a synthesized audio sound effect to play when numbers are picked, turns change, lines are completed, and when a player wins, so that the gameplay feels responsive and satisfying without downloading audio assets.
19. As a Player, I want a quick-access emoji reaction bar to send transient emoji reactions (e.g., 👋, 😂, 😱, 🔥, 👏) to my opponent during the Match, so that we can communicate playfully in real time.
20. As a Player, I want to see transient emoji reactions float on screen and disappear after a short duration, so that reactions are fun and do not clutter the board.
21. As a Player, I want my win condition (5 completed lines forming B-I-N-G-O) to be verified deterministically on both clients upon completing the 5th line, so that no player can falsely claim victory.
22. As a Player, I want a clear game-over screen declaring the Winner and Loser once a Match concludes, so that the outcome is indisputable.
23. As a Player on the game-over screen, I want a "Request Rematch" button that sends a rematch invitation over the existing WebRTC DataChannel, so that we can play another Match without creating a new Lobby or link.
24. As a Player whose opponent requested a rematch, I want to see an "Accept Rematch" prompt, so that both players can reset their boards and play again instantly.
25. As a Player who temporarily switches mobile tabs or experiences a brief network hiccup, I want a 30-second reconnection grace period where my Match state is cached in localStorage, so that I do not immediately forfeit the Match.
26. As a Player whose opponent disconnects, I want to see a countdown timer for their 30-second reconnection window, so that I know whether they are reconnecting or leaving.
27. As a Player whose opponent fails to reconnect within the 30-second grace period, I want the Match to award me a victory by forfeit, so that my time is respected.
28. As a Player, I want the game UI to be fully responsive across mobile phones, tablets, and desktop browsers, so that I can play seamlessly on any screen size.
29. As a Developer, I want each game to conform to a standard GameDefinition interface, so that future games (like Tic-Tac-Toe or Hangman) can be plugged into the platform without touching the Transport or Lobby lifecycle.

## Implementation Decisions

- **Modular Architecture & Domain Vocabulary**: Strict adherence to the domain glossary defined in CONTEXT.md (Game, Match, Player, Host, Guest, Move, Lobby, Transport).
- **Game Plugin Abstraction**: All game rules, state transitions, validation, and rendering conform to a pluggable GameDefinition interface (`init`, `validateMove`, `applyMove`, `checkWin`, `renderBoard`, `renderSetup`).
- **P2P Transport Layer**: WebRTC DataChannels orchestrated via PeerJS with fallback adapter architecture. Handles typed message signaling (Move, Ready, Reaction, Rematch, Heartbeat).
- **Symmetric Deterministic Game Validation**: Pure reducer running symmetrically on both Host and Guest clients without requiring an authoritative game server.
- **State Caching & Reconnection**: Active match metadata cached in localStorage; a 30-second grace period allows reconnection before declaring a forfeit.
- **Synthesized Audio & Reactions**: Zero-asset sound effects generated with Web Audio API; transient peer-to-peer emoji reactions rendered as ephemeral animations.
- **Rematch Lifecycle**: In-place instant rematch negotiation reusing the open WebRTC DataChannel.

## Testing Decisions

- **Testing Principles**: Tests strictly evaluate external observable behaviors (player actions, network messages, state outcomes) rather than private implementation details.
- **Primary High Seam (Dual-Client Match Lifecycle Harness)**: Simulates two connected Players (Host and Guest) across a virtual Transport loopback to test complete user journeys (Lobby creation, joining, board setup, ready toggling, turn-based Move submission, line detection, victory celebration, rematch negotiation, and reconnection handling).
- **Deterministic Engine Seam**: Unit and property-based tests for the pure BINGO state machine (board validations, Move legality, line scoring, deterministic win conditions).
- **Transport Layer Seam**: Unit tests for serialization, heartbeat pings, and reconnection timeout timers.

## Out of Scope

- Multi-player games with > 2 players (strictly 1-on-1 for this release).
- Persistent user accounts, cloud databases, authentication, or global leaderboards.
- Video/voice WebRTC media streaming.
- Native mobile app packages (iOS/Android); pure web browser-based application.
- Monetization or advertisements.

## Further Notes

- Future games (Tic-Tac-Toe, Hangman, Battleship) will implement the same GameDefinition contract and plug into the platform shell with zero networking changes.
