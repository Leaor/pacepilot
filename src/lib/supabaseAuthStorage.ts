import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

type SupabaseAuthStorage = {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
};

function createMemoryStorage(): SupabaseAuthStorage {
  const store = new Map<string, string>();

  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    }
  };
}

function createWebStorage(): SupabaseAuthStorage {
  if (typeof globalThis.localStorage === "undefined") {
    return createMemoryStorage();
  }

  return {
    getItem: (key) => globalThis.localStorage.getItem(key),
    setItem: (key, value) => {
      globalThis.localStorage.setItem(key, value);
    },
    removeItem: (key) => {
      globalThis.localStorage.removeItem(key);
    }
  };
}

function createSecureStoreStorage(): SupabaseAuthStorage {
  return {
    getItem: (key) => SecureStore.getItemAsync(key),
    setItem: (key, value) => SecureStore.setItemAsync(key, value),
    removeItem: (key) => SecureStore.deleteItemAsync(key)
  };
}

export const supabaseAuthStorage: SupabaseAuthStorage = Platform.OS === "web"
  ? createWebStorage()
  : createSecureStoreStorage();
