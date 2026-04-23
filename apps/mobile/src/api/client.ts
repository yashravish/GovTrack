import { z } from 'zod';

import type { ApiError } from '@govtrack/shared-types';

import { getDeviceId } from '../lib/device';
import { getSession } from '../lib/session';
import { ApiErrorSchema } from './schemas';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';

export class ApiFetchError extends Error {
  status: number;
  apiError?: ApiError;

  constructor(message: string, status: number, apiError?: ApiError) {
    super(message);
    this.name = 'ApiFetchError';
    this.status = status;
    this.apiError = apiError;
  }
}

type ApiFetchOptions<T> = {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  zSchema: z.ZodType<T>;
  signal?: AbortSignal;
  auth?: boolean;
};

export async function apiFetch<T>(path: string, opts: ApiFetchOptions<T>): Promise<T> {
  const { method = 'GET', body, zSchema, signal, auth = true } = opts;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  const deviceId = await getDeviceId();
  headers['X-Device-ID'] = deviceId;

  if (auth) {
    const session = await getSession();
    if (session?.jwt) {
      headers.Authorization = `Bearer ${session.jwt}`;
    }
  }

  let bodyStr: string | undefined;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    bodyStr = JSON.stringify(body);
  }

  const url = `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: bodyStr,
      signal: signal ?? controller.signal,
    });

    const text = await res.text();
    const json = text ? safeJson(text) : null;

    if (!res.ok) {
      const parsed = ApiErrorSchema.safeParse(json);
      if (parsed.success) {
        throw new ApiFetchError(parsed.data.error.message, res.status, parsed.data as ApiError);
      }
      throw new ApiFetchError('request_failed', res.status);
    }

    const parsed = zSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiFetchError('parse_error', res.status);
    }

    return parsed.data;
  } finally {
    clearTimeout(timeout);
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
