import type { FeedStatus } from '@govtrack/shared-types';
import { StyleSheet, View } from 'react-native';

import { theme } from '../lib/theme';
import { AppText } from './AppText';

export function FeedStatusStrip({ items }: { items: FeedStatus[] }) {
  const cdc = items.find((x) => (x as any).slug === 'cdc_respiratory_weekly') ?? items[0];
  if (!cdc) return null;

  const label = buildLabel(cdc);
  return (
    <View style={styles.wrap} accessibilityRole="summary" accessibilityLabel={label}>
      <View style={[styles.dot, { backgroundColor: colorFor(cdc.status) }]} />
      <View style={styles.textWrap}>
        <AppText style={styles.title}>CDC feed</AppText>
        <AppText variant="caption" style={styles.caption}>
          {cdc.status}
        </AppText>
      </View>
    </View>
  );
}

function colorFor(status: FeedStatus['status']) {
  switch (status) {
    case 'healthy':
      return theme.colors.success;
    case 'degraded':
      return theme.colors.primary;
    case 'down':
    default:
      return theme.colors.danger;
  }
}

function buildLabel(item: FeedStatus) {
  const checkedAt = new Date(item.last_checked);
  const minutes = Math.max(0, Math.round((Date.now() - checkedAt.getTime()) / 60000));
  const when = minutes <= 1 ? '1 minute ago' : `${minutes} minutes ago`;
  return `CDC feed: ${item.status}, checked ${when}`;
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    minHeight: 44,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: theme.spacing.md,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
  },
  caption: {
    color: theme.colors.muted,
  },
});
