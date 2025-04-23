import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Define API URL based on platform
const API_URL = Platform.select({
  web: 'http://localhost:8000',
  default: 'http://10.0.2.2:8000', // For Android emulator
});

type AuthContextType = {
  isLoading: boolean;
  isSignedIn: boolean;
  username: string | null;
  token: string | null;
  error: string | null;
  signIn: (username: string, password: string) => Promise<void>;
  signUp: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token storage key
const TOKEN_KEY = 'mycomize-auth-token';
const USERNAME_KEY = 'mycomize-username';

// Auth provider props
type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state
  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        const storedUsername = await SecureStore.getItemAsync(USERNAME_KEY);

        if (storedToken && storedUsername) {
          setToken(storedToken);
          setUsername(storedUsername);
          setIsSignedIn(true);
        }
      } catch (e) {
        console.error('Failed to load auth token', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadToken();
  }, []);

  // Save token to secure storage
  const saveToken = async (token: string, username: string) => {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(USERNAME_KEY, username);
    } catch (e) {
      console.error('Failed to save auth token', e);
    }
  };

  // Remove token from secure storage
  const removeToken = async () => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USERNAME_KEY);
    } catch (e) {
      console.error('Failed to remove auth token', e);
    }
  };

  // Sign in
  const signIn = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      const response = await fetch(`${API_URL}/auth/token`, {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json',
          // Don't set Content-Type for FormData
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to sign in');
      }

      // Set auth state
      setToken(data.access_token);
      setUsername(username);
      setIsSignedIn(true);

      // Save token
      await saveToken(data.access_token, username);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred');
      console.error('Sign in error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // Sign up
  const signUp = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to sign up');
      }

      // After successful registration, sign in
      await signIn(username, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred');
      console.error('Sign up error:', e);
      setIsLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    setIsSignedIn(false);
    setToken(null);
    setUsername(null);
    await removeToken();
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    isLoading,
    isSignedIn,
    username,
    token,
    error,
    signIn,
    signUp,
    signOut,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Auth hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
