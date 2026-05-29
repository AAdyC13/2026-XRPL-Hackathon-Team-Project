type ApiRequestOptions = RequestInit & {
  token?: string | null;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

function buildUrl(path: string) {
  if (!API_BASE) return path;
  return `${API_BASE}${path}`;
}

export async function apiFetch<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  const response = await fetch(buildUrl(path), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options?.headers
    }
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      (typeof body?.message === "string" && body.message) ||
      body?.error?.message ||
      "API request failed.";
    throw new Error(message);
  }

  return body as T;
}

export function apiPost<T>(path: string, payload: unknown, options?: Omit<ApiRequestOptions, "method" | "body">) {
  return apiFetch<T>(path, {
    ...options,
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function apiDelete<T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) {
  return apiFetch<T>(path, { ...options, method: "DELETE" });
}
