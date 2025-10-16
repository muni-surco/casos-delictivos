import type { CrimeCase, CreateCaseInput, UpdateCaseInput, CaseMedia } from "@shared/api";

export async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  // timeout helper
  const timeoutMs = 10000;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, ...init } as RequestInit);
    clearTimeout(id);
    if (!res.ok) {
      const text = await res.text().catch(() => String(res.status));
      throw new Error(`Request failed ${res.status} ${res.statusText}: ${text}`);
    }
    // Safe JSON parse
    const text = await res.text();
    try {
      return JSON.parse(text) as T;
    } catch (e) {
      // if empty body, return nullish
      if (!text) return (null as unknown) as T;
      throw new Error(`Invalid JSON response from ${url}`);
    }
  } catch (err: any) {
    if (err && err.name === 'AbortError') {
      throw new Error(`Network request to ${url} timed out after ${timeoutMs}ms`);
    }
    // Network errors or CORS issues will be caught here
    throw new Error(`Network request to ${url} failed: ${err?.message ?? String(err)}`);
  }
}

function resolveApiPaths(path: string) {
  // Try common locations where the API might be hosted
  const paths = [
    path, // relative /api/...
    `/.netlify/functions/api${path.replace(/^\/api/, '')}`, // netlify functions
    `${window.location.origin}${path}`, // absolute same origin
  ];
  return paths;
}

async function tryFetchPaths<T>(path: string, init?: RequestInit): Promise<T> {
  const candidates = resolveApiPaths(path);
  let lastError: any = null;
  for (const p of candidates) {
    try {
      return await fetchJSON<T>(p, init);
    } catch (e) {
      lastError = e;
      // continue to next candidate
    }
  }
  throw lastError;
}

export const CasesAPI = {
  list: async () => {
    try {
      return await tryFetchPaths<CrimeCase[]>('/api/cases');
    } catch (e) {
      // Log at debug level to avoid noisy console errors in production
      console.debug('Failed to fetch cases', e);
      return [] as CrimeCase[];
    }
  },
  get: (id: string) => tryFetchPaths<CrimeCase>(`/api/cases/${id}`),
  create: (input: CreateCaseInput) =>
    tryFetchPaths<CrimeCase>('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateCaseInput) =>
    tryFetchPaths<CrimeCase>(`/api/cases/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),
  remove: (id: string) => tryFetchPaths<{ success: boolean }>(`/api/cases/${id}`, { method: 'DELETE' }),
  uploadMedia: (id: string, files: { images?: File[]; videos?: File[] }) => {
    const fd = new FormData();
    files.images?.forEach((f) => fd.append('images', f));
    files.videos?.forEach((f) => fd.append('videos', f));
    return tryFetchPaths<{ added: CaseMedia[]; case: CrimeCase }>(`/api/cases/${id}/media`, {
      method: 'POST',
      body: fd,
    });
  },
  deleteMedia: (id: string, mediaId: string) =>
    tryFetchPaths<{ success: boolean; case: CrimeCase }>(`/api/cases/${id}/media/${mediaId}`, { method: 'DELETE' }),
};
