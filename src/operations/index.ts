import {
  createClient,
  requireProject,
  requireWorkspace,
  type ResolvedConfig,
} from "../core/client.js";
import { collectPages } from "../core/pagination.js";
import { asCliError, CliError } from "../core/errors.js";
import { pickUnique, resolveNamed, resolveProject, resolveWorkItem } from "../core/resolve.js";
import { parseData } from "../core/data.js";

export type OperationInput = { config: ResolvedConfig; options: Record<string, any> };

export async function doctor(
  input: OperationInput,
): Promise<{ data: Record<string, unknown>; meta: Record<string, unknown> }> {
  const { config } = input;
  const result: Record<string, unknown> = {
    cliVersion: process.env.npm_package_version ?? "0.1.0",
    apiOrigin: config.baseUrl,
    selectedContext: {
      profile: config.profile,
      workspace: config.workspace,
      project: config.project,
    },
    authentication: {
      configured: Boolean(config.apiKey || config.accessToken),
      method: config.apiKey ? "api_key" : config.accessToken ? "access_token" : null,
    },
    capabilityGroups: [
      "context",
      "projects",
      "members",
      "work-items",
      "states",
      "labels",
      "comments",
      "relations",
      "cycles",
      "modules",
      "tui",
    ],
  };
  if (!config.apiKey && !config.accessToken) return { data: result, meta: {} };
  try {
    const client = createClient(config);
    const user = await client.users.me();
    result.authentication = {
      configured: true,
      method: config.apiKey ? "api_key" : "access_token",
      status: "ok",
    };
    result.user = user;
    return { data: result, meta: {} };
  } catch (error) {
    throw new CliError(
      "authentication",
      "Plane connectivity check failed.",
      undefined,
      "Check the credential and base URL.",
      { cause: error instanceof Error ? error.message : String(error) },
    );
  }
}

export async function userMe(input: OperationInput): Promise<any> {
  return (await createClient(input.config).users.me()) as any;
}

export async function listMembers(
  input: OperationInput,
): Promise<{ data: any[]; meta: Record<string, unknown> }> {
  const client = createClient(input.config);
  const workspace = requireWorkspace(input.config);
  if (input.options.project) {
    const project = await resolveProject(client, workspace, input.options.project);
    return { data: await client.projects.getMembers(workspace, project.id), meta: {} };
  }
  return { data: await client.workspace.getMembers(workspace), meta: {} };
}

export async function resourceOperation(
  resource: string,
  action: string,
  reference: string | undefined,
  input: OperationInput,
): Promise<{ data: unknown; meta: Record<string, unknown> }> {
  const client = createClient(input.config);
  const workspace = requireWorkspace(input.config);
  const projectRef = input.config.project ?? input.options.project;
  const listOptions = {
    all: Boolean(input.options.all),
    limit: toNumber(input.options.limit),
    cursor: input.options.cursor as string | undefined,
  };

  if (resource === "project")
    return projectOperation(action, reference, input, client, workspace, listOptions);
  if (resource === "project-feature") return featureOperation(action, input, client, workspace);
  if (resource === "work-item")
    return workItemOperation(action, reference, input, client, workspace, projectRef, listOptions);
  if (resource === "state" || resource === "label")
    return simpleProjectResource(
      resource,
      action,
      reference,
      input,
      client,
      workspace,
      projectRef,
      listOptions,
    );
  if (resource === "comment")
    return commentOperation(action, reference, input, client, workspace, projectRef, listOptions);
  if (resource === "relation")
    return relationOperation(action, reference, input, client, workspace, projectRef);
  if (resource === "cycle" || resource === "module")
    return containerOperation(
      resource,
      action,
      reference,
      input,
      client,
      workspace,
      projectRef,
      listOptions,
    );
  throw new CliError("usage", `Unsupported resource: ${resource}`);
}

