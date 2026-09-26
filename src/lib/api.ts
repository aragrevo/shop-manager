export interface ApiFieldIssue {
  path: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly issues: ApiFieldIssue[];

  constructor(
    message: string,
    status: number,
    code = "error",
    issues: ApiFieldIssue[] = [],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.issues = issues;
  }
}

let activeStoreId: string | null = null;

export function setActiveStoreId(storeId: string | null): void {
  activeStoreId = storeId;
}

export function getActiveStoreId(): string | null {
  return activeStoreId;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (activeStoreId) headers["x-store-id"] = activeStoreId;

  const response = await fetch(`/api${path}`, {
    method: options.method ?? "GET",
    headers,
    credentials: "include",
    signal: options.signal,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const payload = (data ?? {}) as {
      error?: string;
      code?: string;
      issues?: ApiFieldIssue[];
    };
    throw new ApiError(
      payload.error ?? "Error de red",
      response.status,
      payload.code ?? "error",
      payload.issues ?? [],
    );
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) =>
    request<T>(path, { method: "GET", signal }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body }),
  del: <T>(path: string, query?: string) =>
    request<T>(`${path}${query ? `?${query}` : ""}`, { method: "DELETE" }),
};

export function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  return search.toString();
}

/** Triggers a browser download from a CSV endpoint. */
export async function downloadCsv(path: string, filename: string): Promise<void> {
  const headers: Record<string, string> = {};
  if (activeStoreId) headers["x-store-id"] = activeStoreId;
  const response = await fetch(`/api${path}`, { headers, credentials: "include" });
  if (!response.ok) throw new ApiError("No se pudo exportar", response.status);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
