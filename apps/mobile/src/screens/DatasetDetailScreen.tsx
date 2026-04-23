import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useDataset, useRecords, useStats } from '../api/hooks';
import { AppText } from '../components/AppText';
import { BookmarkButton } from '../components/BookmarkButton';
import { ChartWithTextAlt } from '../components/ChartWithTextAlt';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { LoadingState } from '../components/LoadingState';
import { Screen } from '../components/Screen';
import { theme } from '../lib/theme';

type RecordPayload = {
  title?: string;
  region?: string;
  value?: number | string;
  date?: string;
  summary?: string;
};

export function DatasetDetailScreen({ slug: slugProp }: { slug?: string }) {
  const router = useRouter();
  const params = useLocalSearchParams<{ slug?: string }>();
  const slug = slugProp ?? (typeof params.slug === 'string' ? params.slug : '');

  const [page, setPage] = useState(1);

  const ds = useDataset(slug);
  const stats = useStats(slug);
  const records = useRecords(slug, { page, pageSize: 20 });

  const chartPoints = useMemo(() => {
    const rows = records.data?.data ?? [];
    const parsed = rows
      .map((r) => {
        const p = (r.payload ?? {}) as RecordPayload;
        const valueRaw = p.value;
        const value =
          typeof valueRaw === 'number'
            ? valueRaw
            : typeof valueRaw === 'string'
              ? Number(valueRaw)
              : NaN;
        const label =
          (p.date ?? '').slice(0, 10) ||
          (p.title ? String(p.title).slice(0, 10) : r.id.slice(0, 6));
        const date = (p.date ?? '').slice(0, 10) || undefined;
        if (!Number.isFinite(value)) return null;
        return { label, value, date };
      })
      .filter(Boolean) as { label: string; value: number; date?: string }[];

    return parsed.slice(0, 20).reverse();
  }, [records.data]);

  const nf = useMemo(() => new Intl.NumberFormat(), []);

  if (!slug) {
    return (
      <Screen>
        <ErrorState accessibilityLabel="Not found" onRetry={() => router.back()} />
      </Screen>
    );
  }

  if (ds.isLoading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (ds.isError) {
    return (
      <Screen>
        <ErrorState accessibilityLabel="Dataset error" onRetry={() => ds.refetch()} />
      </Screen>
    );
  }

  if (!ds.data) {
    return (
      <Screen>
        <EmptyState title="Dataset not found" message="Go back and try another dataset." />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.headerRow}>
        <AppText
          testID="dataset-detail-title"
          accessibilityRole="header"
          variant="h1"
          style={styles.title}
        >
          {ds.data.title}
        </AppText>
        <BookmarkButton testID="bookmark-button" slug={ds.data.slug} />
      </View>

      <View style={styles.badges} accessibilityLabel="Dataset metadata badges">
        <View
          style={[styles.badge, styles.badgeNeutral]}
          accessibilityLabel={`Category ${ds.data.category}`}
        >
          <AppText style={styles.badgeTextNeutral}>{ds.data.category}</AppText>
        </View>
        <View
          style={[
            styles.badge,
            ds.data.source_type === 'live' ? styles.badgeLive : styles.badgeFixture,
          ]}
          accessibilityLabel={`Source type ${ds.data.source_type}`}
        >
          <AppText style={styles.badgeText}>{ds.data.source_type}</AppText>
        </View>
      </View>

      <AppText variant="caption">{ds.data.description}</AppText>
      <AppText variant="caption">Updated {new Date(ds.data.updated_at).toLocaleString()}</AppText>

      <AppText accessibilityRole="header" variant="h2" style={styles.sectionHeader}>
        Summary
      </AppText>
      {stats.isLoading ? <LoadingState /> : null}
      {stats.isError ? <ErrorState onRetry={() => stats.refetch()} /> : null}
      {stats.data ? (
        <View style={styles.grid} accessibilityLabel="Summary statistics">
          <StatCell label="Count" value={nf.format(stats.data.count)} />
          <StatCell label="Min" value={nf.format(stats.data.min)} />
          <StatCell label="Max" value={nf.format(stats.data.max)} />
          <StatCell label="Mean" value={nf.format(stats.data.mean)} />
        </View>
      ) : null}

      <AppText accessibilityRole="header" variant="h2" style={styles.sectionHeader}>
        Trend
      </AppText>
      {chartPoints.length ? (
        <ChartWithTextAlt points={chartPoints} />
      ) : (
        <EmptyState title="No chart data" message="This dataset has no numeric values." />
      )}

      <AppText accessibilityRole="header" variant="h2" style={styles.sectionHeader}>
        Records
      </AppText>

      {records.isError ? <ErrorState onRetry={() => records.refetch()} /> : null}

      <FlatList
        data={records.data?.data ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={records.isRefetching} onRefresh={() => records.refetch()} />
        }
        renderItem={({ item }) => {
          const p = (item.payload ?? {}) as RecordPayload;
          const title = p.title ?? 'Record';
          const region = p.region ?? '';
          const value = p.value;
          const date = p.date ? String(p.date).slice(0, 10) : '';
          return (
            <View style={styles.record} accessibilityLabel={`Record ${title}`}>
              <AppText style={styles.recordTitle}>{String(title)}</AppText>
              <AppText variant="caption">
                {region ? `${region} · ` : ''}
                {date ? `${date} · ` : ''}
                {value !== undefined ? `Value ${String(value)}` : ''}
              </AppText>
            </View>
          );
        }}
        ListEmptyComponent={
          !records.isLoading && !records.isError ? (
            <EmptyState title="No records" message="No records to show." />
          ) : null
        }
        onEndReached={() => {
          const total = records.data?.total ?? 0;
          const pageSize = records.data?.page_size ?? 20;
          if (page * pageSize < total && !records.isFetching) {
            setPage((p) => p + 1);
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={records.isLoading ? <LoadingState /> : null}
      />
    </Screen>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.cell} accessibilityLabel={`${label} ${value}`}>
      <AppText variant="caption">{label}</AppText>
      <AppText style={styles.cellValue}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  title: {
    flex: 1,
  },
  badges: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  badge: {
    borderRadius: theme.radii.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    minHeight: 28,
    justifyContent: 'center',
  },
  badgeNeutral: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  badgeLive: {
    backgroundColor: theme.colors.success,
  },
  badgeFixture: {
    backgroundColor: theme.colors.primary,
  },
  badgeText: {
    color: theme.colors.bg,
    fontWeight: '700',
    fontSize: theme.typography.caption.fontSize,
  },
  badgeTextNeutral: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: theme.typography.caption.fontSize,
  },
  sectionHeader: {
    marginTop: theme.spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  cell: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    minHeight: 60,
  },
  cellValue: {
    fontWeight: '700',
    marginTop: theme.spacing.xs,
  },
  record: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: theme.spacing.md,
  },
  recordTitle: {
    fontWeight: '700',
  },
});
