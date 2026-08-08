import { describe, expect, it } from "vitest";
import { join } from "node:path";
import { packageVersion } from "../src/cli.js";
import { configPath } from "../src/core/config.js";
import * as rootCommand from "../src/commands/index.js";
import { collectPages } from "../src/core/pagination.js";
import { asCliError, redact } from "../src/core/errors.js";
import { pickUnique, resolveProject, resolveWorkItem } from "../src/core/resolve.js";
import { HELP, helpFor, runCommand } from "../src/command-helpers.js";

describe("plane CLI contracts", () => {
  it("follows cursors only for --all and respects the total limit", async () => {
    const cursors: (string | undefined)[] = [];
    const page = await collectPages(
      async (cursor, _limit) => {
        cursors.push(cursor);
        return cursor
          ? { results: [{ id: 3 }], next_cursor: undefined, total_results: 3 }
          : { results: [{ id: 1 }, { id: 2 }], next_cursor: "next", total_results: 3 };
      },
      { all: true, limit: 3 },
    );
    expect(page.results).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(cursors).toEqual([undefined, "next"]);
    expect(page.meta.totalResults).toBe(3);
  });

  it("rejects ambiguous references with candidates", () => {
    expect(() =>
      pickUnique(
        "build",
        [
          { id: "1", name: "Build" },
          { id: "2", name: "build" },
        ],
        "Project",
      ),
    ).toThrowError(/ambiguous/i);
    try {
      pickUnique(
        "build",
        [
          { id: "1", name: "Build" },
          { id: "2", name: "build" },
        ],
        "Project",
      );
    } catch (error) {
      expect(asCliError(error).envelope().error).toHaveProperty("details.candidates");
    }
  });

  it("redacts credential-shaped output", () => {
    expect(redact({ token: "secret", authorization: "Bearer abc", text: "ok" })).toEqual({
      token: "[REDACTED]",
      authorization: "[REDACTED]",
      text: "ok",
    });
  });

  it("does not expose the raw API escape hatch", () => {
    expect(Object.keys(HELP).some((key) => key === "api")).toBe(false);
  });

  it("exposes grouped machine-readable help and a package version", () => {
    expect(helpFor("work-item").commands).toEqual(
      expect.arrayContaining([expect.objectContaining({ command: "work-item create" })]),
    );
    expect(helpFor("").commands).toEqual(
      expect.arrayContaining([expect.objectContaining({ command: "doctor" })]),
    );
    expect(packageVersion()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("does not register shared options on the root command", () => {
    expect("options" in rootCommand).toBe(false);
  });

  it("does not leak terminal color settings into mutation options", async () => {
    let received: Record<string, unknown> | undefined;
    await runCommand({ noColor: true, state: "done", json: true }, async (input) => {
      received = input.options;
      return { data: { ok: true }, meta: {} };
    });
    expect(received).toEqual({ noColor: true, state: "done", json: true, noInput: false });
  });

  it("stores configuration in the project-local .cockpit directory", () => {
    expect(configPath()).toBe(join(process.cwd(), ".cockpit", "config.json"));
  });

  it("resolves projects through the standard endpoint", async () => {
    const calls: string[] = [];
    const project = { id: "project-id", identifier: "ENG" };
    const client = {
      projects: {
        list: async () => {
          calls.push("list");
          return { results: [project] };
        },
        listLite: async () => {
          throw new Error("unsupported endpoint");
        },
      },
    };
    await expect(resolveProject(client, "workspace", "ENG")).resolves.toEqual(project);
    expect(calls).toEqual(["list"]);
  });

  it("resolves the project before retrieving a UUID work item", async () => {
    const calls: string[] = [];
    const client = {
      projects: {
        list: async () => {
          calls.push("projects.list");
          return { results: [{ id: "project-id", identifier: "ENG" }] };
        },
      },
      workItems: {
        retrieve: async (...args: string[]) => {
          calls.push(`work-items.retrieve:${args.join(":")}`);
          return { id: "item-id", project: "project-id" };
        },
      },
    };

    await expect(
      resolveWorkItem(client, "workspace", "ENG", "11111111-1111-4111-8111-111111111111"),
    ).resolves.toEqual({ id: "item-id", project: "project-id" });
    expect(calls).toEqual([
      "projects.list",
      "work-items.retrieve:workspace:project-id:11111111-1111-4111-8111-111111111111",
    ]);
  });
});
