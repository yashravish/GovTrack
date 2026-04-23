import { useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';

import { Screen } from '../../src/components/Screen';
import { AppText } from '../../src/components/AppText';
import { EmptyState } from '../../src/components/EmptyState';
import { LoadingState } from '../../src/components/LoadingState';
import { ErrorState } from '../../src/components/ErrorState';
import { DatasetCard } from '../../src/components/DatasetCard';
import { theme } from '../../src/lib/theme';
import { useBookmarks, useRemoveBookmark } from '../../src/api/hooks';

export default function SavedScreen() {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useBookmarks();
  const remove = useRemoveBookmark();

  const items = data?.data ?? [];

  const onOpen = useCallback(
    (slug: string) => {
      router.push(`/dataset/${encodeURIComponent(slug)}`);
    },
    [router],
  );

  const onRemove = useCallback(
    async (slug: string) => {
      await remove.mutateAsync({ slug });
    },
    [remove],
  );

  return (
    <Screen>
      <AppText accessibilityRole="header" variant="h1">
        Saved
      </AppText>

      {isLoading ? <LoadingState /> : null}
      {error ? <ErrorState message="Failed to load bookmarks" onRetry={refetch} /> : null}

      {!isLoading && !error && items.length === 0 ? (
        <EmptyState
          title="No saved datasets yet"
          message="Tap the bookmark icon on any dataset."
          accessibilityLabel="No saved datasets yet. Tap the bookmark icon on any dataset."
          style={styles.empty}
        />
      ) : null}

      {!isLoading && !error && items.length > 0 ? (
        <FlatList
          testID="saved-list"
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Swipeable
              renderRightActions={() => (
                <Pressable
                  testID={`saved-swipe-remove-${item.slug}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove bookmark for ${item.title}`}
                  onPress={() => onRemove(item.slug)}
                  style={({ pressed }) => [
                    styles.swipeRemove,
                    pressed ? styles.swipeRemovePressed : null,
                  ]}
                >
                  <AppText style={styles.swipeRemoveText}>Remove</AppText>
                </Pressable>
              )}
            >
              <View style={styles.row}>
                <DatasetCard
                  item={item}
                  testID={`saved-dataset-card-${item.slug}`}
                  onPress={() => onOpen(item.slug)}
                />
                <Pressable
                  testID={`saved-remove-${item.slug}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove bookmark for ${item.title}`}
                  onPress={() => onRemove(item.slug)}
                  style={({ pressed }) => [
                    styles.removeBtn,
                    pressed ? styles.removeBtnPressed : null,
                  ]}
                >
                  <AppText style={styles.removeText}>Remove bookmark</AppText>
                </Pressable>
              </View>
            </Swipeable>
          )}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    marginTop: theme.spacing.lg,
  },
  list: {
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },
  row: {
    marginBottom: theme.spacing.md,
  },
  removeBtn: {
    marginTop: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  removeBtnPressed: {
    opacity: 0.85,
  },
  removeText: {
    color: theme.colors.danger,
    fontWeight: '700',
  },
  swipeRemove: {
    width: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.danger,
    borderRadius: theme.radii.md,
    marginBottom: theme.spacing.md,
    minHeight: 44,
  },
  swipeRemovePressed: {
    opacity: 0.9,
  },
  swipeRemoveText: {
    color: '#fff',
    fontWeight: '800',
  },
});
