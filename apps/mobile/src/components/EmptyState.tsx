import type { ViewProps } from 'react-native';
import { View } from 'react-native';

import { AppText } from './AppText';

export function EmptyState({
  title = 'Nothing here yet',
  message = 'This is a placeholder screen.',
  accessibilityLabel = 'Empty state',
  ...rest
}: ViewProps & { title?: string; message?: string; accessibilityLabel?: string }) {
  return (
    <View accessibilityLabel={accessibilityLabel} {...rest}>
      <AppText variant="h2">{title}</AppText>
      <AppText variant="caption">{message}</AppText>
    </View>
  );
}
