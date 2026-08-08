import React, { useEffect, useMemo, useState } from "react";
import { ConfirmInput, Select, Spinner, StatusMessage, TextInput } from "@inkjs/ui";
import { Box, Text, render, useApp, useInput, useStdout, useWindowSize } from "ink";
import { type ResolvedConfig } from "../core/client.js";
import { asCliError } from "../core/errors.js";
import { resourceOperation } from "../operations/index.js";

type Item = Record<string, any>;
type Mode = "home" | "detail" | "search" | "create" | "edit" | "confirm" | "palette";
type Feedback = { message: string; variant: "error" | "success" | "warning" };

const COLORS = {
  accent: "cyan",
  accentSoft: "cyan",
  border: "gray",
  borderBright: "white",
  danger: "red",
  good: "green",
  muted: "gray",
  purple: "magenta",
  text: "white",
  warning: "yellow",
};

export function runTui(config: ResolvedConfig): Promise<void> {
  return new Promise((resolve, reject) => {
    const instance = render(<App config={config} />, {
      alternateScreen: true,
      incrementalRendering: true,
    });
    instance
      .waitUntilExit()
      .then(() => resolve())
      .catch(reject);
  });
}

export function App({
  config,
  onExit,
  onError,
  terminalMode = "none",
}: {
  config: ResolvedConfig;
  onExit?: () => void;
  onError?: (error: unknown) => void;
  terminalMode?: "manual" | "none";
}): React.ReactElement {
  const { exit } = useApp();
  const { columns, rows } = useWindowSize();
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState(0);
  const [mode, setMode] = useState<Mode>("home");
  const [paletteReturnMode, setPaletteReturnMode] = useState<"home" | "detail">("home");
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>();

  useTerminalTakeover(terminalMode === "manual");

  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          !query ||
          `${item.identifier ?? ""} ${item.name ?? ""}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [items, query],
  );
  const current = filtered[selected];
  const isWide = columns >= 100;
  const paletteActions = [
    { label: "Create work item", shortcut: "c" },
    { label: "Edit selected item", shortcut: "e", disabled: !current },
    { label: "Delete selected item", shortcut: "d", disabled: !current },
    { label: "Refresh work items", shortcut: "r" },
    { label: "Clear filter", shortcut: "x", disabled: !query },
    { label: "Quit Cockpit", shortcut: "q" },
  ];
  const quit = (): void => {
    onExit?.();
    exit();
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setSelected((value) => Math.min(value, Math.max(filtered.length - 1, 0)));
  }, [filtered.length]);

  async function load(): Promise<void> {
    setLoading(true);
    setFeedback(undefined);
    try {
      const page = await resourceOperation("work-item", "list", undefined, {
        config,
        options: { limit: 50 },
      });
      const nextItems = (page.data as Item[]) ?? [];
      setItems(nextItems);
      setSelected(0);
    } catch (error) {
      const normalized = asCliError(error);
      setFeedback({
        message: `${normalized.message}${normalized.hint ? ` · ${normalized.hint}` : ""}`,
        variant: "error",
      });
      onError?.(normalized);
    } finally {
      setLoading(false);
    }
  }

  async function save(nextName = name): Promise<void> {
    if (!nextName.trim()) {
      setFeedback({ message: "A title is required.", variant: "warning" });
      return;
    }
    try {
      if (mode === "create") {
        await resourceOperation("work-item", "create", undefined, {
          config,
          options: { name: nextName.trim() },
        });
      } else if (current) {
        await resourceOperation("work-item", "update", current.identifier ?? current.id, {
          config,
          options: { name: nextName.trim() },
        });
      }
      setMode("home");
      await load();
      setFeedback({
        message: mode === "create" ? "Work item created." : "Work item updated.",
        variant: "success",
      });
    } catch (error) {
      const normalized = asCliError(error);
      setFeedback({
        message: `${normalized.message}${normalized.hint ? ` · ${normalized.hint}` : ""}`,
        variant: "error",
      });
      onError?.(normalized);
    }
  }

  async function remove(): Promise<void> {
    if (!current) return;
    try {
      await resourceOperation("work-item", "delete", current.identifier ?? current.id, {
        config,
        options: { yes: true, noInput: true },
      });
      setMode("home");
      await load();
      setFeedback({ message: "Work item deleted.", variant: "success" });
    } catch (error) {
      const normalized = asCliError(error);
      setFeedback({
        message: `${normalized.message}${normalized.hint ? ` · ${normalized.hint}` : ""}`,
        variant: "error",
      });
      onError?.(normalized);
    }
  }

  function openPalette(): void {
    setPaletteReturnMode(mode === "detail" ? "detail" : "home");
    setMode("palette");
  }

  function runPaletteAction(shortcut: string): void {
    const action = paletteActions.find((candidate) => candidate.shortcut === shortcut);
    if (!action || action.disabled) return;
    if (action.shortcut === "c") {
      setName("");
      setMode("create");
    } else if (action.shortcut === "e" && current) {
      setName(titleOf(current));
      setMode("edit");
    } else if (action.shortcut === "d" && current) {
      setMode("confirm");
    } else if (action.shortcut === "r") {
      void load();
      setMode(paletteReturnMode);
    } else if (action.shortcut === "x") {
      setQuery("");
      setMode(paletteReturnMode);
    } else if (action.shortcut === "q") {
      quit();
    }
  }

  useInput(
    (input, key) => {
      if (mode === "palette") {
        if (key.escape) setMode(paletteReturnMode);
        return;
      }
      if (input === "q") return quit();
      if (key.escape) return mode === "detail" ? setMode("home") : quit();
      if (input === ":") return openPalette();
      if (input === "j" || key.downArrow)
        return setSelected((value) => Math.min(value + 1, Math.max(filtered.length - 1, 0)));
      if (input === "k" || key.upArrow) return setSelected((value) => Math.max(value - 1, 0));
      if (key.pageDown)
        return setSelected((value) =>
          Math.min(value + visibleCount, Math.max(filtered.length - 1, 0)),
        );
      if (key.pageUp) return setSelected((value) => Math.max(value - visibleCount, 0));
      if (key.home) return setSelected(0);
      if (key.end) return setSelected(Math.max(filtered.length - 1, 0));
      if (key.return && current) return setMode("detail");
      if (input === "/") {
        setMode("search");
        return;
      }
      if (input === "c") {
        setName("");
        setMode("create");
      } else if (input === "e" && current) {
        setName(titleOf(current));
        setMode("edit");
      } else if (input === "d" && current) {
        setMode("confirm");
      } else if (input === "r") {
        void load();
      }
    },
    { isActive: mode === "home" || mode === "detail" || mode === "palette" },
  );

  useInput(
    (_, key) => {
      if (key.escape) setMode("detail");
    },
    { isActive: mode === "confirm" },
  );

  const panelHeight = Math.max(8, rows - 13);
  const visibleCount = Math.max(1, Math.floor((panelHeight - 6) / 3));
  const maxStart = Math.max(filtered.length - visibleCount, 0);
  const start = Math.min(Math.max(selected - visibleCount + 1, 0), maxStart);
  const visibleItems = filtered.slice(start, start + visibleCount);

  return (
    <Box flexDirection="column" width="100%" minHeight={rows}>
      <Header config={config} columns={columns} itemCount={filtered.length} query={query} />

      {mode === "create" || mode === "edit" ? (
        <FormPanel
          mode={mode}
          name={name}
          onChange={setName}
          onCancel={() => setMode("home")}
          onSubmit={save}
        />
      ) : mode === "search" ? (
        <SearchPanel
          query={query}
          onChange={setQuery}
          onCancel={() => setMode("home")}
          onSubmit={() => setMode("home")}
        />
      ) : mode === "confirm" ? (
        <ConfirmPanel
          item={current}
          onCancel={() => setMode("detail")}
          onConfirm={() => void remove()}
        />
      ) : mode === "palette" ? (
        <PalettePanel actions={paletteActions} onSelect={runPaletteAction} />
      ) : mode === "detail" && !isWide ? (
        <DetailPanel item={current} narrow />
      ) : (
        <Box
          flexDirection={isWide ? "row" : "column"}
          width="100%"
          flexGrow={1}
          paddingX={1}
          gap={1}
        >
          <ListPanel
            items={visibleItems}
            selected={selected}
            start={start}
            total={filtered.length}
            query={query}
            isWide={isWide}
            empty={!loading && filtered.length === 0}
            height={panelHeight}
          />
          {isWide ? <DetailPanel item={current} height={panelHeight} /> : null}
        </Box>
      )}

      <Box paddingX={1} minHeight={1}>
        {loading ? (
          <Spinner label="Syncing work items" />
        ) : feedback ? (
          <StatusMessage variant={feedback.variant}>{feedback.message}</StatusMessage>
        ) : (
          <Text dimColor>{current ? "Ready" : "No selection"}</Text>
        )}
      </Box>
      <Footer mode={mode} />
    </Box>
  );
}

function Header({
  config,
  columns,
  itemCount,
  query,
}: {
  config: ResolvedConfig;
  columns: number;
  itemCount: number;
  query: string;
}): React.ReactElement {
  const workspace = config.workspace ?? "workspace";
  const project = config.project ?? "project";
  return (
    <Box flexDirection="column" paddingX={1} paddingTop={1}>
      <Box justifyContent="space-between" width="100%">
        <Text color={COLORS.accent} bold>
          ◆ COCKPIT
        </Text>
        <Text color={COLORS.good}>● CONNECTED</Text>
      </Box>
      <Box justifyContent="space-between" width="100%" marginTop={1}>
        <Text color={COLORS.purple}>
          {workspace} <Text dimColor>/</Text> {project}
        </Text>
        <Text dimColor>
          {itemCount} {itemCount === 1 ? "ITEM" : "ITEMS"}
        </Text>
      </Box>
      <Text color={COLORS.border} wrap="truncate-end">
        {"─".repeat(Math.max(1, columns - 2))}
      </Text>
      <Box justifyContent="space-between" width="100%">
        <Text color={COLORS.text} bold>
          WORK ITEMS
        </Text>
        <Text color={query ? COLORS.warning : COLORS.muted}>
          {query ? `FILTER · ${query}` : "ALL ACTIVE"}
        </Text>
      </Box>
    </Box>
  );
}

function ListPanel({
  items,
  selected,
  start,
  total,
  query,
  isWide,
  empty,
  height,
}: {
  items: Item[];
  selected: number;
  start: number;
  total: number;
  query: string;
  isWide: boolean;
  empty: boolean;
  height: number;
}): React.ReactElement {
  return (
    <Box
      flexDirection="column"
      width={isWide ? "58%" : "100%"}
      height={height}
      overflow="hidden"
      borderStyle="round"
      borderColor={COLORS.border}
      paddingX={1}
      paddingY={1}
      aria-label="Work item list"
      aria-role="listbox"
    >
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color={COLORS.muted}>QUEUE</Text>
        <Text dimColor>
          {total ? `${start + 1}–${Math.min(start + items.length, total)} / ${total}` : "EMPTY"}
        </Text>
      </Box>
      {empty ? (
        <Box flexDirection="column" paddingY={1}>
          <Text color={COLORS.accent} bold>
            No work items match.
          </Text>
          <Text dimColor>
            {query
              ? "Press x in the command palette to clear the filter."
              : "Press c to create the first one."}
          </Text>
        </Box>
      ) : (
        items.map((item, index) => {
          const absoluteIndex = start + index;
          const focused = absoluteIndex === selected;
          return (
            <WorkItemRow
              key={item.id ?? item.identifier ?? absoluteIndex}
              item={item}
              focused={focused}
            />
          );
        })
      )}
    </Box>
  );
}

function WorkItemRow({ item, focused }: { item: Item; focused: boolean }): React.ReactElement {
  return (
    <Box width="100%" paddingX={1} paddingY={0} marginBottom={1}>
      <Text color={focused ? COLORS.accent : COLORS.muted} bold inverse={focused}>
        {focused ? "❯" : " "}
      </Text>
      <Box flexDirection="column" paddingLeft={1} width="100%">
        <Text
          color={focused ? COLORS.text : COLORS.accentSoft}
          bold
          inverse={focused}
          wrap="truncate-end"
        >
          {displayRefOf(item) ? `${displayRefOf(item)} ` : ""}
          <Text color={focused ? COLORS.text : COLORS.accentSoft} inverse={focused}>
            {titleOf(item)}
          </Text>
        </Text>
        <Text dimColor wrap="truncate-end">
          {statusGlyph(item)} {statusOf(item)}{" "}
          <Text color={priorityColor(item)}>{priorityOf(item)}</Text>
          {assigneeOf(item) ? ` · ${assigneeOf(item)}` : ""}
        </Text>
      </Box>
    </Box>
  );
}

function DetailPanel({
  item,
  narrow = false,
  height,
}: {
  item?: Item;
  narrow?: boolean;
  height?: number;
}): React.ReactElement {
  return (
    <Box
      flexDirection="column"
      width={narrow ? "100%" : "42%"}
      height={height}
      overflow="hidden"
      borderStyle="round"
      borderColor={narrow ? COLORS.borderBright : COLORS.border}
      paddingX={2}
      paddingY={1}
      aria-label="Selected work item"
    >
      {!item ? (
        <Box flexDirection="column" paddingY={2}>
          <Text color={COLORS.muted}>NOTHING SELECTED</Text>
          <Text dimColor>Choose a work item from the queue.</Text>
        </Box>
      ) : (
        <>
          <Text color={COLORS.text} bold wrap="wrap">
            {titleOf(item)}
          </Text>
          <Text color={COLORS.border}>{"─".repeat(28)}</Text>
          <Box flexDirection="column" marginTop={1}>
            <Text color={COLORS.muted}>STATUS</Text>
            <Text color={COLORS.text}>
              {statusGlyph(item)} {statusOf(item)}
            </Text>
          </Box>
          <Box flexDirection="column" marginTop={1}>
            <Text color={COLORS.muted}>PRIORITY</Text>
            <Text color={priorityColor(item)}>{priorityOf(item)}</Text>
          </Box>
          <Box flexDirection="column" marginTop={1}>
            <Text color={COLORS.muted}>DESCRIPTION</Text>
            <Text color={COLORS.text} wrap="truncate-end">
              {descriptionOf(item)}
            </Text>
          </Box>
          <Box flexDirection="column" marginTop={1}>
            <Text color={COLORS.muted}>ASSIGNEE</Text>
            <Text color={COLORS.text}>{assigneeOf(item) || "Unassigned"}</Text>
          </Box>
          <Box marginTop={2}>
            <Text dimColor>Enter open · e edit · d delete</Text>
          </Box>
        </>
      )}
    </Box>
  );
}

function SearchPanel({
  query,
  onChange,
  onCancel,
  onSubmit,
}: {
  query: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: (value: string) => void;
}): React.ReactElement {
  useInput((_, key) => {
    if (key.escape) onCancel();
  });
  return (
    <Box
      flexDirection="column"
      width="100%"
      paddingX={2}
      paddingY={2}
      borderStyle="round"
      borderColor={COLORS.accent}
    >
      <Text color={COLORS.accent} bold>
        FILTER WORK ITEMS
      </Text>
      <Box marginTop={1}>
        <Text color={COLORS.warning}>/ </Text>
        <TextInput
          key="search"
          defaultValue={query}
          placeholder="title"
          onChange={onChange}
          onSubmit={onSubmit}
        />
      </Box>
      <Text dimColor>Type to filter · Enter apply · Esc cancel</Text>
    </Box>
  );
}

function FormPanel({
  mode,
  name,
  onChange,
  onCancel,
  onSubmit,
}: {
  mode: "create" | "edit";
  name: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: (value: string) => void;
}): React.ReactElement {
  useInput((_, key) => {
    if (key.escape) onCancel();
  });
  return (
    <Box
      flexDirection="column"
      width="100%"
      paddingX={2}
      paddingY={2}
      borderStyle="round"
      borderColor={COLORS.accent}
    >
      <Text color={COLORS.accent} bold>
        {mode === "create" ? "NEW WORK ITEM" : "EDIT WORK ITEM"}
      </Text>
      <Text dimColor>
        {mode === "create"
          ? "Create a focused task in the current project."
          : "Update the title without leaving the queue."}
      </Text>
      <Box marginTop={2}>
        <Text color={COLORS.muted}>TITLE </Text>
        <TextInput
          key={mode}
          defaultValue={name}
          placeholder="What needs to happen?"
          onChange={onChange}
          onSubmit={onSubmit}
        />
      </Box>
      <Box marginTop={2}>
        <Text dimColor>Enter save · Esc cancel</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={COLORS.warning}>
          Only the title is editable here; use the command for full field control.
        </Text>
      </Box>
    </Box>
  );
}

function ConfirmPanel({
  item,
  onCancel,
  onConfirm,
}: {
  item?: Item;
  onCancel: () => void;
  onConfirm: () => void;
}): React.ReactElement {
  return (
    <Box
      flexDirection="column"
      width="100%"
      paddingX={2}
      paddingY={2}
      borderStyle="round"
      borderColor={COLORS.danger}
    >
      <Text color={COLORS.danger} bold>
        DELETE WORK ITEM
      </Text>
      <Text color={COLORS.text} wrap="wrap">
        Delete {titleOf(item)}?
      </Text>
      <Text dimColor>This cannot be undone.</Text>
      <Box marginTop={1}>
        <Text color={COLORS.warning}>Confirm </Text>
        <ConfirmInput
          defaultChoice="cancel"
          submitOnEnter={false}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
        <Text dimColor> · Esc cancel</Text>
      </Box>
    </Box>
  );
}

function PalettePanel({
  actions,
  onSelect,
}: {
  actions: Array<{ label: string; shortcut: string; disabled?: boolean }>;
  onSelect: (shortcut: string) => void;
}): React.ReactElement {
  const options = actions
    .filter((action) => !action.disabled)
    .map((action) => ({ label: `${action.label}  [${action.shortcut}]`, value: action.shortcut }));
  return (
    <Box
      flexDirection="column"
      width="100%"
      paddingX={2}
      paddingY={1}
      borderStyle="round"
      borderColor={COLORS.purple}
    >
      <Text color={COLORS.purple} bold>
        COMMANDS
      </Text>
      <Text dimColor>Choose an action for the current project.</Text>
      <Box flexDirection="column" marginTop={1}>
        <Select
          options={options}
          visibleOptionCount={Math.min(6, options.length)}
          onChange={onSelect}
        />
      </Box>
      <Text dimColor>↑/↓ move · Enter run · Esc close</Text>
    </Box>
  );
}

function Footer({ mode }: { mode: Mode }): React.ReactElement {
  return (
    <Box paddingX={1} paddingY={1} justifyContent="space-between" width="100%">
      <Text dimColor>
        {mode === "home" || mode === "detail"
          ? "j/k move  pgup/pgdn page  home/end jump  / filter  : commands"
          : "Esc back"}
      </Text>
      <Text color={COLORS.muted}>q quit</Text>
    </Box>
  );
}

function useTerminalTakeover(enabled: boolean): void {
  const { stdout } = useStdout();
  useEffect(() => {
    if (!enabled || !stdout.isTTY) return;

    let restored = false;
    const restore = (): void => {
      if (restored) return;
      restored = true;
      stdout.write("\u001B[?25h\u001B[?1049l");
    };
    const onSignal = (): void => {
      restore();
      process.exit(143);
    };

    stdout.write("\u001B[?1049h\u001B[?25l\u001B[2J\u001B[H");
    process.once("exit", restore);
    process.once("SIGTERM", onSignal);
    process.once("SIGHUP", onSignal);
    return () => {
      restore();
      process.removeListener("exit", restore);
      process.removeListener("SIGTERM", onSignal);
      process.removeListener("SIGHUP", onSignal);
    };
  }, [enabled, stdout]);
}

export function truncate(value: string, length: number): string {
  return value.length > length ? `${value.slice(0, Math.max(0, length - 1))}…` : value;
}

function displayRefOf(item?: Item): string {
  const sequence = item?.sequence_id ?? item?.sequenceId ?? item?.number;
  if (sequence !== undefined && sequence !== null) {
    const project = item?.project_identifier ?? item?.projectIdentifier;
    return project ? `${project}-${sequence}` : String(sequence);
  }
  const identifier = item?.identifier;
  return typeof identifier === "string" && !isUuid(identifier) ? identifier : "";
}

function titleOf(item?: Item): string {
  return truncate(String(item?.name ?? item?.title ?? "Untitled work item"), 72);
}

function statusOf(item: Item): string {
  const status = item?.state_name ?? item?.state?.name ?? item?.state ?? item?.status;
  return isUuid(status) || !status ? "Unstarted" : String(status);
}

function statusGlyph(item: Item): string {
  const status = statusOf(item).toLowerCase();
  if (/done|complete|closed|cancel/.test(status)) return "✓";
  if (/progress|started|review/.test(status)) return "●";
  return "○";
}

function priorityOf(item: Item): string {
  return String(item?.priority ?? "No priority");
}

function priorityColor(item: Item): string {
  const priority = priorityOf(item).toLowerCase();
  if (/urgent|high/.test(priority)) return COLORS.warning;
  if (/low/.test(priority)) return COLORS.muted;
  return COLORS.accentSoft;
}

function assigneeOf(item: Item): string {
  const assignee = item?.assignee ?? item?.assignees?.[0];
  if (!assignee) return "";
  if (typeof assignee === "string") return isUuid(assignee) ? "" : assignee;
  const label = String(
    assignee.display_name ?? assignee.name ?? assignee.email ?? assignee.id ?? "Assigned",
  );
  return isUuid(label) ? "" : label;
}

function isUuid(value: unknown): boolean {
  return typeof value === "string" && /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value);
}

function descriptionOf(item: Item): string {
  const raw = item?.description_stripped ?? item?.description ?? item?.description_html;
  if (!raw) return "No description yet.";
  return truncate(
    String(raw)
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim(),
    180,
  );
}
