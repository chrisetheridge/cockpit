import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ReactElement } from "react";
import { useEffect } from "react";
import { z } from "zod";
import { argument, option } from "pastel";
import { configPath, readConfig, resolveConfig, setProfile, writeConfig } from "./core/config.js";
import { readSecret } from "./core/data.js";
import { asCliError, CliError } from "./core/errors.js";
import { outputOptions, writeError, writeSuccess } from "./core/output.js";
import { doctor, listMembers, resourceOperation, userMe } from "./operations/index.js";

export const HELP: Record<
  string,
  {
    description: string;
    destructive?: boolean;
    arguments?: string[];
    options?: string[];
    examples?: string[];
  }
> = {
  "": {
    description: "Agent-first command-line client for Plane.",
    options: [
      "--base-url <url>",
      "--api-key-stdin",
      "--access-token-stdin",
      "--workspace <workspace>",
      "--project <project>",
      "--profile <profile>",
      "--output table|plain|json|jsonl",
      "--json",
      "--jsonl",
      "--no-input",
      "--no-color",
      "--allow-insecure-http",
    ],
  },
  doctor: {
    description: "Validate configuration and Plane connectivity.",
    examples: ["cockpit doctor --json --no-input"],
  },
  "context show": { description: "Show the selected non-secret context." },
  "context list": { description: "List saved non-secret contexts." },
  "context set": {
    description: "Persist a named non-secret context.",
    options: ["--workspace <workspace>", "--project <project>", "--base-url <url>"],
  },
  "context use": { description: "Select a saved context." },
  "context delete": { description: "Delete a saved context.", destructive: true },
  "config path": { description: "Print the active configuration path." },
  "skill path": { description: "Print the packaged Plane CLI skill directory." },
  "skill install": {
    description: "Install the packaged skill into an explicit directory.",
    options: ["--target <directory>", "--force"],
  },
  "user me": { description: "Show the authenticated user." },
  "member list": { description: "List workspace or project members." },
  "project list": { description: "List projects." },
  "project get": { description: "Get a project." },
  "project create": { description: "Create a project." },
  "project update": { description: "Update a project." },
  "project delete": { description: "Delete a project.", destructive: true },
  "project archive": { description: "Archive a project." },
  "project unarchive": { description: "Unarchive a project." },
  "project-feature get": { description: "Get project feature settings." },
  "project-feature update": { description: "Update project feature settings." },
  "work-item list": { description: "List work items." },
  "work-item search": { description: "Search work items." },
  "work-item get": { description: "Get a work item." },
  "work-item create": { description: "Create a work item." },
  "work-item update": { description: "Update a work item." },
  "work-item delete": { description: "Delete a work item.", destructive: true },
  "work-item archive": { description: "Archive a work item." },
  "work-item unarchive": { description: "Unarchive a work item." },
  "state list": { description: "List project states." },
  "state get": { description: "Get a project state." },
  "state create": { description: "Create a project state." },
  "state update": { description: "Update a project state." },
  "state delete": { description: "Delete a project state.", destructive: true },
  "label list": { description: "List project labels." },
  "label get": { description: "Get a project label." },
  "label create": { description: "Create a project label." },
  "label update": { description: "Update a project label." },
  "label delete": { description: "Delete a project label.", destructive: true },
  "comment list": { description: "List comments on a work item." },
  "comment get": { description: "Get a work-item comment." },
  "comment create": { description: "Create a work-item comment." },
  "comment update": { description: "Update a work-item comment." },
  "comment delete": { description: "Delete a work-item comment.", destructive: true },
  "relation list": { description: "List work-item relations." },
  "relation add": { description: "Add a work-item relation." },
  "relation remove": { description: "Remove a work-item relation.", destructive: true },
  "cycle list": { description: "List cycles." },
  "cycle get": { description: "Get a cycle." },
  "cycle create": { description: "Create a cycle." },
  "cycle update": { description: "Update a cycle." },
  "cycle delete": { description: "Delete a cycle.", destructive: true },
  "cycle archive": { description: "Archive a cycle." },
  "cycle unarchive": { description: "Unarchive a cycle." },
  "cycle list-items": { description: "List work items in a cycle." },
  "cycle add-items": { description: "Add work items to a cycle." },
  "cycle remove-item": { description: "Remove a work item from a cycle." },
  "cycle transfer-items": { description: "Transfer work items to another cycle." },
  "module list": { description: "List modules." },
  "module get": { description: "Get a module." },
  "module create": { description: "Create a module." },
  "module update": { description: "Update a module." },
  "module delete": { description: "Delete a module.", destructive: true },
  "module archive": { description: "Archive a module." },
  "module unarchive": { description: "Unarchive a module." },
  "module list-items": { description: "List work items in a module." },
  "module add-items": { description: "Add work items to a module." },
  "module remove-item": { description: "Remove a work item from a module.", destructive: true },
  tui: { description: "Open the interactive terminal UI." },
};

