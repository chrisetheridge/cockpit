# Plane CLI Interface System

## Direction

A calm, dense flight deck for project operations. The human is an engineer or product operator already working in a terminal; they need to find and change Plane work quickly without losing context. The agent-facing command surface remains canonical, while the TUI makes the same operations spatial and keyboard-driven.

## Domain

- Flight plans
- Callsigns
- Runways
- Control towers
- Manifests
- Trajectories
- Operational status strips

## Signature

Render each work item as an air-traffic flight strip. The Plane identifier is its callsign; state, priority, assignee, cycle, and timing form a compact operational record. Reuse the strip in lists, search results, relation pickers, mutation confirmations, and activity feedback.

## Rejecting defaults

- Generic rainbow dashboard: color communicates state or action only.
- Neon hacker terminal: use quiet cockpit surfaces and restrained violet.
- Nested prompt wizard: use a persistent list/detail workspace with direct shortcuts.
- Decorative ASCII art: spend visual character on the work-item strip.

## Palette

Use terminal capability detection and preserve hierarchy without color.

| Token | Truecolor | Role |
| --- | --- | --- |
| `cockpit` | `#101116` | Primary dark canvas |
| `panel` | `#171922` | Raised or selected surface |
| `cloud` | `#F3F1FF` | Primary text |
| `overcast` | `#9A96A8` | Secondary and metadata text |
| `instrument-violet` | `#7C5CFC` | Focus, selection, primary action |
| `runway-amber` | `#E6B450` | Warning, pending, attention |
| `navigation-green` | `#5FD38D` | Success and completed feedback |

Use Plane-provided state colors when showing state identity. Do not repurpose those colors for decoration.

## Typography

The application does not control the terminal font. Use the user's configured monospace face.

- Primary values: bold or high-intensity foreground.
- Labels: regular foreground.
- Metadata: dim foreground.
- Identifiers and changing numbers: tabular alignment.
- Headings: uppercase only for short operational labels, never prose.
- Avoid Unicode glyphs whose width is inconsistent across common terminals; always provide an ASCII-safe fallback.

## Depth and surfaces

Use surface-color shifts only. Do not simulate shadows.

- Level 0: terminal background or `cockpit`.
- Level 1: `panel` for selected strips, editors, and overlays.
- Boundaries: one-cell whitespace first, dim rules only where separation remains unclear.
- Focus: `instrument-violet` marker plus weight; never color alone.
- Inputs: visually inset using a darker or reversed surface according to terminal capability.

## Hierarchy

- Each view has one focal element: selected work-item strip, active editor field, or confirmation action.
- Work-item identifier remains fully visible and precedes the title.
- Title wins through available width and foreground weight.
- State and priority are secondary; assignee, cycle, and timestamps are tertiary.
- Context breadcrumb remains visible but visually quieter than content.
- Persistent key help occupies the final row and uses terse verb-led labels.

## Layout

- Base spacing unit: one terminal cell.
- Controls: one cell vertical and two cells horizontal breathing room where space permits.
- Related metadata uses one-cell gaps; unrelated regions use a blank row or dim rule.
- At 100 columns or wider, use list/detail composition with the list owning roughly 45% of width.
- Below 100 columns, use one pane with explicit back navigation.
- Below 60 columns, remove tertiary metadata before truncating titles; never truncate identifiers.
- Overlays remain within the current terminal bounds and keep the selected context visible when possible.

## Flight-strip pattern

```text
┃ ENG-142  Fix authentication race      STARTED   @chris
│ ENG-139  Rework billing webhook        BACKLOG   @maya
```

- Selected strip: strong left marker, panel surface, primary identifier and title.
- Unselected strip: dim left marker or whitespace, no decorative box.
- State: compact, aligned, and state-colored when available.
- Priority: visible only when meaningful; urgent priority may precede the state.
- Secondary line: use only when required for cycle, due date, or relationship context.

## Interaction

- `j`/`k` and arrow keys navigate.
- `/` filters or searches.
- `Enter` inspects or accepts.
- `c` creates, `e` edits, and explicit domain shortcuts perform frequent mutations.
- `Esc` cancels or returns one level; `q` exits only when no editor or confirmation owns focus.
- `?` opens contextual help.
- Destructive actions require a focused confirmation with the resource identifier visible.
- Frequent navigation and command-palette actions have no animation or artificial delay.
- Loading indicators must not obscure existing readable data.

## States

- Loading: retain layout and show the operation in progress.
- Empty: name the empty collection and offer its valid create/filter action.
- Error: state what failed, preserve the resource/context, and show the retry or corrective action.
- Ambiguous reference: list candidates with stable identifiers.
- Rate-limited: show the reset time and whether the CLI is waiting.
- Offline: retain existing local view state but do not imply that mutations succeeded.
- Reduced capability/no color: preserve selection and status through markers, labels, and weight.

## Reusable components

- Flight strip: one or two rows, one-cell selection marker, identifier never truncated.
- Context bar: workspace/project breadcrumb left; active view and filter center; help right.
- Key rail: one terminal row, grouped by current context, dim labels with primary key glyphs.
- Detail pane: identifier and title lead; compact metadata follows; description and activity receive remaining space.
- Confirmation: action verb, exact resource identifier, consequence, confirm/cancel keys.
- Inline editor: label, current value, validation state, and commit/cancel keys remain visible together.

## Initial screens

- Context picker: searchable workspace and project selection shown only when saved context is absent or invalid.
- Work-item home: flight-strip list with responsive detail pane and active filters.
- Work-item detail: description, metadata, relations, and comments, with direct edit actions.
- Search overlay: incremental query, stable selection, and explicit empty/error states.
- Create/edit form: shared field layout; edit sends changed fields only.
- Command palette: contextual deterministic actions, not natural language.
- Confirmation overlay: identifier, consequence, cancel-first focus, and explicit destructive action.

Do not add initial TUI screens for pages, releases, workflows, templates, customers, or administration. Those remain command surfaces until a repeated human workflow justifies another screen.

## Verification

- Swap test: replacing the flight-strip structure with generic cards must materially weaken the Plane-specific identity.
- Squint test: selected content and active action remain apparent without reading text.
- Signature test: flight strips appear in the main list, search, relation picker, confirmations, and mutation feedback.
- Token test: names refer to the flight-operations domain rather than generic UI layers.
- Verify wide, narrow, dark, light, 256-color, and no-color terminals.
