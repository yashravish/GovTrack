import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'govtrack:session';

type StoredSession = { jwt: string; expiresAt: string };

export async function getSession(): Promise<StoredSession | null> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export async function setSession(jwt: string, expiresAt: string) {
  const s: StoredSession = { jwt, expiresAt };
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(s));
  } catch (e) {
    console.warn('session persistence failed', e);
  }
}

export async function clearSession() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (e) {
    console.warn('session clear failed', e);
  }
}
