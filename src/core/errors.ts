export type ErrorCode =
  | "usage"
  | "authentication"
  | "authorization"
  | "not_found"
  | "ambiguous_reference"
  | "validation"
  | "conflict"
  | "rate_limited"
  | "network"
  | "server";

export const OUTPUT_SCHEMA_VERSION = 1;
const ansiPattern = new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, "g");

const exitCodes: Record<ErrorCode, number> = {
  usage: 2,
  validation: 2,
  authentication: 3,
  authorization: 3,
  not_found: 4,
  ambiguous_reference: 4,
  conflict: 5,
  rate_limited: 6,
  network: 7,
  server: 1,
};

export class CliError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status?: number,
    public readonly hint?: string,
    public readonly details?: unknown,
    public readonly requestId?: string,
  ) {
    super(String(redact(message)));
    this.name = "CliError";
  }

  get exitCode(): number {
    return exitCodes[this.code];
  }

  envelope(): Record<string, unknown> {
    return {
      schemaVersion: OUTPUT_SCHEMA_VERSION,
      error: {
        code: this.code,
        message: redact(this.message),
        ...(this.status === undefined ? {} : { status: this.status }),
        ...(this.hint ? { hint: this.hint } : {}),
        ...(this.details === undefined ? {} : { details: redact(this.details) }),
        ...(this.requestId ? { requestId: this.requestId } : {}),
      },
    };
  }
}

export function asCliError(error: unknown): CliError {
  if (error instanceof CliError) return error;
  const value = error as {
    statusCode?: number;
    response?: unknown;
    code?: string;
    message?: string;
  };
  const status = value?.statusCode;
  const response = isRecord(value?.response) ? value.response : {};
  const message = typeof value?.message === "string" ? value.message : "Request failed.";
  const requestId = stringValue(response.request_id ?? response.requestId);
  const details = response.details ?? response.errors;

  if (status === 401)
    return new CliError(
      "authentication",
      "Plane rejected the supplied credentials.",
      status,
      "Set PLANE_API_KEY or PLANE_ACCESS_TOKEN.",
      undefined,
      requestId,
    );
  if (status === 403)
    return new CliError(
      "authorization",
      "Plane denied this operation.",
      status,
      "Check the token's workspace and project permissions.",
      undefined,
      requestId,
    );
  if (status === 404)
    return new CliError(
      "not_found",
      message,
      status,
      "Check the workspace, project, and resource reference.",
      details,
      requestId,
    );
  if (status === 409)
    return new CliError("conflict", message, status, undefined, details, requestId);
  if (status === 429)
    return new CliError(
      "rate_limited",
      "Plane rate-limited the request.",
      status,
      "Retry after the server reset time.",
      details,
      requestId,
    );
  if (status && status >= 400 && status < 500)
    return new CliError("validation", message, status, undefined, details, requestId);
  if (error instanceof TypeError || /fetch|network|timeout|socket/i.test(message))
    return new CliError(
      "network",
      "Could not reach Plane.",
      status,
      "Check the base URL and network connection.",
      undefined,
      requestId,
    );
  return new CliError("server", String(redact(message)), status, undefined, details, requestId);
}

export function redact(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .replace(ansiPattern, "")
      .replace(/Bearer\s+[^\s]+/gi, "Bearer [REDACTED]")
      .replace(
        /(api[-_ ]?key|access[-_ ]?token|authorization|password|secret)\s*[:=]\s*[^,\s}]+/gi,
        "$1=[REDACTED]",
      );
  }
  if (Array.isArray(value)) return value.map(redact);
  if (isRecord(value))
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        isSecretKey(key) ? key : key,
        isSecretKey(key) ? "[REDACTED]" : redact(item),
      ]),
    );
  return value;
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null;
}

function isSecretKey(key: string): boolean {
  return /token|secret|password|authorization|api[-_ ]?key/i.test(key);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
