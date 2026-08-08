import React from "react";
import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/operations/index.js", () => ({
  resourceOperation: vi.fn(async () => ({
    data: [
      {
        id: "1",
        identifier: "COC-1",
        name: "Polish the command center",
        state_name: "In Progress",
        priority: "high",
        description_stripped: "Make the terminal feel intentional.",
      },
    ],
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
    instance.unmount();
  });
});
