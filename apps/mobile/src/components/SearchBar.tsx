import type { TextInputProps } from 'react-native';
import { StyleSheet, TextInput, View } from 'react-native';

import { theme } from '../lib/theme';

export function SearchBar({
  value,
  onChangeText,
  accessibilityLabel = 'Search datasets',
  ...rest
}: TextInputProps & { accessibilityLabel?: string }) {
  return (
    <View style={styles.wrap}>
      <TextInput
        {...rest}
        value={value}
        onChangeText={onChangeText}
        placeholder="Search…"
        placeholderTextColor={theme.colors.muted}
        accessibilityLabel={accessibilityLabel}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
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
