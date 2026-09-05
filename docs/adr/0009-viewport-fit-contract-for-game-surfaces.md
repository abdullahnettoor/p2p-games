# Viewport-fit contract for Game surfaces

A Bingo Match measured 1211px against an 844px viewport, forcing ~367px of scroll before any interaction, because the Board was sized from width via `aspect-ratio: 1` while chrome stacked above and below it — so a short viewport shrank nothing and simply pushed the Board off-screen. Every Game surface is now a `100dvh` flex column that does not page-scroll at default text size on viewports of at least 320x568, with the Board sized from *available height* and capped by width, and anything appearing mid-Match overlaying rather than reflowing.

The contract has a deliberate escape hatch: when content genuinely cannot fit — extreme zoom, very short landscape — the container falls back to normal page scrolling. Clipped content is a bug; scrolled content is the documented fallback.

## Consequences

Holding this contract at 320px required cutting non-Board chrome from ~631px to ~150px, which is why turn state, timer, Player identity, and B-I-N-G-O progress are consolidated into a single status strip rather than living in separate rows, and why Match notes, rules, and reactions are sheets rather than stacked sections.

Non-Board controls were reduced from 44x44 to 36x36 CSS pixels to buy that budget. **This was costed, not sloppiness.** 36x36 satisfies WCAG 2.5.8 Target Size (Minimum, AA at 24x24); only 2.5.5 (AAA) is given up. Board cells stay at 44x44 because sub-44px targets are a correctness failure in a tapping game. The no-scroll guarantee is bounded at 200% text zoom, matching WCAG 1.4.4 (AA), and the scrolling fallback satisfies WCAG 1.4.10 Reflow rather than violating it — reflow explicitly permits vertical scrolling. Zoom is never locked: no `user-scalable=no`, no `maximum-scale`. The net position is full WCAG AA.

The contract is verified manually and has no automated guard, by decision — `npm test` runs in jsdom, which has no layout engine and reports zero height for every element, so it structurally cannot check this. The known risk is that the first future row added to a Game surface breaks the contract silently, which is precisely how the 1211px document came about.
