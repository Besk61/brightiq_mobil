const BASE_API_URL = import.meta.env.VITE_API_BASE_URL ?? "https://api.arvonas.com";
const BASE_CDN_URL = import.meta.env.VITE_CDN_URL ?? "https://cdn.arvonas.com";
const MAX_IMAGE_CACHE_ITEMS = 150;
const imageBlobCache = new Map<string, string>();
const imageFetchCache = new Map<string, Promise<string | null>>();

export interface ApiError {
  message: string;
  status?: number;
}

export function resolveImageUrl(imagePath?: string | null) {
  if (!imagePath) return undefined;

  const trimmed = imagePath.trim();
  if (!trimmed) return undefined;

  // Already a full URL (data URI, http, https)
  if (/^data:/i.test(trimmed) || /^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  // CDN uses /download?path=<GCS_path> endpoint
  // Strip any leading slash or /api prefix before encoding
  let gcsPath = trimmed;
  if (gcsPath.startsWith("/api/")) {
    gcsPath = gcsPath.replace(/^\/api/, "");
  }
  if (gcsPath.startsWith("/")) {
    gcsPath = gcsPath.slice(1);
  }

  return `${BASE_CDN_URL}/download?path=${encodeURIComponent(gcsPath)}`;
}

async function fetchJson<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${BASE_API_URL}${path}`, init);
  const payload = await response.json().catch(() => ({} as any));

  if (!response.ok) {
    const errorMessage = payload.error || payload.message || response.statusText || "Bir hata oluştu.";
    const error: ApiError = { message: errorMessage, status: response.status };
    throw error;
  }

  return payload.data as T;
}

export async function apiPost<T>(path: string, body: unknown, token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["x-access-token"] = token;
  }

  return fetchJson<T>(path, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

export async function apiGet<T>(path: string, token?: string) {
  const headers: Record<string, string> = {};

  if (token) {
    headers["x-access-token"] = token;
  }

  return fetchJson<T>(path, {
    method: "GET",
    headers,
  });
}

/**
 * Fetches an image from the CDN (which requires authentication) and returns
 * a local blob URL suitable for use in <img> src attributes.
 * Returns null if the URL is empty or the fetch fails.
 */
export async function fetchImageAsBlob(url: string, token?: string): Promise<string | null> {
  if (!url) return null;

  // If it's already a data URI, return as-is
  if (url.startsWith("data:")) return url;

  const cacheKey = `${token ?? "public"}::${url}`;
  const cached = imageBlobCache.get(cacheKey);
  if (cached) {
    imageBlobCache.delete(cacheKey);
    imageBlobCache.set(cacheKey, cached);
    return cached;
  }

  const inFlight = imageFetchCache.get(cacheKey);
  if (inFlight) return inFlight;

  const request = (async () => {
    const headers: Record<string, string> = {};
    if (token && url.includes("download?path=")) {
      headers["x-access-token"] = token;
    }
    const response = await fetch(url, { headers });
    if (!response.ok) return null;
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    imageBlobCache.set(cacheKey, objectUrl);

    while (imageBlobCache.size > MAX_IMAGE_CACHE_ITEMS) {
      const oldestKey = imageBlobCache.keys().next().value;
      if (!oldestKey) break;
      const oldestUrl = imageBlobCache.get(oldestKey);
      imageBlobCache.delete(oldestKey);
      if (oldestUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(oldestUrl);
      }
    }

    return objectUrl;
  })().catch(() => null).finally(() => {
    imageFetchCache.delete(cacheKey);
  });

  imageFetchCache.set(cacheKey, request);
  return request;
}
