import { describe, expect, it, vi } from "vitest";
import { CliError } from "../src/core/errors.js";

vi.mock("../src/core/client.js", () => ({
  createClient: vi.fn(),
  requireWorkspace: (config: { workspace?: string }) => config.workspace,
  requireProject: (config: { project?: string }) => config.project,
}));

import { createClient } from "../src/core/client.js";
import { resourceOperation } from "../src/operations/index.js";

const input = {
  config: {
    baseUrl: "https://api.plane.so",
    workspace: "workspace",
    project: "ENG",
  },
  options: { yes: true, noInput: true },
} as any;

describe("mutation verification", () => {
  it("verifies deletion by rereading the target", async () => {
    const project = { id: "project-id", identifier: "ENG" };
    const retrieve = vi.fn().mockRejectedValue(new CliError("not_found", "gone"));
    const client = {
      projects: {
        list: vi.fn().mockResolvedValue({ results: [project] }),
        delete: vi.fn().mockResolvedValue(undefined),
        retrieve,
      },
    };
    vi.mocked(createClient).mockReturnValue(client as any);

    await expect(resourceOperation("project", "delete", "ENG", input)).resolves.toEqual({
      data: { deleted: true, target: project, verified: true },
      meta: {},
    });
    expect(retrieve).toHaveBeenCalledWith("workspace", "project-id");
  });

  it("returns the reread resource after archive", async () => {
    const project = { id: "project-id", identifier: "ENG" };
    const archived = { ...project, archived_at: "2026-08-08T00:00:00Z" };
    const retrieve = vi.fn().mockResolvedValue(archived);
    const client = {
      projects: {
        list: vi.fn().mockResolvedValue({ results: [project] }),
        archive: vi.fn().mockResolvedValue(undefined),
        retrieve,
      },
    };
    vi.mocked(createClient).mockReturnValue(client as any);

    await expect(resourceOperation("project", "archive", "ENG", input)).resolves.toEqual({
      data: archived,
      meta: {},
    });
    expect(retrieve).toHaveBeenCalledWith("workspace", "project-id");
  });
});

describe("work-item list refreshes", () => {
  it("reuses the resolved project ID for subsequent lists", async () => {
    const projectsList = vi.fn().mockResolvedValue({
      results: [{ id: "project-id", identifier: "ENG" }],
    });
    const workItemsList = vi.fn().mockResolvedValue({ results: [] });
    vi.mocked(createClient).mockReturnValue({
      projects: { list: projectsList },
      workItems: { list: workItemsList },
    } as any);

    const first = await resourceOperation("work-item", "list", undefined, input);
    await resourceOperation("work-item", "list", undefined, {
      ...input,
      options: { ...input.options, projectId: first.meta.projectId },
    });

    expect(first.meta.projectId).toBe("project-id");
    expect(projectsList).toHaveBeenCalledTimes(1);
    expect(workItemsList).toHaveBeenCalledTimes(2);
  });
});
