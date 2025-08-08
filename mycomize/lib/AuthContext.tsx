import { use, createContext, type PropsWithChildren } from 'react';
import { useStorageState } from '~/lib/useStorageState';
import { useRouter } from 'expo-router';
import { apiClient } from '~/lib/ApiClient';

type AuthState = {
  register: (username: string, password: string) => Promise<string | null>;
  signIn: (username: string, password: string, skipRedirect?: boolean) => Promise<string | null>;
  signOut: () => Promise<string | null>;
  token?: string | null;
  isTokenLoading: boolean;
};

// Remove the constant since we'll use apiClient directly

export const AuthContext = createContext<AuthState>({
  register: async () => null,
  signIn: async () => null,
  signOut: async () => null,
  token: null,
  isTokenLoading: false,
});

export function useAuthSession() {
  const value = use(AuthContext);

  if (!value) {
    throw new Error('useSession must be used within an AuthProvider');
  }

  return value;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [[isTokenLoading, token], setToken] = useStorageState('auth-token');
  const router = useRouter();

  const signIn = async (username: string, password: string, skipRedirect?: boolean) => {
    try {
      console.log(`Attempting to sign in user: ${username}`);

      // The token endpoint expects form data in a specific format for OAuth2PasswordRequestForm
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      // OAuth2 form might expect these too
      formData.append('grant_type', 'password');
      formData.append('scope', '');
      formData.append('client_id', '');
      formData.append('client_secret', '');

      const responseData = await apiClient.call({
        endpoint: '/auth/token',
        config: {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          body: formData.toString(),
        },
      });

      // Store the JWT token and set user as logged in
      setToken(responseData.access_token);

      // Navigate to the home page (unless skipRedirect is true)
      if (!skipRedirect) {
        router.replace('/');
      }
      return null; // No error
    } catch (error) {
      console.error('Failed to sign in: ', error);
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('401') || errorMessage.toLowerCase().includes('unauthorized')) {
        return 'Invalid username or password. Please try again.';
      }
      return 'Network error. Please check your connection and try again.';
    }
  };

  const signOut = async () => {
    try {
      // Clear the token from storage
      setToken(null);

      // Navigate to the login page
      router.replace('/login');
      return null; // No error
    } catch (error) {
      console.error('Failed to sign out: ', error);
      return 'Error signing out. Please try again.';
    }
  };

  const register = async (username: string, password: string) => {
    try {
      await apiClient.call({
        endpoint: '/auth/register',
        config: {
          method: 'POST',
          body: { username, password },
        },
      });

      router.replace('/login');
      return null; // No error
    } catch (error) {
      const errorMessage = (error as Error).message;

      // Handle specific error cases
      if (
        errorMessage.includes('already registered') ||
        errorMessage.includes('Username already registered')
      ) {
        return 'This username is already taken. Please choose another one.';
      }

      // For validation errors, return the parsed message directly from ApiClient
      if (
        errorMessage.includes('Password must be at least') ||
        errorMessage.includes('Username must be at least') ||
        errorMessage.includes('characters long')
      ) {
        return errorMessage;
      }

      // Handle network/connection errors
      if (errorMessage === 'UNAUTHORIZED') {
        return 'Invalid credentials. Please try again.';
      }

      if (
        errorMessage.includes('fetch') ||
        errorMessage.includes('network') ||
        errorMessage === 'Request failed'
      ) {
        return 'Network error. Please check your connection and try again.';
      }

      // Log unexpected errors only (not validation errors)
      console.error('Unexpected registration error:', error);

      // Return the specific error message for other cases
      return errorMessage;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        register,
        signIn,
        signOut,
        token,
        isTokenLoading,
      }}>
      {children}
    </AuthContext.Provider>
  );
}
