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

function machineOutput(argv: string[]): boolean {
  if (argv.includes("--json") || argv.includes("--jsonl")) return true;
  const index = argv.findIndex((value) => value === "--output" || value.startsWith("--output="));
  if (index < 0) return false;
  const value = argv[index].includes("=")
    ? argv[index].slice(argv[index].indexOf("=") + 1)
    : argv[index + 1];
  return value === "json" || value === "jsonl";
}

function machineHelpTarget(argv: string[]): string | undefined {
  if (!machineOutput(argv)) return undefined;
  const helpIndex = argv.indexOf("help");
  const helpFlagIndex = argv.indexOf("--help");
  if (helpIndex < 0 && helpFlagIndex < 0) return undefined;
  const start = helpIndex >= 0 ? helpIndex + 1 : 0;
  const end = helpIndex >= 0 ? argv.length : helpFlagIndex;
  return argv
    .slice(start, end)
    .filter((value) => !value.startsWith("-"))
    .join(" ");
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
    writeError(normalized, outputOptions({ json: argv.includes("--json") }));
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
