import { useEffect } from "react";
import { commandOptions, resolveConfigFromOptions } from "../command-helpers.js";
import { asCliError, CliError } from "../core/errors.js";
import { outputOptions, writeError } from "../core/output.js";
import { runTui } from "../tui/app.js";

export const description = "Open the interactive terminal UI.";
export const options = commandOptions();

export default function Tui({ options }: { options: Record<string, any> }) {
  useEffect(() => {
    void (async () => {
      try {
        if (!process.stdin.isTTY || !process.stdout.isTTY || process.env.CI)
          throw new CliError("usage", "The TUI requires an interactive terminal.");
        await runTui(resolveConfigFromOptions(options));
      } catch (error) {
        const normalized = asCliError(error);
        writeError(normalized, outputOptions(options));
        process.exitCode = normalized.exitCode;
      }
    })();
  }, [options]);
  return null;
}
