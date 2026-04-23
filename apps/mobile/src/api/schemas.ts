import { z } from 'zod';

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export const DatasetSchema = z.object({
  id: z.string(),
  slug: z.string(),
  category: z.string(),
  title: z.string(),
  description: z.string(),
  source_url: z.string(),
  source_type: z.union([z.literal('fixture'), z.literal('live')]),
  updated_at: z.string(),
});

export const DatasetRecordSchema = z.object({
  id: z.string(),
  dataset_id: z.string(),
  payload: z.unknown(),
  created_at: z.string(),
});

export const CategorySchema = z.object({
  category: z.string(),
  count: z.number(),
});

export const FeedStatusSchema = z.object({
  dataset_id: z.string(),
  slug: z.string().optional(),
  last_checked: z.string(),
  status: z.union([z.literal('healthy'), z.literal('degraded'), z.literal('down')]),
  latency_ms: z.number(),
  error_message: z.string().nullable().optional(),
});

export const PaginatedSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: z.array(item),
    page: z.number(),
    page_size: z.number(),
    total: z.number(),
  });

export const BookmarksSchema = z.object({ data: z.array(DatasetSchema) });
