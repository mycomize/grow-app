import { useEffect, useCallback, useReducer } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '~/lib/api/ApiClient';

type UseStateHook<T> = [[boolean, T | null], (value: T | null) => void];

// State is of the form [isLoading, valueToSave/Load]
function useAsyncState<T>(
  // Default initial value is [true (i.e. loading), null (i.e. no token)]
  initialValue: [boolean, T | null] = [true, null]
): UseStateHook<T> {
  return useReducer(
    (state: [boolean, T | null], value: T | null = null): [boolean, T | null] => [false, value],
    initialValue
  ) as UseStateHook<T>;
}

export async function setStorageItemAsync(key: string, value: string | null) {
  if (Platform.OS === 'web') {
    try {
      if (value === null) {
        await apiClient.call({
          endpoint: '/api/clear-cookie',
          config: {
            method: 'POST',
            body: { key },
          },
        });
      } else {
        await apiClient.call({
          endpoint: '/api/set-cookie',
          config: {
            method: 'POST',
            body: { key, value },
          },
        });
      }
    } catch (error) {
      console.error('Error setting/clearing cookie:', error);
    }
  } else {
    if (value === null) {
      await SecureStore.deleteItemAsync(key);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  }
}

export function useStorageState(key: string): UseStateHook<string> {
  const [state, setState] = useAsyncState<string>();

  useEffect(() => {
    if (Platform.OS === 'web') {
      apiClient
        .call({
          endpoint: `/api/get-cookie?key=${key}`,
          config: { method: 'GET' },
        })
        .then((data) => {
          setState(data.value);
        })
        .catch((error) => {
          console.error('Error fetching cookie:', error);
          setState(null);
        });
    } else {
      SecureStore.getItemAsync(key).then((value) => {
        setState(value);
      });
    }
  }, [key]);

  const setValue = useCallback(
    (value: string | null) => {
      setState(value);
      setStorageItemAsync(key, value);
    },
    [key]
  );

  return [state, setValue];
}
