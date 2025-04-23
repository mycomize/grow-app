import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../context/auth';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, error, isLoading, isSignedIn, clearError } = useAuth();
  const router = useRouter();

  // Watch for sign-in state changes and redirect when signed in
  React.useEffect(() => {
    if (isSignedIn) {
      router.replace('/(tabs)/grows');
    }
  }, [isSignedIn, router]);

  const handleLogin = async () => {
    if (username.trim() === '' || password === '') {
      return;
    }

    clearError();
    try {
      await signIn(username, password);
      // The effect above will handle navigation when isSignedIn becomes true
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-white px-4 dark:bg-gray-900">
      <View className="w-full max-w-sm space-y-4">
        <Text className="mb-6 text-center text-3xl font-bold text-black dark:text-white">
          Mycomize Grow
        </Text>

        <View className="space-y-2">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">Username</Text>
          <TextInput
            className="h-12 w-full rounded-md border border-gray-300 bg-white px-4 text-black dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Enter your username"
            placeholderTextColor="#9CA3AF"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoComplete="username"
            testID="username-input"
          />
        </View>

        <View className="space-y-2">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</Text>
          <TextInput
            className="h-12 w-full rounded-md border border-gray-300 bg-white px-4 text-black dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Enter your password"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            testID="password-input"
          />
        </View>

        {error && <Text className="text-center text-sm text-red-500">{error}</Text>}

        <TouchableOpacity
          className="flex h-12 w-full items-center justify-center rounded-md bg-blue-600"
          onPress={handleLogin}
          disabled={isLoading}
          testID="login-button">
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="font-medium text-white">Sign In</Text>
          )}
        </TouchableOpacity>

        <View className="mt-4 flex-row justify-center">
          <Text className="text-gray-600 dark:text-gray-400">Don't have an account? </Text>
          <Link href="./register" asChild>
            <TouchableOpacity>
              <Text className="font-medium text-blue-600 dark:text-blue-400">Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </View>
  );
}
