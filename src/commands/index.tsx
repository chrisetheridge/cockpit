import { useEffect } from "react";
import { commandOptions, helpFor, resolveConfigFromOptions } from "../command-helpers.js";
import { HELP } from "../command-helpers.js";
import { outputOptions, writeSuccess } from "../core/output.js";
import { App } from "../tui/app.js";
import { type CommandProps } from "../command-helpers.js";

export const description = HELP[""].description;
export const options = commandOptions();

export default function Index({ options }: Pick<CommandProps, "options">) {
  if (process.stdin.isTTY && process.stdout.isTTY && !process.env.CI && !options.noInput && !options.json && !options.jsonl && !options.output)
    return <App config={resolveConfigFromOptions(options)} onExit={() => process.exit(0)} onError={() => undefined} />;
  return <Help options={options} />;
}

function Help({ options }: Pick<CommandProps, "options">) {
  useEffect(() => {
    writeSuccess(helpFor(""), {}, outputOptions({ ...options, json: true }, false));
  }, [options]);
  return null;
}