export const commonOptions = {
  baseUrl: z.string().optional().describe(option({ description: "Plane API base URL", valueDescription: "url" })),
  apiKeyStdin: z.boolean().optional().describe("Read the API key from stdin"),
  accessTokenStdin: z.boolean().optional().describe("Read the access token from stdin"),
  workspace: z.string().optional().describe("Workspace slug"),
  project: z.string().optional().describe("Project ID or identifier"),
  profile: z.string().optional().describe("Saved configuration profile"),
  output: z.enum(["table", "plain", "json", "jsonl"]).optional().describe("Output format"),
  json: z.boolean().optional().describe("Output JSON"),
  jsonl: z.boolean().optional().describe("Output JSON Lines"),
  noInput: z.boolean().optional().describe("Disable prompts"),
  noColor: z.boolean().optional().describe("Disable color"),
  yes: z.boolean().optional().describe("Confirm destructive actions"),
  all: z.boolean().optional().describe("Fetch all pages"),
  limit: z.number().optional().describe("Maximum number of results"),
  cursor: z.string().optional().describe("Pagination cursor"),
  data: z.string().optional().describe("JSON mutation data"),
  allowInsecureHttp: z.boolean().optional().describe("Allow an HTTP base URL"),
};

const mutationOptions = {
  name: z.string().optional().describe("Name"),
  description: z.string().optional().describe("Description"),
  color: z.string().optional().describe("Color"),
  state: z.string().optional().describe("State"),
  priority: z.string().optional().describe("Priority"),
  assignees: z.string().optional().describe("Assignee IDs"),
  labels: z.string().optional().describe("Label IDs"),
  type: z.string().optional().describe("Type"),
  module: z.string().optional().describe("Module ID"),
  targetDate: z.string().optional().describe("Target date"),
  startDate: z.string().optional().describe("Start date"),
  identifier: z.string().optional().describe("Identifier"),
  status: z.string().optional().describe("Status"),
  lead: z.string().optional().describe("Lead ID"),
  members: z.string().optional().describe("Member IDs"),
  ownedBy: z.string().optional().describe("Owner ID"),
  endDate: z.string().optional().describe("End date"),
  timezone: z.string().optional().describe("Timezone"),
  content: z.string().optional().describe("Content"),
  comment: z.string().optional().describe("Comment"),
};

const listOptions = {
  query: z.string().optional().describe("Search query"),
  assignee: z.string().optional().describe("Assignee ID"),
  pql: z.string().optional().describe("Plane query language expression"),
  orderBy: z.string().optional().describe("Sort field"),
  fields: z.string().optional().describe("Fields to return"),
  expand: z.string().optional().describe("Fields to expand"),
};

export function commandOptions(extra: Record<string, z.ZodTypeAny> = {}) {
  return z.object({ ...commonOptions, ...extra });
}

export function resourceOptions(resource: string, action: string) {
  const extra: Record<string, z.ZodTypeAny> = {};
  if (["create", "update"].includes(action)) Object.assign(extra, mutationOptions);
  if (["list", "search", "list-items"].includes(action)) Object.assign(extra, listOptions);
  if (["add", "remove", "add-items", "remove-item", "transfer-items"].includes(action) && resource !== "relation")
    Object.assign(extra, {
      related: z.string().optional().describe("Related resource reference"),
      workItem: z.string().optional().describe("Work item reference"),
      newCycle: z.string().optional().describe("Destination cycle ID"),
    });
  if (resource === "relation" && action !== "list")
    Object.assign(extra, {
      related: z.string().optional().describe("Related work item reference"),
      type: z.string().optional().describe("Relation type"),
    });
  if (resource === "comment" && ["get", "update", "delete"].includes(action))
    extra.commentId = z.string().describe("Comment ID");
  return commandOptions(extra);
}

