# 03: Build the Paper Scorecard Match Surface

Status: ready-for-agent

Blocked by: 01

## What to build

Replace the current dark dashboard-style BINGO Match with the confirmed Sunday Puzzle Scorecard direction. Establish the durable Bingo visual system before editing the surface.

## Acceptance criteria

- [ ] Create `DESIGN.md` before UI implementation, documenting the paper, typography, Player ink, control, state, motion, and responsive rules that apply across Bingo.
- [ ] Use route-scoped design tokens instead of repeating hard-coded Tailwind color combinations.
- [ ] Render a crisp, cool off-white score sheet with restrained lightweight texture.
- [ ] Keep printed information highly legible; reserve handwriting for marks, stamps, and brief notes.
- [ ] Assign two distinct, accessible Player inks automatically and show them beside names.
- [ ] Keep the BINGO Board as the dominant object on phone and desktop layouts.
- [ ] Consolidate duplicated turn UI into one turn label and timer attached to the board.
- [ ] Keep the numeric timer visible throughout the turn with restrained final-ten and final-three-second urgency.
- [ ] One tap immediately commits an enabled Call.
- [ ] Draw caller-specific, one-shot scribbles over called cells.
- [ ] Draw owner-specific strokes over completed rows, columns, and diagonals, including overlapping lines.
- [ ] Stamp B-I-N-G-O progress in sequence when one Call completes multiple lines.
- [ ] Present a non-modal call slip on both screens without obscuring or delaying the board.
- [ ] Preserve clear static end states and honor reduced-motion preferences.
- [ ] Verify the board at approximately 320px viewport width and on desktop.
