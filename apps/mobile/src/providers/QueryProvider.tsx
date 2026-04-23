import type { PropsWithChildren } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

const DAY_MS = 24 * 60 * 60 * 1000;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: DAY_MS,
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: {
    getItem: (key) => AsyncStorage.getItem(key),
    removeItem: (key) => AsyncStorage.removeItem(key),
    setItem: async (key, value) => {
      try {
        await AsyncStorage.setItem(key, value);
      } catch (e) {
        console.warn('query persistence failed', e);
      }
    },
  },
});

export function QueryProvider({ children }: PropsWithChildren) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: DAY_MS, buster: '0.1.0' }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
