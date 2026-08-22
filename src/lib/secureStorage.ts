import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const isWeb = Platform.OS === 'web';

export const secureStorage = {
  getItem: (key: string): Promise<string | null> => {
    if (isWeb) return AsyncStorage.getItem(key).catch(() => null);
    return SecureStore.getItemAsync(key).catch(() => null);
  },
  setItem: (key: string, value: string): Promise<void> => {
    if (isWeb) return AsyncStorage.setItem(key, value);
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string): Promise<void> => {
    if (isWeb) return AsyncStorage.removeItem(key);
    return SecureStore.deleteItemAsync(key);
  },
};
