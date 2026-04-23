import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import { DatasetsPage } from './DatasetsPage';
import { ADMIN_TOKEN_STORAGE_KEY } from '../api';

function renderWithProviders(ui: React.ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const sampleDatasets = {
  data: [
    {
      id: '1',
      slug: 'healthcare_access',
      category: 'healthcare',
      title: 'Healthcare access',
      description: 'desc',
      source_url: 'fixtures/a.csv',
      source_type: 'fixture',
      updated_at: '2026-04-23T12:00:00Z',
    },
    {
      id: '2',
      slug: 'transit_ridership',
      category: 'transportation',
      title: 'Transit ridership',
      description: 'desc',
      source_url: 'fixtures/b.csv',
      source_type: 'fixture',
      updated_at: '2026-04-23T12:00:00Z',
    },
  ],
  page: 1,
  page_size: 50,
  total: 2,
};

const sampleCategories = [
  { category: 'healthcare', count: 1 },
  { category: 'transportation', count: 1 },
];

type JsonResponder = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function installFetchMock(): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn<JsonResponder>(async (input, init) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('/api/v1/categories')) {
      return {
        ok: true,
        status: 200,
        json: async () => sampleCategories,
      } as unknown as Response;
    }
    if (url.includes('/api/v1/datasets')) {
      return {
        ok: true,
        status: 200,
        json: async () => sampleDatasets,
      } as unknown as Response;
    }
    if (url.includes('/api/v1/admin/reseed')) {
      const token = (init?.headers as Record<string, string> | undefined)?.['X-Admin-Token'];
      if (!token) {
        return { ok: false, status: 401, text: async () => 'no token' } as unknown as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ status: 'ok', datasets: 4, records: 200, __token: token }),
      } as unknown as Response;
    }
    return { ok: false, status: 404, text: async () => 'not found' } as unknown as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('DatasetsPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders dataset rows with total count', async () => {
    installFetchMock();
    renderWithProviders(<DatasetsPage />);

    await waitFor(() => expect(screen.getByText('Healthcare access')).toBeInTheDocument());
    expect(screen.getByText(/Total:\s*2/)).toBeInTheDocument();
  });

  it('triggers reseed with token from localStorage and sends X-Admin-Token header', async () => {
    const fetchMock = installFetchMock();
    localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, 'my-secret-token');

    renderWithProviders(<DatasetsPage />);

    await waitFor(() => expect(screen.getByText('Healthcare access')).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /trigger reseed/i }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) =>
        String(url).includes('/api/v1/admin/reseed'),
      );
      expect(call).toBeTruthy();
      const headers = (call?.[1] as RequestInit | undefined)?.headers as
        | Record<string, string>
        | undefined;
      expect(headers?.['X-Admin-Token']).toBe('my-secret-token');
    });

    await waitFor(() => expect(screen.getByText(/Reseed OK/i)).toBeInTheDocument());
  });

  it('prompts for admin token on first use and persists it to localStorage', async () => {
    const fetchMock = installFetchMock();
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('prompted-token');

    renderWithProviders(<DatasetsPage />);

    await waitFor(() => expect(screen.getByText('Healthcare access')).toBeInTheDocument());

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /trigger reseed/i }));

    expect(promptSpy).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY)).toBe('prompted-token');

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([url]) =>
        String(url).includes('/api/v1/admin/reseed'),
      );
      const headers = (call?.[1] as RequestInit | undefined)?.headers as
        | Record<string, string>
        | undefined;
      expect(headers?.['X-Admin-Token']).toBe('prompted-token');
    });
  });
});
