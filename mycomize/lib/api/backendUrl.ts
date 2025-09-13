import { Platform } from 'react-native';
import Constants from 'expo-constants';

export function getBackendUrl(): string | null {
  // Get backend URL from environment variable or Expo config
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  const configUrl = Constants.expoConfig?.extra?.backendUrl;
  
  // Priority: environment variable > config > fallback
  const backendUrl = envUrl || configUrl || 'http://localhost:8000';
  
  if (Platform.OS === 'web') {
    return backendUrl;
  } else if (Platform.OS === 'android') {
    return backendUrl;
  } else if (Platform.OS === 'ios') {
    return backendUrl;
  }
  
  return backendUrl;
}
