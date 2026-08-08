import { existsSync, readFileSync } from "node:fs";
import { CliError } from "./errors.js";

export function parseData(value: unknown, stdin = process.stdin): Record<string, unknown> {
  if (typeof value !== "string")
    throw new CliError(
      "usage",
      "Mutation data is required.",
      undefined,
      "Use --data <json>, --data @<path>, or --data -.",
    );
  const raw =
    value === "-" ? readStdin(stdin) : value.startsWith("@") ? readFile(value.slice(1)) : value;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new Error("expected a JSON object");
    return parsed as Record<string, unknown>;
  } catch (error) {
    throw new CliError("validation", "Mutation data must be a JSON object.", undefined, undefined, {
      cause: error instanceof Error ? error.message : String(error),
    });
  }
}

export function readSecret(stdin = process.stdin): string {
  const value = readStdin(stdin).trim();
  if (!value) throw new CliError("validation", "Credential input was empty.");
  return value;
}

function readFile(path: string): string {
  if (!existsSync(path)) throw new CliError("validation", `Data file not found: ${path}`);
  return readFileSync(path, "utf8");
}

function readStdin(stdin: NodeJS.ReadableStream): string {
  if (stdin === process.stdin && process.stdin.isTTY)
    throw new CliError("usage", "Cannot read mutation data from an interactive terminal.");
  return readFileSync(0, "utf8");
}
