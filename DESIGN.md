---
name: Bingo Sunday Puzzle Scorecard
description: A crisp paper scorecard system for fast one-on-one Bingo on separate phones.
colors:
  paper: "#F7F9F4"
  paper-raised: "#FFFFFF"
  paper-shadow: "#DCE3DE"
  desk: "#E6ECE8"
  graphite: "#27313A"
  graphite-muted: "#65716F"
  rule: "#AAB7B3"
  rule-soft: "#D9E0DC"
  host-ink: "#175E9C"
  guest-ink: "#A63D57"
  warning: "#A85B16"
  urgent: "#B42335"
  focus: "#087E8B"
  cell-hover: "#EEF4F0"
  cell-pressed: "#E4EDE7"
  sheet-shadow-strong: "rgba(20, 37, 43, 0.18)"
  sheet-shadow-soft: "rgba(20, 37, 43, 0.12)"
  slip-shadow: "rgba(20, 37, 43, 0.16)"
typography:
  headline:
    fontFamily: "Avenir Next, Avenir, Trebuchet MS, sans-serif"
    fontSize: "clamp(1.5rem, 5vw, 2.25rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.025em"
  masthead:
    fontFamily: "Avenir Next, Avenir, Trebuchet MS, sans-serif"
    fontSize: "clamp(1.75rem, 9vw, 2.625rem)"
    fontWeight: 900
    lineHeight: 0.88
    letterSpacing: "0.08em"
  title:
    fontFamily: "Avenir Next, Avenir, Trebuchet MS, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "Avenir Next, Avenir, Trebuchet MS, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "Arial Narrow, Avenir Next Condensed, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.08em"
  compact-label:
    fontFamily: "Arial Narrow, Avenir Next Condensed, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.06em"
  player-name:
    fontFamily: "Avenir Next, Avenir, Trebuchet MS, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 800
    lineHeight: 1.2
  turn:
    fontFamily: "Avenir Next, Avenir, Trebuchet MS, sans-serif"
    fontSize: "clamp(1rem, 4vw, 1.125rem)"
    fontWeight: 800
    lineHeight: 1.15
  stamp:
    fontFamily: "Avenir Next, Avenir, Trebuchet MS, sans-serif"
    fontSize: "clamp(0.875rem, 4vw, 1.125rem)"
    fontWeight: 900
    lineHeight: 1
  call-number:
    fontFamily: "Avenir Next, Avenir, Trebuchet MS, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 900
    lineHeight: 1
rounded:
  mark: "4px"
  control: "8px"
  sheet: "14px"
  workspace: "24px"
  round: "999px"
  slip: "3px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.graphite}"
    textColor: "{colors.paper-raised}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.graphite}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "12px 16px"
    height: "44px"
  score-sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.sheet}"
    padding: "16px"
---

# Design system: Bingo Sunday Puzzle Scorecard

## Overview

**Creative North Star: "Sunday Puzzle Scorecard"**

Bingo should look like a fresh score sheet pulled from a weekend puzzle booklet, then marked by two friends during play. The paper is cool and clean rather than nostalgic cream. Printed labels, numbers, rules, and controls stay precise. Player actions appear as irregular ink laid over that print.

This system applies only inside the Bingo route. The global games platform keeps its existing dark identity outside Bingo. Material detail stays restrained so the board reads clearly at 320px and under enlarged text.

**Key characteristics:**
- A square score sheet is the dominant object.
- Graphite print establishes hierarchy without dashboard cards.
- Host blue and Guest berry remain stable from Lobby through results.
- Hand-drawn SVG marks carry personality without reducing legibility.
- Motion happens once when state changes, then settles into a clear static state.

## Colors

The palette combines cool white paper and gray-green rules with two saturated inks that remain distinct without relying on hue alone.

### Primary
- **Host fountain blue** (`#175E9C`): Host identity, Host Calls, and Host-owned line strokes.
- **Guest berry ink** (`#A63D57`): Guest identity, Guest Calls, and Guest-owned line strokes.

### Secondary
- **Focus teal** (`#087E8B`): Keyboard focus and selected-control outlines. It is not a Player ink.
- **Pencil amber** (`#A85B16`): Timer warning from ten seconds through four seconds.
- **Proofreader red** (`#B42335`): Final three seconds and destructive errors.

### Neutral
- **Scorecard paper** (`#F7F9F4`): Main sheet background.
- **Puzzle desk** (`#E6ECE8`): Cool work surface behind the score sheet within the Bingo route.
- **Fresh slip** (`#FFFFFF`): Call slips and raised controls.
- **Cell hover** (`#EEF4F0`) and **Cell pressed** (`#E4EDE7`): Brief interactive states for enabled board cells.
- **Graphite** (`#27313A`): Primary print and controls.
- **Soft graphite** (`#65716F`): Secondary print.
- **Printed rule** (`#AAB7B3`): Board grid and strong separators.
- **Faint rule** (`#D9E0DC`): Quiet separators and paper texture.

### Named rules

**The two-ink rule.** Blue and berry identify the Players. Never use either ink as a generic success or selection color.

**The clean-paper rule.** Large regions use scorecard paper or the cool puzzle-desk token. Do not introduce beige, parchment gradients, torn edges, coffee stains, or scrapbook decoration.

## Typography

**Headline font:** Avenir Next with Avenir and Trebuchet MS fallbacks  
**Body font:** Avenir Next with Avenir and Trebuchet MS fallbacks  
**Label font:** Arial Narrow with Avenir Next Condensed fallback

