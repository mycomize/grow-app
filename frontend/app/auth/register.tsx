import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../context/auth';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const { signUp, error, isLoading, isSignedIn, clearError } = useAuth();
  const router = useRouter();

  const validateForm = () => {
    let isValid = true;
    clearError();
    setPasswordError('');
    setUsernameError('');

    if (username.trim().length < 3) {
      setUsernameError('Username must be at least 3 characters');
      isValid = false;
    }

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      isValid = false;
    }

    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      isValid = false;
    }

    return isValid;
  };

  // Watch for sign-in state changes and redirect when signed in
  React.useEffect(() => {
    if (isSignedIn) {
      router.replace('/(tabs)/grows');
    }
  }, [isSignedIn, router]);

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await signUp(username, password);
      // The effect above will handle navigation when isSignedIn becomes true
    } catch (err) {
      console.error('Registration error:', err);
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-white px-4 dark:bg-gray-900">
      <View className="w-full max-w-sm space-y-4">
        <Text className="mb-6 text-center text-3xl font-bold text-black dark:text-white">
          Create Account
        </Text>

        <View className="space-y-2">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">Username</Text>
          <TextInput
            className="h-12 w-full rounded-md border border-gray-300 bg-white px-4 text-black dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Choose a username"
            placeholderTextColor="#9CA3AF"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoComplete="username"
            testID="username-input"
          />
          {usernameError ? <Text className="text-sm text-red-500">{usernameError}</Text> : null}
        </View>

        <View className="space-y-2">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</Text>
          <TextInput
            className="h-12 w-full rounded-md border border-gray-300 bg-white px-4 text-black dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Create a password"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            testID="password-input"
          />
        </View>

        <View className="space-y-2">
          <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Confirm Password
          </Text>
          <TextInput
            className="h-12 w-full rounded-md border border-gray-300 bg-white px-4 text-black dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            placeholder="Confirm your password"
            placeholderTextColor="#9CA3AF"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoComplete="new-password"
            testID="confirm-password-input"
          />
          {passwordError ? <Text className="text-sm text-red-500">{passwordError}</Text> : null}
        </View>

        {error && <Text className="text-center text-sm text-red-500">{error}</Text>}

        <TouchableOpacity
          className="flex h-12 w-full items-center justify-center rounded-md bg-blue-600"
          onPress={handleRegister}
          disabled={isLoading}
          testID="register-button">
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="font-medium text-white">Create Account</Text>
          )}
        </TouchableOpacity>

        <View className="mt-4 flex-row justify-center">
          <Text className="text-gray-600 dark:text-gray-400">Already have an account? </Text>
          <Link href="./login" asChild>
            <TouchableOpacity>
              <Text className="font-medium text-blue-600 dark:text-blue-400">Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </View>
  );
}