async function projectOperation(
  action: string,
  reference: string | undefined,
  input: OperationInput,
  client: any,
  workspace: string,
  listOptions: { all: boolean; limit?: number; cursor?: string },
): Promise<any> {
  if (action === "list")
    return paged(
      (cursor, limit) =>
        client.projects.list(workspace, { include_archived: true, cursor, per_page: limit }),
      listOptions,
    );
  if (!reference && action !== "create")
    throw new CliError("usage", "A project reference is required.");
  if (action === "create")
    return {
      data: await client.projects.create(
        workspace,
        namedData(input.options, ["name", "identifier", "description"]),
      ),
      meta: {},
    };
  const project = await resolveProject(client, workspace, reference!);
  if (action === "get")
    return { data: await client.projects.retrieve(workspace, project.id), meta: {} };
  if (action === "delete")
    return destructive(
      () => client.projects.delete(workspace, project.id),
      project,
      input,
      () => verifyAbsent(() => client.projects.retrieve(workspace, project.id)),
    );
  if (action === "archive")
    return mutation(
      client.projects.archive(workspace, project.id),
      project,
      () => client.projects.retrieve(workspace, project.id),
    );
  if (action === "unarchive")
    return mutation(
      client.projects.unArchive(workspace, project.id),
      project,
      () => client.projects.retrieve(workspace, project.id),
    );
  if (action === "update")
    return {
      data: await client.projects.update(
        workspace,
        project.id,
        mutationData(input.options, ["name", "identifier", "description"]),
      ),
      meta: {},
    };
  throw new CliError("usage", `Unsupported project action: ${action}`);
}

async function featureOperation(
  action: string,
  input: OperationInput,
  client: any,
  workspace: string,
): Promise<any> {
  const project = await resolveProject(client, workspace, requireProject(input.config));
  if (action === "get")
    return { data: await client.projects.retrieveFeatures(workspace, project.id), meta: {} };
  if (action === "update")
    return {
      data: await client.projects.updateFeatures(
        workspace,
        project.id,
        mutationData(input.options),
      ),
      meta: {},
    };
  throw new CliError("usage", `Unsupported project-feature action: ${action}`);
}

async function workItemOperation(
  action: string,
  reference: string | undefined,
  input: OperationInput,
  client: any,
  workspace: string,
  projectRef: string | undefined,
  listOptions: { all: boolean; limit?: number; cursor?: string },
): Promise<any> {
  if (action === "list") {
    const projectId = projectRef
      ? (await resolveProject(client, workspace, projectRef)).id
      : undefined;
    return paged(
      (cursor, limit) =>
        projectId
          ? client.workItems.list(workspace, projectId, {
              ...listParams(input.options),
              cursor,
              per_page: limit,
            })
          : client.workItems.listWorkspace(workspace, {
              ...listParams(input.options),
              cursor,
              per_page: limit,
            }),
      listOptions,
    );
  }
  if (action === "search") {
    const query = input.options.query;
    if (!query) throw new CliError("usage", "Search requires --query <text>.");
    const projectId = projectRef
      ? (await resolveProject(client, workspace, projectRef)).id
      : undefined;
    const result = await client.workItems.search(workspace, query, projectId, {
      limit: toNumber(input.options.limit),
    });
    return { data: result.issues ?? result.results ?? result, meta: {} };
  }
  if (action === "create") {
    const project = await resolveProject(client, workspace, requireProject(input.config));
    const data = mutationData(input.options, [
      "name",
      "description",
      "state",
      "priority",
      "assignees",
      "labels",
      "type",
      "module",
      "targetDate",
      "startDate",
    ]);
    if (!data.name) throw new CliError("validation", "Work item name is required.");
    return {
      data: await client.workItems.create(
        workspace,
        project.id,
        await resolveWorkItemFields(client, workspace, project.id, normalizeWorkItemData(data)),
      ),
      meta: {},
    };
  }
  if (!reference) throw new CliError("usage", "A work-item reference is required.");
  const item = await resolveWorkItem(client, workspace, projectRef, reference);
  const projectId =
    item.project ?? (await resolveProject(client, workspace, requireProject(input.config))).id;
  if (action === "get")
    return { data: await client.workItems.retrieve(workspace, projectId, item.id), meta: {} };
  if (action === "delete")
    return destructive(
      () => client.workItems.delete(workspace, projectId, item.id),
      item,
      input,
      () => verifyAbsent(() => client.workItems.retrieve(workspace, projectId, item.id)),
    );
  if (action === "archive")
    return mutation(
      client.workItems.archive(workspace, projectId, item.id),
      item,
      () => client.workItems.retrieve(workspace, projectId, item.id),
    );
  if (action === "unarchive")
    return mutation(
      client.workItems.unarchive(workspace, projectId, item.id),
      item,
      () => client.workItems.retrieve(workspace, projectId, item.id),
    );
  if (action === "update")
    return {
      data: await client.workItems.update(
        workspace,
        projectId,
        item.id,
        await resolveWorkItemFields(
          client,
          workspace,
          projectId,
          normalizeWorkItemData(
            mutationData(input.options, [
              "name",
              "description",
              "state",
              "priority",
              "assignees",
              "labels",
              "type",
              "module",
              "targetDate",
              "startDate",
            ]),
          ),
        ),
      ),
      meta: {},
    };
  throw new CliError("usage", `Unsupported work-item action: ${action}`);
}

