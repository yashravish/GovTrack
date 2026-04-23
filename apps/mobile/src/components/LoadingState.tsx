import { ActivityIndicator, View } from 'react-native';

import { theme } from '../lib/theme';
import { AppText } from './AppText';

export function LoadingState() {
  return (
    <View accessibilityLabel="Loading state">
      <ActivityIndicator color={theme.colors.primary} />
      <AppText variant="caption">Loading…</AppText>
    </View>
  );
}
