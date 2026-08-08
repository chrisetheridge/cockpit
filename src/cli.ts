#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Pastel from "pastel";
import { asCliError } from "./core/errors.js";
import { outputOptions, writeError } from "./core/output.js";

export async function main(argv = process.argv.slice(2)): Promise<number> {
  try {
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
