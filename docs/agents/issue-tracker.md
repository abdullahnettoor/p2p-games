# Issue tracker: GitHub

Issues and specs for this repo live in GitHub Issues on `abdullahnettoor/p2p-games`. Use the `gh` CLI for all operations.

Older work predating this switch lives as Markdown under `.scratch/<feature>/`. Treat those files as read-only history; open new work on GitHub.

## Conventions

- One issue per ticket. A spec is an issue with the `spec` label; its implementation tickets link back with `Part of #<spec>` in the body.
- Triage state is a label (see `triage-labels.md`). An issue carries exactly one triage label at a time.
- Blocking edges go in the body as `Blocked by: #N, #N`.
- Conversation happens in issue comments.

## When a skill says "publish to the issue tracker"

`gh issue create --title "..." --body-file <file> --label <labels>`

## When a skill says "fetch the relevant ticket"

`gh issue view <number> --comments`

## Wayfinding operations

Used by `/wayfinder`.

- **Map**: an issue labelled `map` holding the Notes / Decisions-so-far / Fog body.
- **Child ticket**: an issue with `Part of #<map>` and a `type:research|prototype|grilling|task` label.
- **Blocking**: a `Blocked by: #N` line in the body. A ticket is unblocked when every listed issue is closed.
- **Frontier**: open, unblocked, unassigned children of the map; lowest number wins.
- **Claim**: assign yourself (`gh issue edit <n> --add-assignee @me`) before any work.
- **Resolve**: comment the answer, close the issue, then add a gist + link to the map's Decisions-so-far.
