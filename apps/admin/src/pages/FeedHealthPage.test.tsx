import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import { FeedHealthPage } from './FeedHealthPage';

function renderWithProviders(ui: React.ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchInterval: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

const sampleRows = [
  {
    dataset_id: 'd1',
    slug: 'healthcare_access',
    last_checked: '2026-04-23T12:00:00Z',
    status: 'healthy',
    latency_ms: 42,
    error_message: null,
  },
  {
    dataset_id: 'd2',
    slug: 'transit_ridership',
    last_checked: '2026-04-23T12:01:00Z',
    status: 'down',
    latency_ms: 0,
    error_message: 'connection refused',
  },
];

describe('FeedHealthPage', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders rows from mocked fetch', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => sampleRows,
    });

    renderWithProviders(<FeedHealthPage />);

    await waitFor(() => expect(screen.getByText('healthcare_access')).toBeInTheDocument());
    expect(screen.getByText('transit_ridership')).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Status:/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('connection refused')).toBeInTheDocument();
  });

  it('handles empty response', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    renderWithProviders(<FeedHealthPage />);

    await waitFor(() => expect(screen.getByText(/No feed data available/i)).toBeInTheDocument());
  });

  it('handles error response', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'boom',
    });

    renderWithProviders(<FeedHealthPage />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert').textContent).toMatch(/Failed to load/i);
  });
});
