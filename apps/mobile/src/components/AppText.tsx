import type { PropsWithChildren } from 'react';
import type { TextProps } from 'react-native';
import { Text } from 'react-native';

import { theme } from '../lib/theme';

type Variant = 'h1' | 'h2' | 'body' | 'caption';

export type AppTextProps = PropsWithChildren<
  TextProps & {
    variant?: Variant;
  }
>;

export function AppText({ variant = 'body', style, children, ...rest }: AppTextProps) {
  const v = theme.typography[variant];
  return (
    <Text
      {...rest}
      style={[
        { color: theme.colors.text },
        v,
        // caption includes its own color
        variant === 'caption' ? {} : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}
