# 04: Synthesized Web Audio & Transient Emoji Reactions

**What to build:** Immersive real-time audio and social interactions without external asset downloads. Synthesizes procedural sound effects (number clicks, turn switches, line completion chords, victory celebration) using the Web Audio API, and provides an emoji reaction bar for sending floating, transient reactions to the opponent over the DataChannel during active gameplay.

**Blocked by:** 03: Real-Time P2P BINGO Matchplay & Turn Timer

**Status:** completed

- [x] Zero-asset sound engine using Web Audio API oscillators (beeps, line completion chords, game-over fanfares).
- [x] Sound toggle button allowing Players to mute/unmute audio effects.
- [x] Audio triggers on number selection, turn change, line completion, and match conclusion.
- [x] In-game floating emoji reaction bar (e.g., 👋, 😂, 😱, 🔥, 👏).
- [x] Reactions broadcast across the Transport and rendered as ephemeral floating CSS animations on the opponent's screen with auto-cleanup.
- [x] Visual and behavioral tests verifying reaction dispatching and sound trigger events.
