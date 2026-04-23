import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  clearStoredAdminToken,
  fetchCategories,
  fetchDatasets,
  getStoredAdminToken,
  setStoredAdminToken,
  triggerReseed,
  type ReseedResponse,
} from '../api';
import { Toast, type ToastKind } from '../components/Toast';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function DatasetsPage() {
  const qc = useQueryClient();
  const [category, setCategory] = useState<string>('');
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null);

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const datasetsQuery = useQuery({
    queryKey: ['datasets', category],
    queryFn: () => fetchDatasets({ category: category || undefined, pageSize: 50 }),
  });

  const reseedMutation = useMutation<ReseedResponse, Error, string>({
    mutationFn: (token) => triggerReseed(token),
    onSuccess: (data) => {
      setToast({
        kind: 'success',
        message: `Reseed OK — ${data.datasets} datasets, ${data.records} records`,
      });
      qc.invalidateQueries({ queryKey: ['datasets'] });
      qc.invalidateQueries({ queryKey: ['feed-health'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err) => {
      if (/Unauthorized/i.test(err.message)) {
        clearStoredAdminToken();
      }
      setToast({ kind: 'error', message: err.message });
    },
  });

  const datasets = datasetsQuery.data?.data ?? [];
  const total = datasetsQuery.data?.total ?? 0;

  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);

  async function onReseed() {
    let token = getStoredAdminToken();
    if (!token) {
      const entered = window.prompt('Enter admin token (stored locally):');
      if (!entered) return;
      token = entered.trim();
      if (!token) return;
      setStoredAdminToken(token);
    }
    reseedMutation.mutate(token);
  }

  function onClearToken() {
    clearStoredAdminToken();
    setToast({ kind: 'info', message: 'Cleared stored admin token.' });
  }

  return (
    <section aria-labelledby="datasets-heading">
      <h1 id="datasets-heading">Datasets</h1>
      <p className="page-subtitle">
        Browse all datasets. Use the admin token action to re-run the fixture seed.
      </p>

      <div className="panel toolbar">
        <label htmlFor="category-filter" className="muted">
          Category
        </label>
        <select
          id="category-filter"
          className="select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.category} value={c.category}>
              {c.category} ({c.count})
            </option>
          ))}
        </select>
        <span className="muted" aria-live="polite">
          Total: {total}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button type="button" className="button button--secondary" onClick={onClearToken}>
            Clear admin token
          </button>
          <button
            type="button"
            className="button"
            onClick={onReseed}
            disabled={reseedMutation.isPending}
            aria-label="Trigger reseed"
          >
            {reseedMutation.isPending ? 'Reseeding…' : 'Trigger reseed'}
          </button>
        </div>
      </div>

      {datasetsQuery.isLoading ? (
        <p className="muted" role="status">
          Loading datasets…
        </p>
      ) : datasetsQuery.isError ? (
        <div className="error" role="alert">
          Failed to load datasets:{' '}
          {String((datasetsQuery.error as Error)?.message ?? 'unknown error')}
        </div>
      ) : datasets.length === 0 ? (
        <p className="muted" role="status">
          No datasets found.
        </p>
      ) : (
        <div className="table-wrapper">
          <table>
            <caption>
              Datasets ({datasets.length} shown of {total})
            </caption>
            <thead>
              <tr>
                <th scope="col">Slug</th>
                <th scope="col">Title</th>
                <th scope="col">Category</th>
                <th scope="col">Source</th>
                <th scope="col">Updated</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((ds) => (
                <tr key={ds.id}>
                  <td>
                    <code>{ds.slug}</code>
                  </td>
                  <td>{ds.title}</td>
                  <td>{ds.category}</td>
                  <td>{ds.source_type}</td>
                  <td>{formatDate(ds.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {toast ? (
        <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />
      ) : null}
    </section>
  );
}