async function simpleProjectResource(
  resource: string,
  action: string,
  reference: string | undefined,
  input: OperationInput,
  client: any,
  workspace: string,
  projectRef: string | undefined,
  listOptions: { all: boolean; limit?: number; cursor?: string },
): Promise<any> {
  const project = await resolveProject(
    client,
    workspace,
    requireProject({ ...input.config, project: projectRef }),
  );
  const api = resource === "state" ? client.states : client.labels;
  if (action === "list")
    return paged(
      (cursor, limit) =>
        api.list(workspace, project.id, { ...listParams(input.options), cursor, limit }),
      listOptions,
    );
  if (action === "create")
    return {
      data: await api.create(
        workspace,
        project.id,
        mutationData(
          input.options,
          resource === "state"
            ? ["name", "description", "color", "group"]
            : ["name", "description", "color"],
        ),
      ),
      meta: {},
    };
  if (!reference) throw new CliError("usage", `A ${resource} reference is required.`);
  const current = await resolveNamed(
    (cursor, limit) => api.list(workspace, project.id, { cursor, limit: limit ?? 100 }),
    reference,
    resource === "state" ? "State" : "Label",
  );
  if (action === "get")
    return { data: await api.retrieve(workspace, project.id, current.id), meta: {} };
  if (action === "update")
    return {
      data: await api.update(
        workspace,
        project.id,
        current.id,
        mutationData(input.options, ["name", "description", "color", "group"]),
      ),
      meta: {},
    };
  if (action === "delete")
    return destructive(
      () => api.delete(workspace, project.id, current.id),
      current,
      input,
      () => verifyAbsent(() => api.retrieve(workspace, project.id, current.id)),
    );
  throw new CliError("usage", `Unsupported ${resource} action: ${action}`);
}

async function commentOperation(
  action: string,
  reference: string | undefined,
  input: OperationInput,
  client: any,
  workspace: string,
  projectRef: string | undefined,
  listOptions: { all: boolean; limit?: number; cursor?: string },
): Promise<any> {
  const item = await resolveWorkItem(client, workspace, projectRef, reference ?? "");
  const projectId =
    item.project ?? (await resolveProject(client, workspace, requireProject(input.config))).id;
  const api = client.workItems.comments;
  if (action === "list")
    return paged(
      (cursor, limit) => api.list(workspace, projectId, item.id, { cursor, per_page: limit }),
      listOptions,
    );
  if (action === "create")
    return {
      data: await api.create(
        workspace,
        projectId,
        item.id,
        normalizeCommentData(mutationData(input.options, ["content", "comment"])),
      ),
      meta: {},
    };
  const commentId = input.options.commentId;
  if (!commentId) throw new CliError("usage", "Comment mutation requires --comment-id <id>.");
  if (action === "get")
    return { data: await api.retrieve(workspace, projectId, item.id, commentId), meta: {} };
  if (action === "update")
    return {
      data: await api.update(
        workspace,
        projectId,
        item.id,
        commentId,
        normalizeCommentData(mutationData(input.options, ["content", "comment"])),
      ),
      meta: {},
    };
  if (action === "delete")
    return destructive(
      () => api.delete(workspace, projectId, item.id, commentId),
      { id: commentId },
      input,
      () => verifyAbsent(() => api.retrieve(workspace, projectId, item.id, commentId)),
    );
  throw new CliError("usage", `Unsupported comment action: ${action}`);
}

