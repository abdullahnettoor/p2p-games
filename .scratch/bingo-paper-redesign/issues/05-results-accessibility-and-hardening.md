# 05: Finish Results, Accessibility, and Responsive Hardening

Status: ready-for-agent

Blocked by: 01, 02, 03, 04

## What to build

Complete the redesigned Match lifecycle, optional board comparison, interruption messaging, accessibility semantics, and production validation.

## Acceptance criteria

- [ ] Result presentation explicitly supports win, loss, forfeit, and draw.
- [ ] `Request Rematch` is primary; `Compare Boards`, `Match notes`, and `Exit` are secondary.
- [ ] Compare Boards is opt-in and shows both annotated boards without replacing the result context.
- [ ] A received rematch request stays visible while reviewing the result.
- [ ] Manual Pass confirmation names the consequence and next Player.
- [ ] Timeout and return-from-background messages explain what occurred and whose turn it is.
- [ ] Connection loss remains distinct from a missed turn and preserves reconnection grace behavior.
- [ ] The BINGO Board exposes grid, cell, called, caller, and completed-line semantics.
- [ ] Calls, turn changes, lines, Passes, timeout, reconnect state, and results use appropriate live announcements.
- [ ] Dialogs and sheets implement focus placement, focus containment where modal, Escape behavior, focus restoration, and short-viewport scrolling.
- [ ] All controls meet the 44 by 44 CSS pixel target and visible-focus requirements.
- [ ] Player identity never depends on color alone.
- [ ] The flow remains usable at narrow widths and enlarged text sizes without overflow.
- [ ] Existing and new BINGO tests pass, project diagnostics are clean, and the production build succeeds.
- [ ] Desktop and mobile visual inspection confirms the implementation matches `DESIGN.md` and the feature spec.
- [ ] Run the Impeccable mechanical detector once over the finished changed UI targets.
