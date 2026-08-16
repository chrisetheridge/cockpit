<div align="center">
  <h1>Cockpit</h1>
  <p><strong>Agent-first command-line client for Plane.</strong></p>
  <p>Inspect and manage Plane work through deterministic commands, machine-readable output, or a keyboard-driven TUI.</p>
</div>

## Requirements

- Node.js 22.12 or newer
- A Plane API key or access token

## Install

From a source checkout:

```sh
pnpm install
pnpm build
```

The built CLI is `dist/cli.js`. Run it directly from the checkout:

```sh
node dist/cli.js doctor --json
```

## Configure

Provide a credential through the environment. Tokens are never stored in profiles.

```sh
export PLANE_API_KEY="..."
export PLANE_WORKSPACE_SLUG="acme"
export PLANE_PROJECT="ENG"
```

Check connectivity:

```sh
cockpit doctor --json
cockpit context show --json
```

For reusable non-secret context, use profiles:

```sh
cockpit context set --profile work --workspace acme --project ENG
cockpit context use work
```

Self-hosted Plane instances can set `PLANE_BASE_URL` or pass `--base-url`. HTTPS is required unless `--allow-insecure-http` is explicitly used for local development.

## Usage

Use `--json` for scripts and agents. Commands automatically avoid prompts in
CI, pipes, and machine-output modes:

```sh
cockpit project list --json
cockpit work-item search --query "authentication" --json
cockpit work-item get ENG-142 --json
cockpit work-item update ENG-142 --data '{"priority":"high"}' --json
```

Run `cockpit` without arguments in an interactive terminal to open the TUI. Use `cockpit tui` to request it explicitly.

Run `cockpit --help` or `cockpit help work-item` to discover the installed command contract.

## Command surface

- Context and configuration: `context`, `config`, `doctor`
- Projects and users: `project`, `project-feature`, `user`, `member`
- Work items: `work-item`, `state`, `label`, `comment`, `relation`
- Planning: `cycle`, `module`
- Agent integration: `skill`

Most resources support `list`, `get`, `create`, `update`, and `delete` where Plane supports the operation. Domain actions include `archive`, `unarchive`, `add-items`, and `transfer-items`.

## Output

Use `--output table|plain|json|jsonl`, or the `--json` and `--jsonl` shortcuts. List commands support `--limit`, `--cursor`, and `--all`.

Destructive commands require `--yes` when prompts are unavailable.

## Agent skill

Install the packaged skill into an agent skills directory:

```sh
cockpit skill install --target ~/.agents/skills
```

Or install it directly from GitHub with `npx skills`:

```sh
npx skills add chrisetheridge/cockpit --skill plane-cli --agent codex --global --yes
```

The skill documents safe command discovery, reference resolution, pagination, mutation verification, and failure handling.

## Development

```sh
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```
