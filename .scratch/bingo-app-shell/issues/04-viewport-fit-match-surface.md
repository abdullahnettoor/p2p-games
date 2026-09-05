# 04: Fit the Match Surface to the Viewport

Status: ready-for-agent

Blocked by: 01, 02

## What to build

Consolidate the Match surface from a 1211px scrolling document into a `100dvh` column where the Board is sized by available height.

## Acceptance criteria

- [ ] The Match is a `100dvh` flex column that does not page-scroll at default text size at 320x568 or above.
- [ ] Persistent chrome is a Shell bar, a status strip, and an action row, totalling roughly 150px of non-Board height.
- [ ] The Shell bar carries exit, sound, and the rules sheet.
- [ ] The status strip carries both Players with ink, name, B-I-N-G-O stamps, and line count, plus whose turn it is and the numeric timer, with no duplication elsewhere.
- [ ] The action row carries Pass, Doodle, and Match notes.
- [ ] The Board is flex-grow, square, sized by available height and capped by width; width-driven `aspect-ratio: 1` sizing is replaced.
- [ ] The Board is the largest object on every supported viewport.
- [ ] The Call slip is a transient overlay over the Board edge; the unconditional 56px reserved slot is removed.
- [ ] The recent-Calls trail renders below the Board only when height permits and is the first thing cut at 320px.
- [ ] Match notes, rules, and reactions open as sheets or popovers costing no persistent height.
- [ ] The reconnection banner overlays pinned to the Shell bar and never reflows the Board.
- [ ] Landscape reflows to a two-column layout with the Board left and status right.
- [ ] When content genuinely cannot fit, the container falls back to page scrolling rather than clipping.
- [ ] The exit control confirms during an active Match, naming the forfeit and the winning Player, in the same voice as the Pass confirmation.
- [ ] Platform gesture and hardware back route through the same guard via a history entry.
- [ ] Board cells are at least 44x44 CSS pixels; other controls are at least 36x36.
- [ ] Existing Call scribbles, line strokes, stamps, announcements, timer urgency, audio, and reduced-motion behavior are preserved.
- [ ] Component tests cover status strip consolidation, the overlay Call slip, sheet behavior, and the exit guard.

## Notes

Runs in parallel with issue 03.

Measured baseline at 390x844: document 1211px, non-Board stack ~631px, Board 316.6px. `.callSlipSlot` reserves 56px unconditionally at widths under 48rem even with no Call.

At 320x568 roughly 468 usable dvh remains after mobile browser chrome, so non-Board content must reach ~150px for the Board to get ~300px. This is consolidation, not trimming.