export const referenceArgs = z.tuple([
  z.string().optional().describe(argument({ name: "reference", description: "Resource reference" })),
]);
export const requiredReferenceArgs = z.tuple([
  z.string().optional().describe(argument({ name: "reference", description: "Resource reference" })),
]);
export const workItemArgs = z.tuple([
  z.string().optional().describe(argument({ name: "work-item", description: "Work item reference" })),
]);

export type CommandProps = { options: Record<string, any>; args: unknown[] };
type Operation = (
  input: { config: ReturnType<typeof resolveConfig>; options: Record<string, any> },
  args: unknown[],
) => Promise<{ data: unknown; meta: Record<string, unknown> }>;

export function command(operation: Operation): (props: CommandProps) => ReactElement | null {
  return function CommandRunner({ options, args }: CommandProps): ReactElement | null {
    useEffect(() => {
      void executeCommand(options, operation, args);
    }, [options, args]);
    return null;
  };
}

export async function runCommand(
  rawOptions: Record<string, any>,
  operation: (input: { config: ReturnType<typeof resolveConfig>; options: Record<string, any> }) => Promise<{
    data: unknown;
    meta: Record<string, unknown>;
  }>,
): Promise<void> {
  const options = { ...rawOptions } as Record<string, any>;
  options.noInput = Boolean(options.noInput) || Boolean(process.env.CI);
  options.color = options.noColor ? false : undefined;
  if (
    options.data !== undefined &&
    [
      "name",
      "description",
      "color",
      "state",
      "priority",
      "assignees",
      "labels",
      "type",
      "module",
      "targetDate",
      "startDate",
      "identifier",
      "status",
      "lead",
      "members",
      "ownedBy",
      "endDate",
      "timezone",
      "content",
      "comment",
    ].some((key) => options[key] !== undefined)
  ) {
    throw new CliError("usage", "Named mutation options cannot be combined with --data.");
  }
  if (options.apiKeyStdin) options.apiKey = readSecret();
  if (options.accessTokenStdin) options.accessToken = readSecret();
  const result = await operation({ config: resolveConfigFromOptions(options), options });
  writeSuccess(result.data, result.meta, outputOptions(options));
}

export async function executeCommand(
  options: Record<string, any>,
  operation: Operation,
  args: unknown[] = [],
): Promise<void> {
  try {
    await runCommand(options, (input) => operation(input, args));
  } catch (error) {
    const normalized = asCliError(error);
    const formatOptions = { ...options, color: options.noColor ? false : undefined };
    writeError(normalized, outputOptions(formatOptions));
    process.exitCode = normalized.exitCode;
  }
}

