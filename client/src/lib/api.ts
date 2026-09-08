/**
 * Thin fetch wrapper: attaches the session token, unwraps JSON, and turns
 * non-2xx responses into a typed ApiError the UI can render.
 */
const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";
const TOKEN_KEY = "nova.token";

export class ApiError extends Error {
  status: number;
  details?: { path: string; message: string }[];

  constructor(status: number, message: string, details?: { path: string; message: string }[]) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

type Options = Omit<RequestInit, "body"> & { body?: unknown };

async function request<T>(path: string, { body, headers, ...options }: Options = {}): Promise<T> {
  const token = tokenStore.get();

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) return undefined as T;

  // A misconfigured VITE_API_URL points the client at its own origin, where the
  // host's SPA fallback answers with HTML and a 200. Say so, rather than letting
  // an empty object flow through as if the request had succeeded.
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ApiError(
      response.status,
      `Expected JSON from ${BASE_URL}${path} but received "${contentType || "no content type"}". ` +
        `Check that the API base URL is correct${BASE_URL === "/api" ? " (VITE_API_URL is not set)" : ""}.`,
    );
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    // An expired or tampered token should drop the session rather than loop on 401s.
    if (response.status === 401 && tokenStore.get()) {
      tokenStore.clear();
      if (!location.pathname.startsWith("/login")) location.assign("/login");
    }
    throw new ApiError(
      response.status,
      payload.error ?? `Request failed with status ${response.status}`,
      payload.details,
    );
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

/** Turns any thrown value into a message safe to show in a toast. */
export function errorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (error instanceof ApiError) {
    if (error.details?.length) return error.details.map((d) => d.message).join(", ");
    return error.message;
  }
  return error instanceof Error ? error.message : fallback;
}
