import type { TextInputProps } from 'react-native';
import { StyleSheet, TextInput, View } from 'react-native';

import { theme } from '../lib/theme';

export function AppTextInput({
  accessibilityLabel,
  style,
  ...rest
}: TextInputProps & { accessibilityLabel: string }) {
  return (
    <View style={styles.wrap}>
      <TextInput
        {...rest}
        accessibilityLabel={accessibilityLabel}
        placeholderTextColor={theme.colors.muted}
        style={[styles.input, style]}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  input: {
    color: theme.colors.text,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    paddingVertical: theme.spacing.sm,
  },
});
