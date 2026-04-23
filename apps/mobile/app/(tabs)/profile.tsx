import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '../../src/components/Screen';
import { AppText } from '../../src/components/AppText';
import { AppTextInput } from '../../src/components/AppTextInput';
import { theme } from '../../src/lib/theme';
import { useAuth } from '../../src/providers/AuthContext';

export default function ProfileScreen() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const canSubmit = useMemo(() => email.trim().length > 3, [email]);

  async function onSend() {
    setSent(false);
    await auth.requestLink(email.trim());
    setSent(true);
  }

  return (
    <Screen>
      <AppText accessibilityRole="header" variant="h1">
        Profile
      </AppText>

      {!auth.isAuthenticated ? (
        <View style={styles.block}>
          <AppText variant="body" style={styles.sub}>
            Sign in with a magic link.
          </AppText>
          <AppTextInput
            testID="profile-email-input"
            value={email}
            onChangeText={setEmail}
            accessibilityLabel="Email"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="you@example.com"
          />
          <Pressable
            testID="profile-send-link"
            accessibilityRole="button"
            accessibilityLabel="Send magic link"
            disabled={!canSubmit}
            onPress={onSend}
            style={({ pressed }) => [
              styles.button,
              !canSubmit ? styles.buttonDisabled : null,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <AppText variant="body" style={styles.buttonText}>
              Send magic link
            </AppText>
          </Pressable>
          {sent ? (
            <AppText
              testID="profile-check-email"
              accessibilityLiveRegion="polite"
              variant="body"
              style={styles.notice}
            >
              Check your email.
            </AppText>
          ) : null}
        </View>
      ) : (
        <View style={styles.block}>
          <AppText testID="profile-signed-in" variant="body" style={styles.sub}>
            Signed in{auth.email ? ` as ${auth.email}` : ''}.
          </AppText>
          <Pressable
            testID="profile-sign-out"
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            onPress={auth.signOut}
            style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}
          >
            <AppText variant="body" style={styles.buttonText}>
              Sign out
            </AppText>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  sub: {
    color: theme.colors.muted,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  notice: {
    color: theme.colors.muted,
  },
});
