import { AccessibilityInfo } from 'react-native';

export async function announceForAccessibility(msg: string) {
  try {
    await AccessibilityInfo.announceForAccessibility(msg);
  } catch {
    // noop (unsupported platforms)
  }
}

export function withA11yLabel<T extends { accessibilityLabel?: string }>(
  props: T,
  label: string,
): T {
  return { ...props, accessibilityLabel: label };
}
