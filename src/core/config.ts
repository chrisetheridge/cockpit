import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import { CliError } from "./errors.js";

export const DEFAULT_BASE_URL = "https://api.plane.so";
const Profile = z.object({
  baseUrl: z.string().optional(),
  workspace: z.string().optional(),
  project: z.string().optional(),
});
const ConfigFile = z.object({
  active: z.string().optional(),
  profiles: z.record(z.string(), Profile).default({}),
});
export type Profile = z.infer<typeof Profile>;
export type ConfigFile = z.infer<typeof ConfigFile>;
export type ConfigOverrides = {
  baseUrl?: string;
  workspace?: string;
  project?: string;
  profile?: string;
  apiKey?: string;
  accessToken?: string;
  allowInsecureHttp?: boolean;
};

export function configPath(): string {
  return join(process.cwd(), ".cockpit", "config.json");
}

export function readConfig(): ConfigFile {
  const path = configPath();
  if (!existsSync(path)) return { profiles: {} };
  try {
    return ConfigFile.parse(JSON.parse(readFileSync(path, "utf8")));
  } catch (error) {
    throw new CliError(
      "validation",
      `Invalid configuration file: ${path}`,
      undefined,
      "Fix or remove the file, then retry.",
      { cause: error instanceof Error ? error.message : String(error) },
    );
  }
}

export function writeConfig(config: ConfigFile): void {
  const path = configPath();
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  chmodSync(temp, 0o600);
  renameSync(temp, path);
}

export function resolveConfig(overrides: ConfigOverrides = {}): {
  baseUrl: string;
  workspace?: string;
  project?: string;
  profile?: string;
  apiKey?: string;
  accessToken?: string;
} {
  const file = readConfig();
  const profileName = overrides.profile ?? process.env.PLANE_PROFILE ?? file.active;
  const profile = profileName ? file.profiles[profileName] : undefined;
  const baseUrl =
    overrides.baseUrl ?? process.env.PLANE_BASE_URL ?? profile?.baseUrl ?? DEFAULT_BASE_URL;
  if (
    !/^https:\/\//i.test(baseUrl) &&
    !(overrides.allowInsecureHttp && /^http:\/\//i.test(baseUrl))
  ) {
    throw new CliError(
      "validation",
      "Base URL must use HTTPS.",
      undefined,
      "Use --allow-insecure-http only for local development.",
    );
  }
  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    workspace: overrides.workspace ?? process.env.PLANE_WORKSPACE_SLUG ?? profile?.workspace,
    project: overrides.project ?? process.env.PLANE_PROJECT ?? profile?.project,
    profile: profileName,
    apiKey: overrides.apiKey ?? process.env.PLANE_API_KEY,
    accessToken: overrides.accessToken ?? process.env.PLANE_ACCESS_TOKEN,
  };
}

export function setProfile(name: string, changes: Profile): ConfigFile {
  const config = readConfig();
  config.profiles[name] = { ...config.profiles[name], ...changes };
  config.active = name;
  writeConfig(config);
  return config;
}
