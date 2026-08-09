import { CliError } from "./errors.js";

export type Page<T> = {
  results?: T[];
  next_cursor?: string;
  nextCursor?: string;
  total_pages?: number;
  [key: string]: unknown;
};

export function pageMeta(page: Page<unknown>, total?: number): Record<string, unknown> {
  const nextCursor = page.next_cursor ?? page.nextCursor;
  return {
    ...(nextCursor ? { nextCursor } : {}),
    ...(total === undefined ? {} : { totalResults: total }),
  };
}

export async function collectPages<T>(
  fetchPage: (cursor?: string, limit?: number) => Promise<Page<T>>,
  options: { all?: boolean; limit?: number; cursor?: string } = {},
): Promise<{ results: T[]; meta: Record<string, unknown> }> {
  const results: T[] = [];
  let cursor = options.cursor;
  let nextCursor: string | undefined;
  let totalResults: number | undefined;
  let totalPages: number | undefined;
  let batch: T[] = [];
  let pagesFetched = 0;
  const seenCursors = new Set<string>();
  do {
    if (cursor) {
      if (seenCursors.has(cursor)) break;
      seenCursors.add(cursor);
    }
    const remaining =
      options.limit === undefined ? undefined : Math.max(options.limit - results.length, 0);
    if (remaining === 0) break;
    const page = await fetchPage(cursor, remaining);
    pagesFetched += 1;
    totalResults ??= typeof page.total_results === "number" ? page.total_results : undefined;
    totalPages ??= typeof page.total_pages === "number" ? page.total_pages : undefined;
    batch = Array.isArray(page.results) ? page.results : [];
    results.push(...batch.slice(0, remaining));
    nextCursor = page.next_cursor ?? page.nextCursor;
    cursor = nextCursor;
  } while (
    options.all &&
    nextCursor &&
    (totalPages === undefined || pagesFetched < totalPages)
  );
  return {
    results,
    meta: {
      ...(nextCursor && !options.all ? { nextCursor } : {}),
      ...(totalResults === undefined ? {} : { totalResults }),
    },
  };
}

export function sequenceData(data: unknown): unknown[] {
  if (!Array.isArray(data))
    throw new CliError("usage", "JSON Lines output is only available for sequence results.");
  return data;
}