async function relationOperation(
  action: string,
  reference: string | undefined,
  input: OperationInput,
  client: any,
  workspace: string,
  projectRef: string | undefined,
): Promise<any> {
  const item = await resolveWorkItem(client, workspace, projectRef, reference ?? "");
  const projectId =
    item.project ?? (await resolveProject(client, workspace, requireProject(input.config))).id;
  const api = client.workItems.relations;
  if (action === "list") return { data: await api.list(workspace, projectId, item.id), meta: {} };
  const related = await resolveWorkItem(client, workspace, projectRef, input.options.related);
  const payload = { relation_type: input.options.type, issues: [related.id] };
  if (!input.options.type)
    throw new CliError("validation", "Relation type is required: --type <type>.");
  if (action === "add")
    return mutation(api.create(workspace, projectId, item.id, payload), {
      source: item.id,
      target: related.id,
      relationType: input.options.type,
    }, async () => {
      const relations = await api.list(workspace, projectId, item.id);
      verifyCollectionContains(relations, related.id, "Relation add");
    });
  if (action === "remove")
    return destructive(
      () => api.delete(workspace, projectId, item.id, { related_issue: related.id }),
      { source: item.id, target: related.id },
      input,
      async () => {
        const relations = await api.list(workspace, projectId, item.id);
        verifyCollectionMissing(relations, related.id, "Relation removal");
      },
    );
  throw new CliError("usage", `Unsupported relation action: ${action}`);
}

async function containerOperation(
  resource: "cycle" | "module",
  action: string,
  reference: string | undefined,
  input: OperationInput,
  client: any,
  workspace: string,
  projectRef: string | undefined,
  listOptions: { all: boolean; limit?: number; cursor?: string },
): Promise<any> {
  const project = await resolveProject(
    client,
    workspace,
    requireProject({ ...input.config, project: projectRef }),
  );
  const api = resource === "cycle" ? client.cycles : client.modules;
  if (action === "list")
    return paged(
      (cursor, limit) =>
        api.listLite
          ? api.listLite(workspace, project.id, { cursor, per_page: limit })
          : api.list(workspace, project.id, { cursor, limit }),
      listOptions,
    );
  if (action === "create") {
    const fields =
      resource === "cycle"
        ? ["name", "description", "startDate", "endDate", "ownedBy", "timezone"]
        : ["name", "description", "startDate", "targetDate", "status", "lead", "members"];
    const data = mutationData(input.options, fields);
    if (resource === "cycle")
      Object.assign(data, {
        project_id: project.id,
        owned_by: data.ownedBy ?? input.options.ownedBy,
      });
    return { data: await api.create(workspace, project.id, normalizeKeys(data)), meta: {} };
  }
  if (!reference) throw new CliError("usage", `A ${resource} reference is required.`);
  const current = await resolveNamed(
    (cursor, limit) =>
      api.listLite
        ? api.listLite(workspace, project.id, { cursor, per_page: limit ?? 100 })
        : api.list(workspace, project.id, { cursor, limit: limit ?? 100 }),
    reference,
    resource[0].toUpperCase() + resource.slice(1),
  );
  if (action === "get")
    return { data: await api.retrieve(workspace, project.id, current.id), meta: {} };
  if (action === "update")
    return {
      data: await api.update(
        workspace,
        project.id,
        current.id,
        normalizeKeys(
          mutationData(input.options, [
            "name",
            "description",
            "startDate",
            "endDate",
            "targetDate",
            "status",
            "lead",
            "members",
          ]),
        ),
      ),
      meta: {},
    };
  if (action === "delete")
    return destructive(
      () => api.delete(workspace, project.id, current.id),
      current,
      input,
      () => verifyAbsent(() => api.retrieve(workspace, project.id, current.id)),
    );
  if (action === "archive" || action === "unarchive")
    return mutation(
      api[
        action === "archive"
          ? resource === "cycle"
            ? "archive"
            : "archiveModule"
          : resource === "cycle"
            ? "unArchive"
            : "unArchiveModule"
      ](workspace, project.id, current.id),
      current,
      () => api.retrieve(workspace, project.id, current.id),
    );
  if (action === "list-items")
    return paged(
      (cursor, limit) =>
        api[resource === "cycle" ? "listWorkItemsInCycle" : "listWorkItemsInModule"](
          workspace,
          project.id,
          current.id,
          { cursor, per_page: limit },
        ),
      listOptions,
    );
  if (resource === "cycle" && action === "transfer-items") {
    if (!input.options.newCycle)
      throw new CliError("validation", "Transfer requires --new-cycle <id>.");
    return mutation(
      api.transferWorkItemsToAnotherCycle(workspace, project.id, current.id, {
        new_cycle_id: input.options.newCycle,
      }),
      { cycle: current.id, newCycle: input.options.newCycle },
      () => verifyContainerEmpty(api, "cycle", workspace, project.id, current.id as string),
    );
  }
  const item = await resolveWorkItem(client, workspace, project.id, input.options.workItem);
  if (action === "add-items")
    return mutation(
      api[resource === "cycle" ? "addWorkItemsToCycle" : "addWorkItemsToModule"](
        workspace,
        project.id,
        current.id,
        [item.id],
      ),
      { container: current.id, workItem: item.id },
      () =>
        verifyContainerMembership(
          api,
          resource,
          workspace,
          project.id,
          current.id as string,
          item.id as string,
          true,
        ),
    );
  if (action === "remove-item")
    return destructive(
      () =>
        api[resource === "cycle" ? "removeWorkItemFromCycle" : "removeWorkItemFromModule"](
          workspace,
          project.id,
          current.id,
          item.id,
        ),
      { container: current.id, workItem: item.id },
      input,
      () =>
        verifyContainerMembership(
          api,
          resource,
          workspace,
          project.id,
          current.id as string,
          item.id as string,
          false,
        ),
    );
  throw new CliError("usage", `Unsupported ${resource} action: ${action}`);
}

