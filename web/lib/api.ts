export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

// Server components fetch the API over the internal docker network (avoids an
// internet round-trip); the browser uses the public base (same-origin /api).
const SERVER_BASE = process.env.API_INTERNAL_BASE ?? API_BASE;

function baseForRequest() {
  return typeof window === "undefined" ? SERVER_BASE : API_BASE;
}

export class ApiError extends Error {
  constructor(public status: number, public path: string) {
    super(`API ${status} for ${path}`);
    this.name = "ApiError";
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${baseForRequest()}${path}`, { cache: "no-store" });
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
