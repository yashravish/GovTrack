import type { ViewProps } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { theme } from '../lib/theme';
import { minHitSlop } from '../lib/hitSlop';

export function ErrorState({
  onRetry,
  accessibilityLabel = 'Error state',
  ...rest
}: ViewProps & { onRetry?: () => void; accessibilityLabel?: string }) {
  return (
    <View accessibilityLabel={accessibilityLabel} {...rest}>
      <AppText variant="h2">Something went wrong</AppText>
      <AppText variant="caption">Please try again.</AppText>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry"
          hitSlop={minHitSlop}
          onPress={onRetry}
          style={styles.retry}
        >
          <AppText style={styles.retryText}>Retry</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  retry: {
    marginTop: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    minHeight: 44,
    alignSelf: 'flex-start',
  },
  retryText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
