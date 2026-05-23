export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers
    },
    ...options
  });

  const body = await response.json();

  if (!response.ok || !body.ok) {
    throw new Error(body?.error?.message ?? "API request failed.");
  }

  return body.data as T;
}

export function postJson<T>(path: string, payload: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
