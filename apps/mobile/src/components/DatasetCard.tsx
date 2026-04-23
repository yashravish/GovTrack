import type { Dataset } from '@govtrack/shared-types';
import { StyleSheet, View } from 'react-native';

import { theme } from '../lib/theme';
import { Card } from './Card';
import { AppText } from './AppText';

export function DatasetCard({
  item,
  onPress,
  testID,
}: {
  item: Dataset;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Card
      testID={testID}
      onPress={onPress}
      accessibilityLabel={`Dataset ${item.title}`}
      style={styles.card}
    >
      <AppText variant="h2">{item.title}</AppText>
      <View style={styles.badges}>
        <View
          style={[styles.badge, styles.badgeNeutral]}
          accessibilityLabel={`Category ${item.category}`}
        >
          <AppText style={styles.badgeText}>{item.category}</AppText>
        </View>
        <View
          style={[
            styles.badge,
            item.source_type === 'live' ? styles.badgeLive : styles.badgeFixture,
          ]}
          accessibilityLabel={`Source ${item.source_type}`}
        >
          <AppText style={styles.badgeText}>{item.source_type}</AppText>
        </View>
      </View>
      <AppText variant="caption" style={styles.desc}>
        {item.description}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.md,
  },
  badges: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    flexWrap: 'wrap',
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
  desc: {
    color: theme.colors.muted,
  },
});