async function paged(
  fetchPage: (cursor?: string, limit?: number) => Promise<any>,
  options: { all: boolean; limit?: number; cursor?: string },
): Promise<any> {
  const page = await collectPages(fetchPage, options);
  return { data: page.results, meta: page.meta };
}

async function mutation(
  promise: Promise<unknown>,
  fallback: unknown,
  verify?: () => Promise<unknown>,
): Promise<any> {
  await promise;
  const verified = await verify?.();
  return { data: verified === undefined ? fallback : verified, meta: {} };
}

async function destructive(
  promise: () => Promise<unknown>,
  target: unknown,
  input: OperationInput,
  verify?: () => Promise<unknown>,
): Promise<any> {
  if (!input.options.yes) {
    if (input.options.noInput || !process.stdin.isTTY)
      throw new CliError(
        "usage",
        "Destructive operations require --yes when input is unavailable.",
      );
    throw new CliError("usage", "Confirmation is required. Re-run with --yes.");
  }
  await promise();
  await verify?.();
  return { data: { deleted: true, target, verified: Boolean(verify) }, meta: {} };
}

async function verifyAbsent(read: () => Promise<unknown>): Promise<void> {
  try {
    await read();
  } catch (error) {
    if (asCliError(error).code === "not_found") return;
    throw error;
  }
  throw new CliError("conflict", "Mutation completed but deletion could not be verified.");
}

async function verifyContainerMembership(
  api: any,
  resource: "cycle" | "module",
  workspace: string,
  projectId: string,
  containerId: string,
  workItemId: string,
  expected: boolean,
): Promise<void> {
  const page = await collectPages<Record<string, unknown>>(
    (cursor, limit) =>
      api[resource === "cycle" ? "listWorkItemsInCycle" : "listWorkItemsInModule"](
        workspace,
        projectId,
        containerId,
        { cursor, per_page: limit ?? 100 },
      ),
    { all: true },
  );
  const found = page.results.some((item) => referencesId(item, workItemId));
  if (found !== expected)
    throw new CliError(
      "conflict",
      `${resource} membership mutation could not be verified.`,
    );
}

async function verifyContainerEmpty(
  api: any,
  resource: "cycle" | "module",
  workspace: string,
  projectId: string,
  containerId: string,
): Promise<void> {
  const page = await collectPages(
    (cursor, limit) =>
      api.listWorkItemsInCycle(workspace, projectId, containerId, {
        cursor,
        per_page: limit ?? 100,
      }),
    { all: true },
  );
  if (page.results.length > 0)
    throw new CliError("conflict", `${resource} transfer could not be verified.`);
}

function verifyCollectionContains(value: unknown, id: string, operation: string): void {
  if (!collectionHasId(value, id))
    throw new CliError("conflict", `${operation} could not be verified.`);
}

