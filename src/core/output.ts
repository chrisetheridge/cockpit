import { CliError, redact } from "./errors.js";
import { sequenceData } from "./pagination.js";

export type OutputFormat = "table" | "plain" | "json" | "jsonl";
export type OutputOptions = { format: OutputFormat; color: boolean; tty: boolean };

export function outputOptions(
  options: Record<string, unknown>,
  stdoutIsTty = Boolean(process.stdout.isTTY),
): OutputOptions {
  const format = options.output as OutputFormat | undefined;
  return {
    format: options.jsonl
      ? "jsonl"
      : options.json
        ? "json"
        : (format ?? (stdoutIsTty ? "table" : "json")),
    color: options.color !== false && !process.env.NO_COLOR,
    tty: stdoutIsTty,
  };
}

export function writeSuccess(
  data: unknown,
  meta: Record<string, unknown>,
  options: OutputOptions,
  stdout = process.stdout,
): void {
  if (options.format === "json") {
    stdout.write(`${JSON.stringify({ data: redact(data), meta: cleanMeta(meta) })}\n`);
    return;
  }
  if (options.format === "jsonl") {
    stdout.write(
      `${sequenceData(data)
        .map((item) => JSON.stringify(redact(item)))
        .join("\n")}\n`,
    );
    return;
  }
  if (options.format === "plain") {
    stdout.write(`${plain(data)}\n`);
    return;
  }
  stdout.write(`${table(data, options.color)}\n`);
}

export function writeError(error: CliError, options: OutputOptions, stderr = process.stderr): void {
  if (options.format === "json" || options.format === "jsonl")
    stderr.write(`${JSON.stringify(error.envelope())}\n`);
  else stderr.write(`${error.message}${error.hint ? ` ${error.hint}` : ""}\n`);
}

function cleanMeta(meta: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(meta).filter(([, value]) => value !== undefined));
}

function plain(data: unknown): string {
  if (Array.isArray(data))
    return data
      .map((item) => (typeof item === "object" ? JSON.stringify(item) : String(item)))
      .join("\n");
  return typeof data === "object" && data !== null ? JSON.stringify(data) : String(data ?? "");
}

function table(data: unknown, color: boolean): string {
  if (!Array.isArray(data)) return plain(data);
  if (data.length === 0) return "No results.";
  const rows = data.map((item) => {
    const value = item as Record<string, unknown>;
    const id = value.identifier ?? value.id ?? "";
    const title = value.name ?? value.title ?? value.description ?? "";
    const status = value.state_name ?? value.state ?? value.status ?? "";
    return [String(id), String(title), String(status)];
  });
  const widths = rows[0].map((_, index) => Math.max(...rows.map((row) => row[index].length)));
  return rows
    .map((row) =>
      row
        .map((cell, index) =>
          color && index === 0 ? `\x1b[1m${cell}\x1b[0m` : cell.padEnd(widths[index]),
        )
        .join("  "),
    )
    .join("\n");
}

export function assertJsonlSequence(data: unknown): asserts data is unknown[] {
  if (!Array.isArray(data))
    throw new CliError("usage", "JSON Lines output is only available for sequence results.");
}
