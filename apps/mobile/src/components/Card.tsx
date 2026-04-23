import type { PropsWithChildren } from 'react';
import type { PressableProps, ViewProps } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { theme } from '../lib/theme';
import { minHitSlop } from '../lib/hitSlop';

type CardProps = PropsWithChildren<
  {
    onPress?: PressableProps['onPress'];
    accessibilityLabel?: string;
  } & Omit<ViewProps, 'children'>
>;

export function Card({ onPress, accessibilityLabel, children, style, ...rest }: CardProps) {
  if (onPress) {
    return (
      <Pressable
        {...rest}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        hitSlop={minHitSlop}
        style={({ pressed }) => [
          styles.card,
          pressed ? styles.pressed : null,
          style as any,
          { minHeight: 44, minWidth: 44 },
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View {...rest} style={[styles.card, style]} accessibilityLabel={accessibilityLabel}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
  },
  pressed: {
    opacity: 0.85,
  },
});
