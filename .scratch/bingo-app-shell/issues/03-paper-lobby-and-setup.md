# 03: Merge Invite, Connection, and Setup Into One Paper Lobby

Status: ready-for-human

Blocked by: 01, 02

## What to build

Collapse the Bingo entry path into a single board-dominant paper Lobby that fits the viewport, and make the invite resolve visibly rather than blocking.

## Acceptance criteria

- [x] Opening Bingo from the Catalog begins creating an online Match immediately, with no intermediate mode-selection screen.
- [x] Invite, connection status, and board setup are one screen, with the setup Board dominant from the first frame.
- [x] The Board is interactive before signaling resolves.
- [x] The invite is a single pill above the Board, showing a quiet preparing state and becoming tappable once a Match ID exists.
- [x] Signaling failure surfaces in the pill as an actionable retry with a plain-language reason, preserving the arranged Board and not replacing the screen.
- [x] Connection state is a one-line status rather than two Player cards.
- [x] A Guest arriving from an invite link sees the identical screen without the invite pill; there is exactly one setup layout.
- [x] Web Share is used where supported, with copy-link fallback and actionable failure feedback.
- [x] Sequential placement, `Place N`, `Undo`, `Clear`, `Shuffle`, swap-two-occupied-cells, and `Ready with this board` all still work through the shared primitive.
- [x] Editing a ready Board still cancels readiness.
- [x] The Shell bar exposes exit, sound, and a `?` control opening a paper rules sheet naming this variant specifically.
- [x] The exit control leaves immediately from the Lobby.
- [x] The whole screen is paper; no dark Tailwind surfaces remain on the path to a Match.
- [x] The screen does not page-scroll at default text size at 320x568 or above.
- [x] Board cells are at least 44x44 CSS pixels; other controls are at least 36x36.
- [x] The existing Lobby ready-state protocol is unchanged.
- [x] Component tests cover invite pill states including failure and retry, sequential placement, readiness cancellation, and the Guest layout.

## Notes

Runs in parallel with issue 04. Their write scopes are disjoint only because issue 02 splits the CSS module first.

This screen is the **Lobby** as `CONTEXT.md` already defines it. Do not introduce a new term for it.
