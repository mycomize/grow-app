import { use, createContext, type PropsWithChildren } from 'react';
import { useStorageState } from '~/lib/useStorageState';
import { useRouter } from 'expo-router';
import { getBackendUrl } from '~/lib/backendUrl';

type AuthState = {
  register: (username: string, password: string) => Promise<string | null>;
  signIn: (username: string, password: string) => Promise<string | null>;
  signOut: () => Promise<string | null>;
  token?: string | null;
  isTokenLoading: boolean;
};

const BACKEND_URL = getBackendUrl();

export const AuthContext = createContext<AuthState>({
  register: async () => null,
  signIn: async () => null,
  signOut: async () => null,
  token: null,
  isTokenLoading: false,
});

export function useAuthSession() {
  const value = use(AuthContext);

  if (value) {
    throw new Error('useSession must be used within an AuthProvider');
  }

  return value;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [[isTokenLoading, token], setToken] = useStorageState('auth-token');
  const router = useRouter();
  const url = `${BACKEND_URL}/auth`;

  const signIn = async (username: string, password: string) => {
    try {
      console.log(`Attempting to sign in user: ${username} to URL: ${url}/token`);

      // The token endpoint expects form data in a specific format for OAuth2PasswordRequestForm
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      // OAuth2 form might expect these too
      formData.append('grant_type', 'password');
      formData.append('scope', '');
      formData.append('client_id', '');
      formData.append('client_secret', '');

      console.log(`Form data: ${formData.toString()}`);

      const response = await fetch(`${url}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: formData.toString(),
      });

      console.log(`Response status: ${response.status}`);

      const responseData = await response.json();

      if (!response.ok) {
        // Handle specific FastAPI HTTPExceptions based on status codes
        if (response.status === 401) {
          return 'Invalid username or password. Please try again.';
        } else {
          return 'Authentication failed. Please try again.';
        }
      }

      // Store the JWT token and set user as logged in
      setToken(responseData.access_token);

      // Navigate to the home page
      router.replace('/');
      return null; // No error
    } catch (error) {
      console.error('Failed to sign in: ', error);
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
      const response = await fetch(`${url}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Handle specific FastAPI HTTPExceptions based on status codes
        if (response.status === 400 && responseData.detail === 'Username already registered') {
          return 'This username is already taken. Please choose another one.';
        } else {
          return 'Registration failed. Please try again.';
        }
      }

      router.replace('/login');
      return null; // No error
    } catch (error) {
      console.error('Failed to register user: ', error);
      return 'Network error. Please check your connection and try again.';
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
