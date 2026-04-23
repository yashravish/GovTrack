import type { PropsWithChildren } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AccessibilityInfo } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import { z } from 'zod';
import { clearSession, getSession, setSession } from '../lib/session';

const VerifyRespSchema = z.object({
  token: z.string(),
  expires_at: z.string(),
});

const RequestRespSchema = z.object({ status: z.string() });

type AuthState = {
  userId: string | null;
  email: string | null;
  jwt: string | null;
};

type AuthContextValue = {
  userId: string | null;
  isAuthenticated: boolean;
  requestLink: (email: string) => Promise<void>;
  verifyToken: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  email: string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ userId: null, email: null, jwt: null });
  const migratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await getSession();
      if (!s?.jwt) return;
      const parsed = parseJWT(s.jwt);
      if (!parsed) return;
      if (!cancelled) {
        setState({ userId: parsed.userId, email: parsed.email, jwt: s.jwt });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const requestLink = useCallback(async (email: string) => {
    await apiFetch('/api/v1/auth/request', {
      method: 'POST',
      body: { email },
      zSchema: RequestRespSchema,
      auth: false,
    });
  }, []);

  const verifyToken = useCallback(
    async (token: string) => {
      const resp = await apiFetch('/api/v1/auth/verify', {
        method: 'POST',
        body: { token },
        zSchema: VerifyRespSchema,
        auth: false,
      });

      // Store first so subsequent requests attach Authorization.
      await setSession(resp.token, resp.expires_at);
      const parsed = parseJWT(resp.token);
      setState({ userId: parsed?.userId ?? null, email: parsed?.email ?? null, jwt: resp.token });

      // One-time migration attempt per app boot after first sign-in.
      if (!migratedRef.current) {
        migratedRef.current = true;
        try {
          await apiFetch('/api/v1/bookmarks/migrate', {
            method: 'POST',
            zSchema: z.object({ migrated: z.number() }),
            auth: true,
          });
        } catch {
          // Best-effort migration; auth still succeeds.
        }
      }

      await queryClient.invalidateQueries();
      AccessibilityInfo.announceForAccessibility?.('Signed in');
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    await clearSession();
    setState({ userId: null, email: null, jwt: null });
    migratedRef.current = false;
    queryClient.clear();
    AccessibilityInfo.announceForAccessibility?.('Signed out');
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      userId: state.userId,
      email: state.email,
      isAuthenticated: !!state.userId,
      requestLink,
      verifyToken,
      signOut,
    }),
    [requestLink, signOut, state.email, state.userId, verifyToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth must be used within AuthProvider');
  return v;
}

function parseJWT(jwt: string): { userId: string; email: string | null } | null {
  const parts = jwt.split('.');
  if (parts.length < 2) return null;
  const payload = parts[1];
  try {
    const jsonStr = base64UrlDecode(payload);
    const obj = JSON.parse(jsonStr) as { sub?: string; email?: string };
    if (!obj.sub) return null;
    return { userId: obj.sub, email: obj.email ?? null };
  } catch {
    return null;
  }
}

function base64UrlDecode(input: string): string {
  const padLen = (4 - (input.length % 4)) % 4;
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padLen);
  // eslint-disable-next-line no-undef
  return globalThis.atob
    ? globalThis.atob(padded)
    : Buffer.from(padded, 'base64').toString('utf-8');
}
