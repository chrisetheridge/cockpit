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

import { App, truncate } from "../src/tui/app.js";

describe("TUI", () => {
  it("truncates long terminal labels without overflowing the row", () => {
    expect(truncate("123456", 5)).toBe("1234…");
    expect(truncate("short", 5)).toBe("short");
  });

  it("renders the command-center hierarchy", async () => {
    const instance = render(
      <App config={{ baseUrl: "https://api.plane.so", workspace: "demo", project: "cockpit" }} />,
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
});
