import type { PropsWithChildren } from 'react';
import type { PressableProps } from 'react-native';
import { Pressable, StyleSheet } from 'react-native';

import { theme } from '../lib/theme';
import { minHitSlop } from '../lib/hitSlop';
import { AppText } from './AppText';

export function Chip({
  selected,
  accessibilityLabel,
  children,
  ...rest
}: PropsWithChildren<
  PressableProps & {
    selected?: boolean;
    accessibilityLabel: string;
  }
>) {
  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={minHitSlop}
      style={[styles.base, selected ? styles.selected : styles.unselected]}
    >
      <AppText style={[styles.text, selected ? styles.textSelected : styles.textUnselected]}>
        {children}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  selected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  unselected: {
    backgroundColor: theme.colors.surface,
  },
  text: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.fontSize + 4,
    fontWeight: '600',
  },
  textSelected: {
    color: theme.colors.bg,
  },
  textUnselected: {
    color: theme.colors.text,
  },
});
