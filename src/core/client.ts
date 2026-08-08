import { PlaneClient } from "@makeplane/plane-node-sdk";
import type { resolveConfig } from "./config.js";
import { CliError } from "./errors.js";

export type ResolvedConfig = ReturnType<typeof resolveConfig>;

export function createClient(config: ResolvedConfig): PlaneClient {
  if (!config.apiKey && !config.accessToken)
    throw new CliError(
      "authentication",
      "No Plane credential was supplied.",
      undefined,
      "Set PLANE_API_KEY, or PLANE_ACCESS_TOKEN when bearer authentication is required.",
    );
  return new PlaneClient({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    accessToken: config.accessToken,
  });
}

export function requireWorkspace(config: ResolvedConfig): string {
  if (!config.workspace)
    throw new CliError(
      "validation",
      "A workspace is required.",
      undefined,
      "Pass --workspace or set a profile with `cockpit context set`.",
    );
  return config.workspace;
}

export function requireProject(config: ResolvedConfig): string {
  if (!config.project)
    throw new CliError(
      "validation",
      "A project is required.",
      undefined,
      "Pass --project or set a profile with `cockpit context set`.",
    );
  return config.project;
}
