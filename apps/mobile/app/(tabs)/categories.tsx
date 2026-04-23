import { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useCategories, useInfiniteDatasets } from '../../src/api/hooks';
import { Screen } from '../../src/components/Screen';
import { AppText } from '../../src/components/AppText';
import { Chip } from '../../src/components/Chip';
import { SearchBar } from '../../src/components/SearchBar';
import { DatasetCard } from '../../src/components/DatasetCard';
import { LoadingState } from '../../src/components/LoadingState';
import { EmptyState } from '../../src/components/EmptyState';
import { ErrorState } from '../../src/components/ErrorState';
import { theme } from '../../src/lib/theme';

export default function CategoriesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();

  const [category, setCategory] = useState<string | undefined>(
    typeof params.category === 'string' ? params.category : undefined,
  );
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 300);
    return () => clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    const incoming = typeof params.category === 'string' ? params.category : undefined;
    setCategory(incoming);
  }, [params.category]);

  const cats = useCategories();
  const datasets = useInfiniteDatasets({ category, q, pageSize: 20 });

  const data = useMemo(() => datasets.data?.pages.flatMap((p) => p.data) ?? [], [datasets.data]);

  const isRefreshing = datasets.isRefetching;

  return (
    <Screen>
      <AppText accessibilityRole="header" variant="h1">
        Categories
      </AppText>

      <View style={styles.controls}>
        <View style={styles.chipsRow} accessibilityLabel="Category filters">
          <Chip
            selected={!category}
            accessibilityLabel="All categories"
            onPress={() => {
              setCategory(undefined);
              router.setParams({ category: undefined });
            }}
          >
            All
          </Chip>
          {(cats.data ?? []).map((c) => (
            <Chip
              key={c.category}
              selected={category === c.category}
              accessibilityLabel={`Filter category ${c.category}`}
              onPress={() => {
                setCategory(c.category);
                router.setParams({ category: c.category });
              }}
            >
              {c.category}
            </Chip>
          ))}
        </View>

        <SearchBar testID="categories-search" value={qInput} onChangeText={setQInput} />
      </View>

      {datasets.isLoading ? <LoadingState /> : null}
      {datasets.isError ? <ErrorState onRetry={() => datasets.refetch()} /> : null}

      {!datasets.isLoading && !datasets.isError && data.length === 0 ? (
        <EmptyState title="No datasets match" message="Try a different search or category." />
      ) : null}

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => datasets.refetch()} />
        }
        onEndReached={() => {
          if (datasets.hasNextPage && !datasets.isFetchingNextPage) {
            datasets.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => (
          <DatasetCard
            item={item}
            testID={`dataset-card-${item.slug}`}
            onPress={() =>
              router.push({ pathname: '/dataset/[slug]', params: { slug: item.slug } })
            }
          />
        )}
        ListFooterComponent={
          datasets.isFetchingNextPage ? (
            <View style={styles.footer}>
              <LoadingState />
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  list: {
    paddingBottom: theme.spacing.xxl,
  },
  footer: {
    paddingVertical: theme.spacing.md,
  },
});
