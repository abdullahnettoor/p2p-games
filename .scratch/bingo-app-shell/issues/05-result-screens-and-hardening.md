# 05: Result Screens, Desktop Layout, and Hardening

Status: ready-for-agent

Blocked by: 01, 02, 03, 04

## What to build

Convert the Match result from a modal into full Shell screens, give desktop a use for its horizontal space, and validate the whole flow.

## Acceptance criteria

- [ ] The Match result is a full Shell screen rather than a modal over the Board.
- [ ] `Compare Boards` is its own full screen showing both annotated Boards.
- [ ] Win, loss, forfeit, and draw remain explicitly supported.
- [ ] `Request Rematch` remains primary; `Compare Boards`, `Match notes`, and `Exit` remain secondary.
- [ ] A received rematch request stays visible while the Player reviews the result or compares Boards.
- [ ] Focus placement, focus restoration, Escape behavior, and live-announcement semantics from the existing result dialog are preserved through the conversion to screen navigation, not dropped.
- [ ] Desktop caps the Board near 480px and spends freed horizontal space on a side column carrying the recent-Calls trail and expanded notes; the notes sheet is unnecessary there.
- [ ] Result and comparison screens hold the no-scroll contract, falling back to page scrolling only when content genuinely cannot fit.
- [ ] Board semantics, caller identity, completed-line descriptions, and colour-independent Player identity are intact across all screens.
- [ ] Board cells are at least 44x44 CSS pixels and other controls at least 36x36 across every screen in the flow.
- [ ] The flow holds at 200% text zoom, scrolling gracefully beyond it.
- [ ] `src/games/bingo/DESIGN.md` documents the layout contract: height-driven Board, ~150px non-Board budget, 44px cells and 36px controls, overlay-not-reflow, desktop side column, landscape reflow, and the scrolling fallback. (The file has already been moved out of the repository root.)
- [ ] Typecheck, the full test suite, and the production build pass.
- [ ] No committed end-to-end suite is added.

## Validation to report

Measure and report actual document height against viewport height, at default text size and at 200% zoom, for:

- 320x568
- 390x844
- 844x390 landscape
- 1440x900

Report these as measurements, not as a maintained test file. Manual visual acceptance is the user's.

## Notes

The no-scroll contract has no automated guard by decision. Record the measured numbers in this ticket so a future regression has a baseline to compare against.
