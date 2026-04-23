import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { apiFetch, ApiFetchError } from '../src/api/client';
import { useDatasets } from '../src/api/hooks';
import { DatasetSchema, PaginatedSchema } from '../src/api/schemas';

jest.mock('../src/lib/device', () => ({
  getDeviceId: async () => 'device-test-123',
}));

jest.mock('../src/lib/session', () => ({
  getSession: async () => ({ jwt: 'jwt-test', expiresAt: '2099-01-01T00:00:00Z' }),
}));

describe('apiFetch', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('attaches X-Device-ID and Authorization headers', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          data: [],
          page: 1,
          page_size: 20,
          total: 0,
        }),
    });

    await apiFetch('/api/v1/datasets?page=1&page_size=20', {
      zSchema: PaginatedSchema(DatasetSchema),
    });

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.headers['X-Device-ID']).toBe('device-test-123');
    expect(init.headers.Authorization).toBe('Bearer jwt-test');
  });

  it('throws parse_error on Zod mismatch', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ not: 'matching' }),
    });

    await expect(
      apiFetch('/api/v1/datasets', {
        zSchema: PaginatedSchema(DatasetSchema),
      }),
    ).rejects.toMatchObject({
      name: 'ApiFetchError',
      message: 'parse_error',
    } satisfies Partial<ApiFetchError>);
  });
});

describe('hooks', () => {
  it('useDatasets surfaces data', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          data: [
            {
              id: '1',
              slug: 'healthcare_access',
              category: 'healthcare',
              title: 'Healthcare access',
              description: 'x',
              source_url: 'x',
              source_type: 'fixture',
              updated_at: '2026-01-01T00:00:00Z',
            },
          ],
          page: 1,
          page_size: 20,
          total: 1,
        }),
    });

    const qc = new QueryClient();
    const wrapper = ({ children }: any) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useDatasets({ page: 1, pageSize: 20 }), { wrapper });

    await waitFor(() => {
      expect(result.current.data?.total).toBe(1);
    });
  });
});
