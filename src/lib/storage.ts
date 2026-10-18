import AsyncStorage from '@react-native-async-storage/async-storage';

/** Best-effort persistence: never throws, falls back to defaults. */
export async function load<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function save(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore — prototype
  }
}
