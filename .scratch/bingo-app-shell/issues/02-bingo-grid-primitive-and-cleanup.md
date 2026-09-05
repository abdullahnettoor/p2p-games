# 02: Extract the BingoGrid Primitive and Remove Dead Surfaces

Status: ready-for-human

## What to build

A pure refactor with no intended visual change. Unify the two divergent board renderers, split the CSS module, and delete Pass & Play.

## Acceptance criteria

- [x] A `BingoGrid` primitive owns paper, printed rules, square cells, sizing, and focus rings.
- [x] `BingoBoardView` composes the primitive and keeps its Match play interaction model and accessible semantics.
- [x] `BingoBoardSetup` composes the primitive instead of rendering its own grid.
- [x] The results comparison composes the same primitive.
- [x] No component renders a 5x5 Bingo grid outside the primitive.
- [x] `BingoScorecard.module.css` splits into `bingoTokens.css`, imported once for the shared token scope, plus per-component modules co-located with their components.
- [x] No file owns styles for components it does not render.
- [x] `BingoSoundToggle` styles itself from tokens rather than hardcoded dark Tailwind classes overridden by one call site.
- [x] `BingoLocalGame` and `BingoLocalGame.test.tsx` are deleted, along with any Pass & Play entry points.
- [x] Existing board, setup, and results tests pass with assertions updated only where the DOM shape genuinely moved.
- [x] Typecheck and the full test suite pass.

## Notes

This ticket has nothing to look at and is the one most tempting to skip. Skipping it ships two divergent board renderers into the height-driven layout of issue 04, where they will disagree about cell sizing on some viewports.

Blocks issues 03 and 04, which both consume the primitive and both write styles that would otherwise collide in the 1513-line module.
