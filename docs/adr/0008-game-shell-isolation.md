# Game Shell isolation

Platform chrome previously wrapped every route from a single root layout, so the dark header, constrained `<main>`, and footer bled into Bingo's paper identity — costing 21.6% of the Match viewport on a phone, producing three stacked back affordances, and scrolling a sticky `z-50` header over the scorecard. We split `src/app` into a `(platform)` route group that owns the chrome and a `(game)` route group that renders a bare full-bleed shell, so a Game route cannot inherit platform chrome by construction.

We rejected conditionally hiding the chrome on game routes because it preserves the failure mode we were fixing: a global concern still reaches into every Game surface and merely agrees not to render. Structural separation makes the boundary checkable rather than remembered.

## Consequences

The platform keeps its dark identity and each Game supplies its own visual system, so the dark-to-paper seam happens exactly once, at the Catalog-to-Shell boundary, where it reads as opening an app. Each Game therefore owns its own design documentation and CSS — `DESIGN.md` moved from the repository root to `src/games/bingo/` for this reason. We deliberately did not build a theme registry, shell-config API, or per-Game token plumbing; with one shipping Game, that would be abstraction on a sample size of one.
