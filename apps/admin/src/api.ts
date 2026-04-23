import type { Dataset } from '@govtrack/shared-types';

export type FeedHealth = {
  dataset_id: string;
  slug: string;
  last_checked: string;
  status: 'healthy' | 'degraded' | 'down';
  latency_ms: number;
  error_message?: string | null;
};

export type DatasetsPage = {
  data: Dataset[];
  page: number;
  page_size: number;
  total: number;
};

export type ReseedResponse = {
  status: string;
  datasets: number;
  records: number;
};

export const ADMIN_TOKEN_STORAGE_KEY = 'govtrack:adminToken';

export function getApiUrl(): string {
  const fromEnv = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
  return fromEnv.replace(/\/$/, '') || 'http://localhost:8080';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiUrl()}${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${text || path}`);
  }
  return (await res.json()) as T;
}

export function fetchFeedHealth(): Promise<FeedHealth[]> {
  return request<FeedHealth[]>('/api/v1/feeds/health');
}

export function fetchDatasets(params: {
  category?: string;
  page?: number;
  pageSize?: number;
}): Promise<DatasetsPage> {
  const qs = new URLSearchParams();
  qs.set('page', String(params.page ?? 1));
  qs.set('page_size', String(params.pageSize ?? 50));
  if (params.category) qs.set('category', params.category);
  return request<DatasetsPage>(`/api/v1/datasets?${qs.toString()}`);
}

export function fetchCategories(): Promise<{ category: string; count: number }[]> {
  return request<{ category: string; count: number }[]>('/api/v1/categories');
}

export async function triggerReseed(token: string): Promise<ReseedResponse> {
  const res = await fetch(`${getApiUrl()}/api/v1/admin/reseed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': token,
    },
  });
  if (res.status === 401) {
    throw new Error('Unauthorized: invalid admin token');
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Reseed failed: ${res.status} ${text}`);
  }
  return (await res.json()) as ReseedResponse;
}

export function getStoredAdminToken(): string | null {
  try {
    return localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredAdminToken(token: string): void {
  try {
    localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
  } catch {
    // ignored
  }
}

export function clearStoredAdminToken(): void {
  try {
    localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  } catch {
    // ignored
  }
}