export const doctorCommand = command(async (input) => doctor(input));
export const userMeCommand = command(async (input) => ({ data: await userMe(input), meta: {} }));
export const memberListCommand = command(async (input) => listMembers(input));
export const contextShowCommand = command(async (input) => ({
  data: selectedContext(input.options),
  meta: {},
}));
export const contextListCommand = command(async () => {
  const config = readConfig();
  return {
    data: Object.entries(config.profiles).map(([name, profile]) => ({
      name,
      active: config.active === name,
      ...profile,
    })),
    meta: {},
  };
});
export const contextSetCommand = command(async (input, args) => {
  const profileName = String(args[0] ?? "default");
  const saved = setProfile(profileName, {
    workspace: input.options.workspace,
    project: input.options.project,
    baseUrl: input.options.baseUrl,
  });
  return { data: { active: saved.active, profile: saved.profiles[profileName] }, meta: {} };
});
export const contextUseCommand = command(async (_input, args) => {
  const name = args[0] as string | undefined;
  if (!name) throw new CliError("usage", "Selecting a context requires a name.");
  const config = readConfig();
  if (!config.profiles[name]) throw new CliError("not_found", `Context not found: ${name}`);
  config.active = name;
  writeConfig(config);
  return { data: { name, ...config.profiles[name] }, meta: {} };
});
export const contextDeleteCommand = command(async (input, args) => {
  const name = args[0] as string | undefined;
  if (!name) throw new CliError("usage", "Deleting a context requires a name.");
  const config = readConfig();
  if (!config.profiles[name]) throw new CliError("not_found", `Context not found: ${name}`);
  if (!input.options.yes) throw new CliError("usage", "Deleting a context requires --yes.");
  delete config.profiles[name];
  if (config.active === name) config.active = Object.keys(config.profiles)[0];
  writeConfig(config);
  return { data: { deleted: true, name }, meta: {} };
});
export const configPathCommand = command(async () => ({ data: configPath(), meta: {} }));
export const skillPathCommand = command(async () => ({ data: skillPath(), meta: {} }));
export const skillInstallCommand = command(async (input) => {
  const target = input.options.target as string;
  if (!target) throw new CliError("usage", "Installing the skill requires --target.");
  const destination = join(target, "plane-cli");
  if (existsSync(destination) && !input.options.force)
    throw new CliError(
      "conflict",
      `Skill already exists: ${destination}`,
      409,
      "Use --force to replace it.",
    );
  mkdirSync(target, { recursive: true });
  cpSync(skillPath(), destination, { recursive: true, force: true });
  return { data: { installed: destination }, meta: {} };
});
export function resourceCommand(resource: string, action: string): (props: CommandProps) => ReactElement | null {
  return command(async (input, args) => {
    if (resource === "relation" && action !== "list" && (!input.options.related || !input.options.type))
      throw new CliError("usage", "Relation changes require --related and --type.");
    return resourceOperation(resource, action, args[0] as string | undefined, input);
  });
}

export function resourceDescription(resource: string, action: string): string | undefined {
  return HELP[`${resource} ${action}`]?.description;
}

export function commentCommand(action: string): (props: CommandProps) => ReactElement | null {
  return command(async (input, args) => {
    const reference = args[0] as string | undefined;
    if (!reference) throw new CliError("usage", "Comment commands require a work-item reference.");
    return resourceOperation("comment", action, reference, input);
  });
}

export function resolveConfigFromOptions(options: Record<string, any>): ReturnType<typeof resolveConfig> {
  return resolveConfig({
    baseUrl: options.baseUrl,
    workspace: options.workspace,
    project: options.project,
    profile: options.profile,
    apiKey: options.apiKey,
    accessToken: options.accessToken,
    allowInsecureHttp: options.allowInsecureHttp,
  });
}

export function selectedContext(options: Record<string, any> = {}): Record<string, unknown> {
  const resolved = resolveConfigFromOptions(options);
  return {
    profile: resolved.profile,
    baseUrl: resolved.baseUrl,
    workspace: resolved.workspace,
    project: resolved.project,
  };
}

export function skillPath(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "skills", "plane-cli");
}

export function helpFor(key: string): Record<string, unknown> {
  const entry = HELP[key];
  if (!entry) throw new CliError("not_found", `Command help not found: ${key || "root"}`);
  const common = [
    "--base-url <url>",
    "--api-key-stdin",
    "--access-token-stdin",
    "--workspace <workspace>",
    "--project <project>",
    "--profile <profile>",
    "--output table|plain|json|jsonl",
    "--json",
    "--jsonl",
    "--no-input",
    "--no-color",
    "--data <json>",
    "--yes",
    "--allow-insecure-http",
    "--name <name>",
    "--description <text>",
    "--state <state>",
    "--priority <priority>",
    "--query <text>",
    "--related <reference>",
    "--type <type>",
    "--work-item <reference>",
    "--comment-id <id>",
  ];
  const action = key.split(" ").at(-1);
  const inferredArguments =
    entry.arguments ??
    (!key
      ? []
      : key.startsWith("relation ") || key.startsWith("comment ")
        ? ["work-item"]
        : key.startsWith("project-feature ") || ["list", "search", "create"].includes(action ?? "")
          ? []
          : ["reference"]);
  return {
    command: key || "cockpit",
    description: entry.description,
    destructive: Boolean(entry.destructive),
    arguments: inferredArguments,
    options: [...new Set([...common, ...(entry.options ?? [])])],
    acceptedInputSources: ["named options", "--data <json>", "--data @<path>", "--data -"],
    examples: entry.examples ?? [],
  };
}
