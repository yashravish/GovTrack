import { useQuery } from '@tanstack/react-query';

import { fetchFeedHealth, type FeedHealth } from '../api';

function StatusCell({ status }: { status: FeedHealth['status'] }) {
  const label = status === 'healthy' ? 'Healthy' : status === 'degraded' ? 'Degraded' : 'Down';
  return (
    <span className={`status status--${status}`} aria-label={`Status: ${label}`}>
      <span className="status__dot" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function FeedHealthPage() {
  const query = useQuery<FeedHealth[]>({
    queryKey: ['feed-health'],
    queryFn: fetchFeedHealth,
    refetchInterval: 30_000,
  });

  return (
    <section aria-labelledby="feed-health-heading">
      <h1 id="feed-health-heading">Feed health</h1>
      <p className="page-subtitle">
        Live status for each ingestion feed. Auto-refreshes every 30 seconds.
      </p>

      {query.isLoading ? (
        <p className="muted" role="status">
          Loading feed health…
        </p>
      ) : query.isError ? (
        <div className="error" role="alert">
          Failed to load feed health: {String((query.error as Error)?.message ?? 'unknown error')}
        </div>
      ) : (query.data ?? []).length === 0 ? (
        <p className="muted" role="status">
          No feed data available yet.
        </p>
      ) : (
        <div className="table-wrapper">
          <table>
            <caption>Feed health ({(query.data ?? []).length} feeds)</caption>
            <thead>
              <tr>
                <th scope="col">Dataset slug</th>
                <th scope="col">Status</th>
                <th scope="col">Last checked</th>
                <th scope="col">Latency</th>
                <th scope="col">Error</th>
              </tr>
            </thead>
            <tbody>
              {(query.data ?? []).map((row) => (
                <tr key={row.dataset_id}>
                  <td>
                    <code>{row.slug}</code>
                  </td>
                  <td>
                    <StatusCell status={row.status} />
                  </td>
                  <td>{formatDate(row.last_checked)}</td>
                  <td>{row.latency_ms} ms</td>
                  <td>
                    {row.error_message ? (
                      <span className="muted">{row.error_message}</span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
