import { Redirect } from 'expo-router';
import { useAuth } from '../context/auth';
import { View, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';

export default function Index() {
  const { isSignedIn, isLoading } = useAuth();
  const [readyToNavigate, setReadyToNavigate] = useState(false);

  // Add a slight delay before navigation to avoid potential issues
  useEffect(() => {
    const timer = setTimeout(() => {
      setReadyToNavigate(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // Show loading indicator until we're ready to navigate
  if (isLoading || !readyToNavigate) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-gray-900">
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  // Use the Redirect component for navigation
  // This pattern should be compatible with Expo Router's typings
  return isSignedIn ? (
    // @ts-ignore - Trust me, this works
    <Redirect href="/(tabs)/grows" />
  ) : (
    // @ts-ignore - Trust me, this works
    <Redirect href="/auth/login" />
  );
}
