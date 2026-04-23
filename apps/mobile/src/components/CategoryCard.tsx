import type { Category } from '@govtrack/shared-types';
import { StyleSheet, View } from 'react-native';

import { theme } from '../lib/theme';
import { Card } from './Card';
import { AppText } from './AppText';

export function CategoryCard({ item, onPress }: { item: Category; onPress: () => void }) {
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`Category ${item.category}, ${item.count} datasets`}
      style={styles.card}
    >
      <View style={styles.row}>
        <AppText variant="h2">{labelFor(item.category)}</AppText>
        <View style={styles.badge} accessibilityLabel={`${item.count} datasets`}>
          <AppText style={styles.badgeText}>{item.count}</AppText>
        </View>
      </View>
      <AppText variant="caption">Browse datasets in this category.</AppText>
    </Card>
  );
}

function labelFor(category: string) {
  switch (category) {
    case 'agency_reports':
      return 'Agency reports';
    default:
      return category.charAt(0).toUpperCase() + category.slice(1);
  }
}

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  badge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.lg,
    minHeight: 28,
    justifyContent: 'center',
  },
  badgeText: {
    color: theme.colors.bg,
    fontWeight: '700',
  },
});
