/**
 * Shared HTTP layer for NIGHTFIELD.
 * - One place for the API base URL / mock flag
 * - Bearer-token injection (JWT issued by the FastAPI backend)
 * - Backend error format ({ error, detail }) -> ApiRequestError with a readable message
 */

// Mock mode is OPT-IN (VITE_USE_MOCK=true). Anything else talks to the real backend.
export const USE_MOCK = String(import.meta.env.VITE_USE_MOCK ?? "false").replace(/"/g, "").toLowerCase() === "true";
export const API_URL = ((import.meta.env.VITE_API_URL as string) || "http://localhost:8000").replace(/\/$/, "");
export const WS_URL = API_URL.replace(/^http/i, "ws");

export const TOKEN_KEY = "nightfield_token";
export const UNAUTHORIZED_EVENT = "nightfield:unauthorized";

export class ApiRequestError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code = "error") {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/** Turn a failed Response into an ApiRequestError using the backend's JSON error body. */
export async function toError(res: Response): Promise<ApiRequestError> {
  let detail = `Request failed (${res.status})`;
  let code = "error";
  try {
    const body = await res.json();
    if (body?.detail) detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    if (body?.error) code = body.error;
  } catch {
    /* non-JSON error body */
  }
  if (res.status === 401 && getToken()) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT)); // expired / invalid token -> force sign-out
  }
  return new ApiRequestError(detail, res.status, code);
}

export async function request<T>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean; signal?: AbortSignal } = {}
): Promise<T> {
  const { method = "GET", body, auth = false, signal } = opts;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(auth ? authHeaders() : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiRequestError(`Cannot reach the backend at ${API_URL}. Is it running?`, 0, "network_error");
  }
  if (!res.ok) throw await toError(res);
  return (await res.json()) as T;
}
