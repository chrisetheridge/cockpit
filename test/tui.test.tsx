import React from "react";
import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/operations/index.js", () => ({
  resourceOperation: vi.fn(async () => ({
    data: Array.from({ length: 20 }, (_, index) => ({
      id: String(index + 1),
      identifier: `00000000-0000-0000-0000-${String(index + 1).padStart(12, "0")}`,
      name: index === 0 ? "Polish the command center" : `Work item ${index + 1}`,
      state_name: "In Progress",
      priority: "high",
      description_stripped: "Make the terminal feel intentional.",
    })),
  })),
}));

import { resourceOperation } from "../src/operations/index.js";
import { App, truncate } from "../src/tui/app.js";

describe("TUI", () => {
  it("truncates long terminal labels without overflowing the row", () => {
    expect(truncate("123456", 5)).toBe("1234…");
    expect(truncate("short", 5)).toBe("short");
  });

  it("renders the command-center hierarchy", async () => {
    const instance = render(
      <App
        config={{
          baseUrl: "https://api.plane.so",
          workspace: "demo",
          project: "cockpit",
          tuiSyncIntervalSeconds: 5,
        }}
      />,
    );
    await new Promise((resolve) => setImmediate(resolve));
    expect(instance.lastFrame()).toContain("COCKPIT");
    expect(instance.lastFrame()).toContain("Polish the command center");
    expect(instance.lastFrame()).not.toContain("00000000-0000-0000-0000-000000000001");
    expect(instance.lastFrame()).not.toContain("INSPECTING");
    instance.stdin.write("j");
    await new Promise((resolve) => setImmediate(resolve));
    expect(instance.lastFrame()).toContain("Work item 2");
    instance.unmount();
  });

  it("syncs work items on the configured interval while browsing", async () => {
    vi.useFakeTimers();
    const operation = vi.mocked(resourceOperation);
    operation.mockClear();
    const instance = render(
      <App
        config={{
          baseUrl: "https://api.plane.so",
          workspace: "demo",
          project: "cockpit",
          tuiSyncIntervalSeconds: 5,
        }}
      />,
    );

    await vi.advanceTimersByTimeAsync(0);
    expect(operation).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(operation).toHaveBeenCalledTimes(2);

    instance.unmount();
    vi.useRealTimers();
  });

  it("does not overlap a sync while the previous request is pending", async () => {
    vi.useFakeTimers();
    const operation = vi.mocked(resourceOperation);
    let release: (() => void) | undefined;
    operation.mockClear();
    operation.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ data: [] });
        }),
    );
    const instance = render(
      <App
        config={{
          baseUrl: "https://api.plane.so",
          workspace: "demo",
          project: "cockpit",
          tuiSyncIntervalSeconds: 5,
        }}
      />,
    );

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(operation).toHaveBeenCalledTimes(1);

    release?.();
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(4_999);
    expect(operation).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(operation).toHaveBeenCalledTimes(2);

    instance.unmount();
    vi.useRealTimers();
  });
});
