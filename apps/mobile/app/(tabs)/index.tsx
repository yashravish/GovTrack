import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useCategories, useFeedHealth } from '../../src/api/hooks';
import { Screen } from '../../src/components/Screen';
import { AppText } from '../../src/components/AppText';
import { CategoryCard } from '../../src/components/CategoryCard';
import { LoadingState } from '../../src/components/LoadingState';
import { ErrorState } from '../../src/components/ErrorState';
import { FeedStatusStrip } from '../../src/components/FeedStatusStrip';
import { theme } from '../../src/lib/theme';

export default function HomeScreen() {
  const router = useRouter();
  const cats = useCategories();
  const feeds = useFeedHealth();

  const top4 = useMemo(() => (cats.data ?? []).slice(0, 4), [cats.data]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText accessibilityRole="header" variant="h1">
          Explore public data
        </AppText>

        <View style={styles.section}>
          <AppText variant="h2">Live feed status</AppText>
          {feeds.isLoading ? <LoadingState /> : null}
          {feeds.isError ? <ErrorState onRetry={() => feeds.refetch()} /> : null}
          {feeds.data ? <FeedStatusStrip items={feeds.data} /> : null}
        </View>

        <View style={styles.section}>
          <AppText variant="h2">Categories</AppText>
          {cats.isLoading ? <LoadingState /> : null}
          {cats.isError ? <ErrorState onRetry={() => cats.refetch()} /> : null}
          {cats.data
            ? top4.map((c) => (
                <CategoryCard
                  key={c.category}
                  item={c}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/categories',
                      params: { category: c.category },
                    })
                  }
                />
              ))
            : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: theme.spacing.lg,
  },
  section: {
    gap: theme.spacing.md,
  },
});
