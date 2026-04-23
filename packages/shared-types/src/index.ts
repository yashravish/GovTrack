export type Dataset = {
  id: string;
  slug: string;
  category: string;
  title: string;
  description: string;
  source_url: string;
  source_type: 'fixture' | 'live';
  updated_at: string;
};

export type DatasetRecord = {
  id: string;
  dataset_id: string;
  payload: unknown;
  created_at: string;
};

export type Paginated<T> = { data: T[]; page: number; page_size: number; total: number };

export type Category = { category: string; count: number };

export type FeedStatus = {
  dataset_id: string;
  last_checked: string;
  status: 'healthy' | 'degraded' | 'down';
  latency_ms: number;
  error_message?: string | null;
};

export type Bookmark = Dataset;

export type ApiError = { error: { code: string; message: string } };
