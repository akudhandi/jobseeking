export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(public status: number, public path: string) {
    super(`API ${status} for ${path}`);
    this.name = "ApiError";
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new ApiError(res.status, path);
  return (await res.json()) as T;
}

export async function safeGet<T>(path: string, fallback: T): Promise<T> {
  try {
    return await apiGet<T>(path);
  } catch {
    return fallback;
  }
}

export function buildQuery(params: Record<string, string | number | boolean | string[] | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      value.forEach((v) => search.append(key, String(v)));
    } else {
      search.append(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
