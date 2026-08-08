import React, { useEffect, useState } from "react";
import { Box, Text, render, useInput } from "ink";
import { type ResolvedConfig } from "../core/client.js";
import { asCliError } from "../core/errors.js";
import { resourceOperation } from "../operations/index.js";

type Item = Record<string, any>;
type Mode = "home" | "detail" | "search" | "create" | "edit" | "confirm";

export function runTui(config: ResolvedConfig): Promise<void> {
  return new Promise((resolve, reject) => {
    const instance = render(<App config={config} onExit={resolve} onError={() => undefined} />);
    instance.waitUntilExit().catch(reject);
  });
}

export function App({
  config,
  onExit,
  onError,
}: {
  config: ResolvedConfig;
  onExit: () => void;
  onError: (error: unknown) => void;
}): React.ReactElement {
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState(0);
  const [mode, setMode] = useState<Mode>("home");
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("Loading work items...");
  useEffect(() => {
    void load();
  }, []);
  async function load(): Promise<void> {
    try {
      const page = await resourceOperation("work-item", "list", undefined, {
        config,
        options: { limit: 50 },
      });
      setItems((page.data as Item[]) ?? []);
      setSelected(0);
      setMessage((page.data as Item[])?.length ? "" : "No work items. Press c to create one.");
    } catch (error) {
      const normalized = asCliError(error);
      setMessage(`${normalized.message} ${normalized.hint ?? ""}`);
      onError(normalized);
    }
  }

  useInput((input, key) => {
    if (mode === "confirm") {
      if (input.toLowerCase() === "y") void remove();
      if (key.escape || input.toLowerCase() === "n") setMode("detail");
      return;
    }
    if (mode === "search") {
      if (key.escape || key.return) return setMode("home");
      if (key.backspace || key.delete) return setQuery((value) => value.slice(0, -1));
      if (input && !key.ctrl && !key.meta) setQuery((value) => value + input);
      return;
    }
    if (mode === "create" || mode === "edit") {
      if (key.escape) return setMode("detail");
      if (key.return) return void save();
      if (key.backspace || key.delete) return setName((value) => value.slice(0, -1));
      if (input && !key.ctrl && !key.meta) setName((value) => value + input);
      return;
    }
    if (input === "q") return onExit();
    if (key.escape) return mode === "detail" ? setMode("home") : onExit();
    if (input === "j" || key.downArrow)
      return setSelected((value) => Math.min(value + 1, filtered.length - 1));
    if (input === "k" || key.upArrow) return setSelected((value) => Math.max(value - 1, 0));
    if (key.return) return setMode("detail");
    if (input === "/") {
      setQuery("");
      setMode("search");
      return;
    }
    if (input === "c") {
      setName("");
      setMode("create");
    }
    if (input === "e" && filtered[selected]) {
      setName(filtered[selected].name ?? "");
      setMode("edit");
    }
    if (input === "d" && filtered[selected]) setMode("confirm");
  });

  const filtered = items.filter(
    (item) =>
      !query ||
      `${item.identifier ?? ""} ${item.name ?? ""}`.toLowerCase().includes(query.toLowerCase()),
  );
  const current = filtered[selected];
  async function save(): Promise<void> {
    if (!name.trim()) return setMessage("Name is required.");
    try {
      if (mode === "create")
        await resourceOperation("work-item", "create", undefined, {
          config,
          options: { name: name.trim() },
        });
      else if (current)
        await resourceOperation("work-item", "update", current.identifier ?? current.id, {
          config,
          options: { name: name.trim() },
        });
      setMode("home");
      await load();
    } catch (error) {
      const normalized = asCliError(error);
      setMessage(normalized.message);
      onError(normalized);
    }
  }
  async function remove(): Promise<void> {
    if (!current) return setMode("home");
    try {
      await resourceOperation("work-item", "delete", current.identifier ?? current.id, {
        config,
        options: { yes: true, noInput: true },
      });
      setMode("home");
      await load();
    } catch (error) {
      const normalized = asCliError(error);
      setMessage(normalized.message);
      onError(normalized);
    }
  }

  return (
    <Box flexDirection="column" width="100%">
      <Text color="magenta">
        PLANE / {config.workspace ?? "workspace"} / {config.project ?? "project"}
      </Text>
      <Text dimColor>
        {mode === "home" ? "WORK ITEMS" : mode.toUpperCase()} {query ? ` / ${query}` : ""}
      </Text>
      {mode === "create" || mode === "edit" ? (
        <Box flexDirection="column" padding={1}>
          <Text>{mode === "create" ? "CREATE WORK ITEM" : "EDIT WORK ITEM"}</Text>
          <Text>Name: {name}_</Text>
          <Text dimColor>Enter save Esc cancel</Text>
        </Box>
      ) : mode === "confirm" ? (
        <Box flexDirection="column" padding={1}>
          <Text color="yellow">DELETE {current?.identifier ?? current?.id}?</Text>
          <Text>This cannot be undone. y confirm n cancel</Text>
        </Box>
      ) : mode === "search" ? (
        <Box flexDirection="column" padding={1}>
          <Text>SEARCH: {query}_</Text>
          <Text dimColor>Enter accept Esc cancel</Text>
        </Box>
      ) : (
        <>
          {message ? (
            <Text color="yellow">{message}</Text>
          ) : (
            filtered.map((item, index) => (
              <Text key={item.id ?? index} color={index === selected ? "magenta" : undefined}>
                {index === selected ? "┃" : "│"} {item.identifier ?? item.id} {item.name}{" "}
                {item.state_name ?? item.state ?? ""}
              </Text>
            ))
          )}
          {mode === "detail" && current ? (
            <Box flexDirection="column" padding={1}>
              <Text bold>
                {current.identifier ?? current.id} {current.name}
              </Text>
              <Text>
                {current.description_stripped ?? current.description_html ?? "No description."}
              </Text>
              <Text dimColor>Esc back e edit d delete q quit</Text>
            </Box>
          ) : (
            <Text dimColor>
              j/k navigate Enter inspect c create e edit d delete / filter q quit
            </Text>
          )}
        </>
      )}
    </Box>
  );
}
