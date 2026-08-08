#!/usr/bin/env node
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Pastel from "pastel";
import { helpFor } from "./command-helpers.js";
import { asCliError } from "./core/errors.js";
import { outputOptions, writeError, writeSuccess } from "./core/output.js";

export function packageVersion(): string {
  return JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
}

function requestedOutput(argv: string[]): string | undefined {
  if (argv.includes("--jsonl")) return "jsonl";
  if (argv.includes("--json")) return "json";
  const index = argv.findIndex((value) => value === "--output" || value.startsWith("--output="));
  if (index < 0) return undefined;
  return argv[index].includes("=")
    ? argv[index].slice(argv[index].indexOf("=") + 1)
    : argv[index + 1];
}

function machineOutput(argv: string[]): boolean {
  return ["json", "jsonl"].includes(requestedOutput(argv) ?? "");
}

function machineHelpTarget(argv: string[]): string | undefined {
  if (!machineOutput(argv)) return undefined;
  const helpIndex = argv.indexOf("help");
  const helpFlagIndex = argv.indexOf("--help");
  if (helpIndex < 0 && helpFlagIndex < 0) return undefined;
  const start = helpIndex >= 0 ? helpIndex + 1 : 0;
  const end = helpIndex >= 0 ? argv.length : helpFlagIndex;
  const valueOptions = new Set([
    "--base-url",
    "--workspace",
    "--project",
    "--profile",
    "--output",
  ]);
  const target: string[] = [];
  for (let index = start; index < end; index += 1) {
    const value = argv[index];
    if (value.startsWith("-")) {
      if (valueOptions.has(value)) index += 1;
      continue;
    }
    target.push(value);
  }
  return target.join(" ");
}

function writeMachineResult(data: unknown): void {
  writeSuccess(data, {}, outputOptions({ json: true }, false));
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  try {
    if (argv.includes("--version") && machineOutput(argv)) {
      writeMachineResult({ version: packageVersion() });
      return 0;
    }
    const helpTarget = machineHelpTarget(argv);
    if (helpTarget !== undefined) {
      writeMachineResult(helpFor(helpTarget));
      return 0;
    }
    const app = new Pastel({
      name: "cockpit",
      importMeta: import.meta,
    });
    await app.run([process.argv[0], process.argv[1] ?? "cockpit", ...argv]);
    return 0;
  } catch (error) {
    const normalized = asCliError(error);
    const format = requestedOutput(argv);
    writeError(
      normalized,
      outputOptions({
        ...(format === "json" ? { json: true } : {}),
        ...(format === "jsonl" ? { jsonl: true } : {}),
        ...(format && format !== "json" && format !== "jsonl" ? { output: format } : {}),
      }),
    );
    return normalized.exitCode;
  }
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
)
  void main().then((code) => {
    process.exitCode ||= code;
  });