function verifyCollectionMissing(value: unknown, id: string, operation: string): void {
  if (collectionHasId(value, id))
    throw new CliError("conflict", `${operation} could not be verified.`);
}

function collectionHasId(value: unknown, id: string): boolean {
  return collectionReferences(value).some((item) =>
    typeof item === "string" ? item === id : isRecord(item) && referencesId(item, id),
  );
}

function collectionReferences(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (isRecord(value) && Array.isArray(value.results)) return value.results;
  if (isRecord(value)) return Object.values(value).flatMap((item) => (Array.isArray(item) ? item : []));
  return [];
}

function referencesId(value: Record<string, unknown>, id: string): boolean {
  return [
    value.id,
    value.issue_id,
    value.related_issue,
    value.related_issue_id,
    value.work_item_id,
    value.target,
    value.target_id,
  ].includes(id);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function listParams(options: Record<string, any>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries({
      state: options.state,
      assignee: options.assignee,
      pql: options.pql,
      order_by: options.orderBy,
      fields: options.fields,
      expand: options.expand,
      per_page: toNumber(options.limit),
      cursor: options.cursor,
    }).filter(([, value]) => value !== undefined),
  );
}

function mutationData(options: Record<string, any>, fields: string[] = []): Record<string, any> {
  if (options.data !== undefined && fields.some((field) => options[field] !== undefined))
    throw new CliError("usage", "Named mutation options cannot be combined with --data.");
  return options.data !== undefined ? parseDataValue(options.data) : namedData(options, fields);
}

function namedData(options: Record<string, any>, fields: string[]): Record<string, any> {
  return Object.fromEntries(
    fields
      .map((field) => [field, options[field]])
      .filter(([, value]) => value !== undefined)
      .map(([field, value]) => [
        field,
        ["assignees", "labels", "members"].includes(field) && typeof value === "string"
          ? value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : value,
      ]),
  );
}

function parseDataValue(value: string): Record<string, any> {
  return parseData(value);
}

function normalizeWorkItemData(data: Record<string, any>): Record<string, any> {
  const normalized = normalizeKeys(data);
  if (normalized.description !== undefined) {
    normalized.description_html = normalized.description;
    delete normalized.description;
  }
  return normalized;
}

function normalizeCommentData(data: Record<string, any>): Record<string, any> {
  const normalized = { ...data };
  const value = normalized.content ?? normalized.comment;
  if (value !== undefined) {
    normalized.comment_html = value;
    delete normalized.content;
    delete normalized.comment;
  }
  return normalized;
}

async function resolveWorkItemFields(
  client: any,
  workspace: string,
  projectId: string,
  data: Record<string, any>,
): Promise<Record<string, any>> {
  const resolved = { ...data };
  if (typeof resolved.state === "string")
    resolved.state = (
      await resolveNamed(
        (cursor, limit) =>
          client.states.list(workspace, projectId, { cursor, limit: limit ?? 100 }),
        resolved.state,
        "State",
      )
    ).id;
  if (Array.isArray(resolved.labels)) {
    const page = await client.labels.list(workspace, projectId, { limit: 100 });
    resolved.labels = resolved.labels.map(
      (reference: string) => pickUnique(reference, page.results ?? [], "Label").id,
    );
  }
  if (typeof resolved.module === "string")
    resolved.module = (
      await resolveNamed(
        (cursor, limit) =>
          client.modules.listLite
            ? client.modules.listLite(workspace, projectId, { cursor, per_page: limit ?? 100 })
            : client.modules.list(workspace, projectId, { cursor, limit: limit ?? 100 }),
        resolved.module,
        "Module",
      )
    ).id;
  if (Array.isArray(resolved.assignees)) {
    const members = await client.projects.getMembers(workspace, projectId);
    const me = resolved.assignees.includes("me") ? (await client.users.me()).id : undefined;
    resolved.assignees = resolved.assignees.map((reference: string) =>
      reference === "me" ? me : pickUnique(reference, members, "Member").id,
    );
  }
  return resolved;
}

function normalizeKeys(data: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
      value,
    ]),
  );
}

function toNumber(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1)
    throw new CliError("validation", "Limit must be a positive integer.");
  return number;
}
