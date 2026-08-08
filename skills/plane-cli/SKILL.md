---
name: plane-cli
description: Operate Plane safely through the agent-first `plane` CLI. Use when a user asks to inspect, search, create, update, assign, prioritize, schedule, label, comment on, relate, archive, or delete Plane projects and work items; manage cycles, modules, states, labels, members, comments, or relations; configure Plane workspace/project context; diagnose Plane CLI authentication or connectivity; or call a documented Plane API operation through the CLI.
---

# Plane CLI

Use deterministic commands and machine-readable output for every Plane operation. Never open or drive the TUI as an agent.

## Operating contract

1. Verify the executable and environment.
2. Discover the installed command contract.
3. Establish explicit workspace/project context.
4. Read the target resource before changing it.
5. Perform the smallest requested mutation.
6. Verify the resulting resource.
7. Report stable identifiers and the material result.

Always add `--json --no-input` to agent commands. Parse JSON, not human tables or terminal text.

Success JSON has `{schemaVersion, data, meta}`. JSON Lines emits one `{schemaVersion, data}` object per line. Errors use `{schemaVersion, error}` on stderr.

## Preflight

Check availability before the first Plane operation in an environment:

```bash
command -v plane
cockpit doctor --json --no-input
cockpit context show --json --no-input
```

If `plane` is missing, report that the CLI must be installed. Do not install software unless the user requested it.

If authentication is missing or rejected:

- Tell the user to provide `PLANE_API_KEY` through their environment or secret manager.
- Use `PLANE_ACCESS_TOKEN` only when their Plane instance requires bearer-token authentication.
- Never ask the user to paste a token into chat.
- Never print, log, persist, or pass a token as an ordinary command argument.

If context is missing, derive workspace/project identifiers from the user's request or existing repository context. Otherwise ask for the missing choice. Set context only when the user intends it to persist:

```bash
cockpit context set --workspace acme --project ENG --json --no-input
```

Prefer per-command `--workspace` and `--project` when working temporarily outside the saved context.

## Discover commands

Treat installed machine-readable help as authoritative; the CLI may expose more commands than this skill lists.

```bash
cockpit help --json --no-input
cockpit help work-item --json --no-input
cockpit help work-item create --json --no-input
```

Inspect help before using an unfamiliar command, option, payload field, or extended resource. Do not guess flags from the Plane web UI or raw REST API.
If help cannot be executed, describe the intended operation but do not fabricate an executable flag or JSON field. Resume only after the installed contract is available.

Use the regular grammar:

```text
plane <resource> <action> [reference] [options] --json --no-input
```

Regular actions are `list`, `get`, `create`, `update`, and `delete`. Domain actions such as `archive`, `add-items`, or `transfer-items` are explicit.

## Resolve resources safely

Prefer references in this order:

1. Canonical UUID.
2. Work-item identifier such as `ENG-142`.
3. Unique project identifier such as `ENG`.
4. Human-readable name only when necessary.

Use `me` for the authenticated member when supported.

If a name is ambiguous, read `error.details.candidates`, choose only from facts supplied by the user or repository, and rerun with the stable identifier. Never select the first result.

Do not assume the saved project when the user names a different project or workspace.

## Read operations

Use the smallest query that establishes the requested fact. Do not fetch every page when one page or a filtered query answers the question.

Typical reads:

```bash
cockpit user me --json --no-input
cockpit project list --json --no-input
cockpit member list --project ENG --json --no-input
cockpit work-item get ENG-142 --json --no-input
cockpit work-item search --project ENG --query 'authentication race' --json --no-input
cockpit state list --project ENG --json --no-input
cockpit label list --project ENG --json --no-input
cockpit comment list ENG-142 --json --no-input
cockpit cycle list --project ENG --json --no-input
cockpit module list --project ENG --json --no-input
cockpit relation list ENG-142 --json --no-input
```

Before relying on any example option, confirm it in installed help.

### Pagination

Machine output has a `data` value and optional `meta.nextCursor`.

- Use `--limit <n>` when the user needs a bounded result.
- Use `--cursor <cursor>` to continue an interrupted query.
- Use `--all` only when the whole collection is required.
- Continue until `meta.nextCursor` is absent, an explicit limit is reached, or the requested fact is found.
- Preserve the cursor exactly; do not parse or construct it.

For large results, prefer JSON Lines when command help reports support:

```bash
cockpit work-item list --project ENG --all --jsonl --no-input
```

## Mutation discipline

Perform a mutation only when the user's request authorizes that state change. A request to inspect, summarize, diagnose, or recommend does not authorize a write.

Before updating, archiving, relating, scheduling, commenting on, or deleting an existing resource:

1. Retrieve it by stable identifier.
2. Confirm it belongs to the intended workspace/project.
3. Compare the requested outcome with its current state.
4. Skip an already-satisfied mutation and report that no change was needed.

After a successful mutation, retrieve the resource again when the mutation response does not fully prove the requested outcome.

Use named options for common scalar changes. Use `--data` for complete or uncommon payloads:

```bash
cockpit work-item create --project ENG --data @work-item.json --json --no-input
cockpit work-item update ENG-142 --data '{"priority":"high"}' --json --no-input
cockpit work-item update ENG-142 --data - --json --no-input < update.json
```

