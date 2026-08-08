import { CliError } from "./errors.js";

type Named = {
  id?: string;
  identifier?: string;
  name?: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
};

export function pickUnique<T extends Named>(reference: string, values: T[], label: string): T {
  const normalized = reference.toLowerCase();
  const matches = values.filter((value) =>
    [
      value.id,
      value.identifier,
      value.name,
      value.display_name,
      `${value.first_name ?? ""} ${value.last_name ?? ""}`.trim(),
    ]
      .filter(Boolean)
      .some((candidate) => candidate!.toLowerCase() === normalized),
  );
  if (matches.length === 1) return matches[0];
  if (matches.length > 1)
    throw new CliError(
      "ambiguous_reference",
      `${label} reference is ambiguous.`,
      409,
      "Use a UUID or unique identifier.",
      {
        candidates: matches.map((item) => ({ id: item.id, name: item.name ?? item.display_name })),
      },
    );
  throw new CliError("not_found", `${label} not found: ${reference}`);
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function resolveProject(
  client: any,
  workspace: string,
  reference: string,
): Promise<any> {
  if (isUuid(reference)) return client.projects.retrieve(workspace, reference);
  const page = await client.projects.list(workspace, { include_archived: true, per_page: 100 });
  return pickUnique(reference, page.results ?? [], "Project");
}

export async function resolveWorkItem(
  client: any,
  workspace: string,
  project: string | undefined,
  reference: string,
): Promise<any> {
  if (/^[A-Za-z][A-Za-z0-9]*-\d+$/.test(reference))
    return client.workItems.retrieveByIdentifier(workspace, reference);
  if (isUuid(reference) && project) return client.workItems.retrieve(workspace, project, reference);
  const page = project
    ? await client.workItems.list(workspace, project, { per_page: 100 })
    : await client.workItems.listWorkspace(workspace, { per_page: 100 });
  return pickUnique(reference, page.results ?? [], "Work item");
}

export async function resolveNamed(
  client: any,
  method: string,
  args: unknown[],
  reference: string,
  label: string,
): Promise<any> {
  const page = await client[method](...args);
  return pickUnique(reference, page.results ?? page ?? [], label);
}
