import type {
  Category,
  Dataset,
  DatasetRecord,
  FeedStatus,
  Paginated,
} from '@govtrack/shared-types';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { apiFetch } from './client';
import {
  BookmarksSchema,
  CategorySchema,
  DatasetRecordSchema,
  DatasetSchema,
  FeedStatusSchema,
  PaginatedSchema,
} from './schemas';

export function useDatasets(args: {
  category?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}) {
  const { category, q, page = 1, pageSize = 20 } = args;
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('page_size', String(pageSize));
  if (category) params.set('category', category);
  if (q) params.set('q', q);

  return useQuery<Paginated<Dataset>, Error>({
    queryKey: ['datasets', { category, q, page, pageSize }],
    queryFn: () =>
      apiFetch(`/api/v1/datasets?${params.toString()}`, {
        zSchema: PaginatedSchema(DatasetSchema) as z.ZodType<Paginated<Dataset>>,
      }),
  });
}

export function useInfiniteDatasets(args: { category?: string; q?: string; pageSize?: number }) {
  const { category, q, pageSize = 20 } = args;

  return useInfiniteQuery<Paginated<Dataset>, Error>({
    queryKey: ['datasets-infinite', { category, q, pageSize }],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      const page = Number(pageParam) || 1;
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('page_size', String(pageSize));
      if (category) params.set('category', category);
      if (q) params.set('q', q);
      return apiFetch(`/api/v1/datasets?${params.toString()}`, {
        zSchema: PaginatedSchema(DatasetSchema) as z.ZodType<Paginated<Dataset>>,
      });
    },
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.page * lastPage.page_size;
      if (loaded >= lastPage.total) return undefined;
      return lastPage.page + 1;
    },
  });
}

export function useDataset(slug: string) {
  return useQuery<Dataset, Error>({
    queryKey: ['dataset', slug],
    enabled: !!slug,
    queryFn: () =>
      apiFetch(`/api/v1/datasets/${encodeURIComponent(slug)}`, { zSchema: DatasetSchema }),
  });
}

export function useRecords(
  slug: string,
  args: {
    q?: string;
    page?: number;
    pageSize?: number;
  },
) {
  const { q, page = 1, pageSize = 20 } = args;
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('page_size', String(pageSize));
  if (q) params.set('q', q);

  return useQuery<Paginated<DatasetRecord>, Error>({
    queryKey: ['records', slug, { q, page, pageSize }],
    enabled: !!slug,
    queryFn: () =>
      apiFetch(`/api/v1/datasets/${encodeURIComponent(slug)}/records?${params.toString()}`, {
        zSchema: PaginatedSchema(DatasetRecordSchema) as z.ZodType<Paginated<DatasetRecord>>,
      }),
  });
}

export function useStats(slug: string) {
  const StatsSchema = z.object({
    count: z.number(),
    min: z.number(),
    max: z.number(),
    mean: z.number(),
  });

  return useQuery<{ count: number; min: number; max: number; mean: number }, Error>({
    queryKey: ['stats', slug],
    enabled: !!slug,
    queryFn: () =>
      apiFetch(`/api/v1/datasets/${encodeURIComponent(slug)}/stats`, { zSchema: StatsSchema }),
  });
}

export function useCategories() {
  return useQuery<Category[], Error>({
    queryKey: ['categories'],
    queryFn: () => apiFetch(`/api/v1/categories`, { zSchema: z.array(CategorySchema) }),
  });
}

export function useFeedHealth() {
  return useQuery<FeedStatus[], Error>({
    queryKey: ['feed-health'],
    queryFn: () => apiFetch(`/api/v1/feeds/health`, { zSchema: z.array(FeedStatusSchema) }),
  });
}

export function useBookmarks() {
  return useQuery<{ data: Dataset[] }, Error>({
    queryKey: ['bookmarks'],
    queryFn: () => apiFetch(`/api/v1/bookmarks`, { zSchema: BookmarksSchema }),
  });
}

export function useAddBookmark() {
  const qc = useQueryClient();

  return useMutation<Dataset, Error, { dataset_slug: string }>({
    mutationFn: (body) =>
      apiFetch(`/api/v1/bookmarks`, {
        method: 'POST',
        body,
        zSchema: DatasetSchema,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });
}

export function useRemoveBookmark() {
  const qc = useQueryClient();

  return useMutation<void, Error, { slug: string }>({
    mutationFn: async ({ slug }) => {
      await apiFetch(`/api/v1/bookmarks/${encodeURIComponent(slug)}`, {
        method: 'DELETE',
        zSchema: z.any(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookmarks'] });
    },
  });
}
