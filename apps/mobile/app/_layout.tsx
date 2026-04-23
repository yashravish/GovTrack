import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { theme } from '../src/lib/theme';
import { QueryProvider } from '../src/providers/QueryProvider';
import { AuthProvider, useAuth } from '../src/providers/AuthContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryProvider>
        <AuthProvider>
          <AuthDeepLinkListener />
          <ThemeProvider
            value={{
              dark: false,
              colors: {
                primary: theme.colors.primary,
                background: theme.colors.bg,
                card: theme.colors.surface,
                text: theme.colors.text,
                border: theme.colors.border,
                notification: theme.colors.danger,
              },
              fonts: {
                regular: { fontFamily: 'System', fontWeight: '400' },
                medium: { fontFamily: 'System', fontWeight: '500' },
                bold: { fontFamily: 'System', fontWeight: '700' },
                heavy: { fontFamily: 'System', fontWeight: '800' },
              },
            }}
          >
            <StatusBar style="dark" />
            <Stack />
          </ThemeProvider>
        </AuthProvider>
      </QueryProvider>
    </GestureHandlerRootView>
  );
}

function AuthDeepLinkListener() {
  const auth = useAuth();

  useEffect(() => {
    let disposed = false;

    const handleUrl = (url: string) => {
      const parsed = Linking.parse(url);
      const token = typeof parsed.queryParams?.token === 'string' ? parsed.queryParams.token : null;
      if (token) {
        auth.verifyToken(token).catch(() => {
          // ignore; UI stays unauthenticated
        });
      }
    };

    Linking.getInitialURL()
      .then((url) => {
        if (!disposed && url) handleUrl(url);
      })
      .catch(() => {});

    const sub = Linking.addEventListener('url', (e) => handleUrl(e.url));
    return () => {
      disposed = true;
      sub.remove();
    };
  }, [auth]);

  return null;
}
