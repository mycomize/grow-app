import { Platform } from 'react-native';

export function getBackendUrl() {
  if (Platform.OS === 'web') {
    return 'http://localhost:8000';
  } else if (Platform.OS === 'android') {
    return 'https://grow.mycomize.com';
  } else if (Platform.OS === 'ios') {
    console.warn('iOS is not supported yet');
    return null;
  }
}
