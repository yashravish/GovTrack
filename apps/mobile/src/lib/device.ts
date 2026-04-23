import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const KEY = 'govtrack:deviceId';

export async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(KEY);
  if (existing) return existing;

  const id = Crypto.randomUUID();
  try {
    await AsyncStorage.setItem(KEY, id);
  } catch (e) {
    // persistence best-effort
    console.warn('deviceId persistence failed', e);
  }
  return id;
}
