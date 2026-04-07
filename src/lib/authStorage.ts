import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Sur le web, AsyncStorage (RN) peut bloquer indéfiniment avec Supabase Auth
 * (spinner Connexion qui ne se termine jamais). localStorage évite ce bug.
 */
const webStorage = {
  getItem(key: string): Promise<string | null> {
    try {
      if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
        return Promise.resolve(null);
      }
      return Promise.resolve(
        (globalThis as unknown as { localStorage: Storage }).localStorage.getItem(key)
      );
    } catch {
      return Promise.resolve(null);
    }
  },
  setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
        (globalThis as unknown as { localStorage: Storage }).localStorage.setItem(key, value);
      }
    } catch {
      /* quota / private mode */
    }
    return Promise.resolve();
  },
  removeItem(key: string): Promise<void> {
    try {
      if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
        (globalThis as unknown as { localStorage: Storage }).localStorage.removeItem(key);
      }
    } catch {
      /* */
    }
    return Promise.resolve();
  },
};

export const authStorage = Platform.OS === 'web' ? webStorage : AsyncStorage;
