import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { announceForAccessibility } from '../lib/a11y';
import { minHitSlop } from '../lib/hitSlop';
import { theme } from '../lib/theme';
import { useAddBookmark, useBookmarks, useRemoveBookmark } from '../api/hooks';

export function BookmarkButton({ slug, testID }: { slug: string; testID?: string }) {
  const bms = useBookmarks();
  const add = useAddBookmark();
  const remove = useRemoveBookmark();

  const isBookmarked = useMemo(() => {
    return (bms.data?.data ?? []).some((d) => d.slug === slug);
  }, [bms.data, slug]);

  const label = isBookmarked ? 'Remove bookmark' : 'Save dataset';

  const onPress = async () => {
    if (isBookmarked) {
      remove.mutate(
        { slug },
        {
          onSuccess: async () => {
            await announceForAccessibility('Bookmark removed');
          },
        },
      );
      return;
    }

    add.mutate(
      { dataset_slug: slug },
      {
        onSuccess: async () => {
          await announceForAccessibility('Dataset saved');
        },
      },
    );
  };

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isBookmarked }}
      hitSlop={minHitSlop}
      onPress={onPress}
      style={styles.btn}
    >
      <View style={styles.inner}>
        <Ionicons
          name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
          size={20}
          color={theme.colors.primary}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.sm,
  },
});
