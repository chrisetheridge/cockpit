import { describe, expect, it } from "vitest";
import { collectPages } from "../src/core/pagination.js";
import { asCliError, redact } from "../src/core/errors.js";
import { pickUnique, resolveProject } from "../src/core/resolve.js";
import { HELP } from "../src/command-helpers.js";

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
});
