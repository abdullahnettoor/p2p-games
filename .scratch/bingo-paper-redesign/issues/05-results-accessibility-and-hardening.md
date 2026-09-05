# 05: Finish Results, Accessibility, and Responsive Hardening

Status: ready-for-human

Blocked by: 01, 02, 03, 04

## What to build

Complete the redesigned Match lifecycle, optional board comparison, interruption messaging, accessibility semantics, and production validation.

## Acceptance criteria

- [x] Result presentation explicitly supports win, loss, forfeit, and draw.
- [x] `Request Rematch` is primary; `Compare Boards`, `Match notes`, and `Exit` are secondary.
- [x] Compare Boards is opt-in and shows both annotated boards without replacing the result context.
- [x] A received rematch request stays visible while reviewing the result.
- [x] Manual Pass confirmation names the consequence and next Player.
- [x] Timeout and return-from-background messages explain what occurred and whose turn it is.
- [x] Connection loss remains distinct from a missed turn and preserves reconnection grace behavior.
- [x] The BINGO Board exposes grid, cell, called, caller, and completed-line semantics.
- [x] Calls, turn changes, lines, Passes, timeout, reconnect state, and results use appropriate live announcements.
- [x] Dialogs and sheets implement focus placement, focus containment where modal, Escape behavior, focus restoration, and short-viewport scrolling.
- [x] All controls meet the 44 by 44 CSS pixel target and visible-focus requirements.
- [x] Player identity never depends on color alone.
- [x] The flow remains usable at narrow widths and enlarged text sizes without overflow.
- [x] Existing and new BINGO tests pass, project diagnostics are clean, and the production build succeeds.
- [x] Desktop and mobile visual inspection confirms the implementation matches `DESIGN.md` and the feature spec.
- [x] Run the Impeccable mechanical detector once over the finished changed UI targets.