Do not combine named mutation options with `--data`; the CLI rejects ambiguous sources. Inspect command help for the current payload schema.
Never place a guessed placeholder field into a command presented as executable. Use only fields returned by installed JSON help.

### Create work items

1. Resolve the project.
2. Resolve optional state, member, label, cycle, and module references before creation.
3. Create the smallest valid work item.
4. Return its Plane identifier and relevant fields.

Never silently discard an optional field that failed resolution. Stop with the unresolved field and candidates.

### Update work items

Retrieve the work item first, then send only changed fields. Preserve descriptions, assignments, labels, and custom properties not named by the user.

To change a state by name, list states first and use the unique state ID when practical. Apply the same rule to labels, assignees, cycles, and modules.

### Comments

Use `comment create` only when the user asked to communicate or when posting a completion update is explicitly part of the workflow. Do not turn an internal summary into a Plane comment without authorization.

Inspect the comment command's JSON help for its content field and rich-text expectations before constructing the payload.

### Cycles and modules

Use the relationship actions rather than editing raw work-item fields when available:

```bash
cockpit cycle add-items <cycle> --work-item ENG-142 --json --no-input
cockpit cycle remove-item <cycle> --work-item ENG-142 --json --no-input
cockpit module add-items <module> --work-item ENG-142 --json --no-input
cockpit module remove-item <module> --work-item ENG-142 --json --no-input
```

Resolve cycle/module references before mutation and verify membership afterward.
Verify cycle membership with `cycle list-items` and module membership with `module list-items`; `get` proves that the container exists, not that the work item belongs to it.

### Relations

Inspect relation help to determine supported relation types and direction. Confirm which work item is the source and which is the target; “blocks” and “is blocked by” are not interchangeable.

Retrieve relations after creation or removal to verify direction and target.

### Destructive actions

Delete only when the user explicitly requests deletion. Prefer archive when it satisfies the request and Plane supports it.

For an authorized non-interactive deletion:

1. Retrieve and identify the exact target.
2. State the destructive target if user confirmation is still required.
3. Pass `--yes` only after authorization is clear.
4. Verify absence or archived state afterward.

```bash
cockpit work-item delete ENG-142 --yes --json --no-input
```

Never use `--yes` to bypass an unresolved target, ambiguous name, or missing user decision.

## Failure handling

Read `error.code`; do not match prose. Preserve `error.requestId` when reporting server failures.

| Error code | Response |
| --- | --- |
| `usage` | Inspect JSON help, correct the local invocation, and retry. |
| `authentication` | Stop and request environment-based credential setup. |
| `authorization` | Stop; report the denied operation and resource. |
| `not_found` | Recheck context and stable identifiers; do not substitute another resource. |
| `ambiguous_reference` | Present or evaluate candidates and retry with a stable ID. |
| `validation` | Correct only fields supported by the user's intent. |
| `conflict` | Re-read the resource, explain current state, and retry only if still authorized. |
| `rate_limited` | Respect reset metadata; resume reads from the returned cursor. |
| `network` | Retry safe reads. For mutations, verify remote state before any retry. |
| `server` | Retry a safe read once when appropriate; report request ID if failure persists. |

Exit codes are supporting evidence: `2` usage/validation, `3` authentication/authorization, `4` missing/ambiguous resource, `5` conflict, `6` rate limit, and `7` network failure. The JSON error remains authoritative.

### Ambiguous mutation outcomes

Never blindly retry a create, update, comment, relation, scheduling action, or deletion after a timeout or connection loss.

1. Query Plane for the intended resulting state.
2. If the result already exists, treat the operation as successful and report the verification.
3. If it is absent and retry is safe, retry once.
4. If the state cannot be determined, stop and report uncertainty.

## Surface boundary

This release exposes the initial first-class command surface only: context, projects, members, work items, states, labels, comments, relations, cycles, and modules. For resources outside that surface, report that the installed CLI does not provide a supported command rather than inventing an endpoint.

## Representative workflows

### Inspect assigned active work

1. Run preflight.
2. Inspect `work-item list` help for assignee/state filters.
3. List work items assigned to `me` with bounded or complete pagination as required.
4. Retrieve relevant items by identifier before summarizing.

### Create and schedule work

1. Resolve the project, target state, assignees, labels, cycle, and module.
2. Inspect `work-item create` help.
3. Create the work item with resolved identifiers.
4. Use cycle/module relationship commands if creation does not support them directly.
5. Retrieve the resulting work item and memberships.
6. Report the new work-item identifier.

### Move work to completion

1. Retrieve the work item.
2. List states and resolve the requested completed state.
3. Update only the state field.
4. Retrieve the item again.
5. Add a comment only when explicitly requested.

### Relate two work items

1. Retrieve both work items.
2. Inspect relation command help and supported directions.
3. Add the relation with explicit source, target, and type.
4. List relations for the source to verify it.

### Continue a paginated search

1. Preserve the query, filters, workspace, and project unchanged.
2. Pass the exact `meta.nextCursor` to `--cursor`.
3. Deduplicate only by stable resource ID.
4. Stop when the requested evidence is found or no cursor remains.

## Reporting

Return concise results with stable Plane identifiers. State:

- What was read or changed.
- The workspace/project when context could be unclear.
- The final state of each mutation.
- Any skipped no-op, unresolved ambiguity, rate limit, or uncertain remote outcome.

Do not expose credentials, raw authorization headers, full debug payloads, or unrelated Plane data.