**Character:** Printed type should resemble a well-made puzzle booklet: compact, direct, and easy to scan. Handwriting is drawn as SVG ink, not used for instructions or dense text.

### Hierarchy
- **Headline** (800, `clamp(1.5rem, 5vw, 2.25rem)`, 1): BINGO title and Match result only.
- **Title** (700, `1rem`, 1.25): turn ownership and Player names.
- **Body** (500, `1rem`, 1.5): instructions and feedback.
- **Label** (700, `0.75rem`, `0.08em`, uppercase): timer, score, and compact controls.
- **Board number** (800, responsive from `1rem` to `1.5rem`, tabular): one number per cell with no secondary label.

### Named rules

**Print first.** Keep all actionable text in the printed type system. Reserve hand-drawn treatment for scribbles, stamps, line strokes, and short decorative annotations.

## Layout

The Match is organized around one score sheet. Its board consumes the available width up to 480px and remains square. A compact turn strip attaches directly above the grid. Player identities sit above that strip as a single scoreboard row, not separate dashboard cards.

At widths near 320px, route gutters shrink to 8px and score-sheet padding shrinks to 10px. The 5x5 board keeps a minimum 44px target per cell where viewport width permits. Secondary controls and recent history wrap below the board. Desktop adds breathing room and may place lightweight supporting information beside the sheet, but the board remains the largest object.

Use an 8px base rhythm with 4px for fine alignment. Do not duplicate the current turn in the header, Player row, and board copy.

## Elevation & Depth

Paper depth is structural. The score sheet uses one cool gray cast shadow and a thin edge. Call slips may overlap the sheet with a smaller shadow. Board cells and status regions stay flat, separated by printed rules rather than nested card shadows.

### Shadow vocabulary
- **Sheet lift** (`0 18px 50px rgba(20, 37, 43, 0.18), 0 2px 5px rgba(20, 37, 43, 0.12)`): the primary score sheet only.
- **Slip lift** (`0 5px 14px rgba(20, 37, 43, 0.16)`): incoming Call slip and compact menus.

The shadow alpha values are named tokens because they define the only two lifted paper levels in the route.

### Named rules

**One sheet, one shadow.** Do not give every section its own floating card. Internal hierarchy comes from spacing, rules, and type.

## Shapes

The score sheet has a restrained 14px corner radius that reads as trimmed stock rather than a soft app card. Controls use 8px corners and call slips use 3px corners. Board cells are square with hairline grid rules. Ink marks use round stroke caps, small angle variations, and controlled overflow.

Touch controls are at least 44 by 44 CSS pixels. Focus outlines sit outside the control and remain visible against both paper and ink.

## Components

### Buttons
- **Shape:** Compact rectangular controls with 8px corners and a minimum 44px height.
- **Primary:** Graphite fill, white print, and strong label weight.
- **Hover / Focus:** A small tonal shift on hover. Focus uses a 3px teal outline with 2px offset. Pressing may translate by 1px.
- **Secondary:** White or transparent paper with a graphite rule. Destructive actions use text and border changes, not a large red fill.

### Cards / Containers
- **Corner style:** The main sheet uses 14px. Small paper slips use 3px.
- **Background:** Cool scorecard paper with optional low-opacity fiber speckle.
- **Shadow strategy:** Only the main sheet and temporary slips lift.
- **Border:** One cool gray edge, with stronger rules inside the board.
- **Internal padding:** 10px on narrow phones, 16px to 24px at larger widths.

### Navigation
- Exit and sound controls are quiet utility buttons aligned above the score sheet. They keep familiar icons, visible text where space permits, 44px targets, and strong focus treatment.

### Player key
- Each name has an ink-colored cross or loop matching that Player's board marks, plus a text label such as `You` or `Opponent`.
- Ink color never carries identity alone. Names and ownership wording remain visible.
- The active Player is indicated once in the board-attached turn strip.

### Bingo board
- Cells use graphite numbers over paper with one shared printed grid.
- A Host Call draws an irregular two-stroke cross. A Guest Call draws a rough loop and slash. Both use the caller's ink and include the caller's name in the cell label.
- Completed rows, columns, and diagonals draw separate owner-ink paths above cell marks. Overlapping lines remain visible through slight path offsets and translucent ink.
- Enabled cells commit on one tap. Disabled and called cells remain stable without opacity that harms number contrast.

### Progress stamps
- B-I-N-G-O letters resemble small rubber stamps in the board owner's ink.
- When one Call completes multiple lines, new stamps enter in sequence with a short stagger.
- The final state stays fully readable without animation.

### Call slip
- The newest Call appears as a small white paper slip near the board edge on both screens.
- It names the caller and number, uses the caller's ink, and never blocks cells or requires dismissal.
- Its entrance is brief. The slip remains long enough to read, then may settle into recent history.

## Do's and Don'ts

### Do:
- **Do** keep the board as the largest and highest-contrast object on every viewport.
- **Do** derive every scribble from ordered Match history so both clients render the same ownership.
- **Do** keep line strokes separate so rows, columns, diagonals, and overlaps remain understandable.
- **Do** use one-shot transitions and provide static reduced-motion states.
- **Do** test the score sheet at 320px width, keyboard focus, and enlarged text.

### Don't:
- **Don't** recreate the old dark dashboard inside a light card.
- **Don't** use generic cream notebook paper, torn edges, tape, ruled-school-paper lines, or cursive interface text.
- **Don't** pulse the active turn continuously or spin decorative icons.
- **Don't** hide the numeric timer in a radial chart or color-only warning.
- **Don't** use Player ink for neutral controls, connection success, or global focus.
