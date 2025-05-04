import { useState } from 'react';
import { View, Text } from 'react-native';
import { useContext } from 'react';
import { AuthContext } from '~/lib/AuthContext';
import { ActivityIndicator } from 'react-native';
import { Button } from '~/components/Button';
import { Link } from 'expo-router';
import { TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native';

export default function LoginScreen() {
  const authState = useContext(AuthContext);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      // signIn returns an error message or null on success
      const error = await authState.signIn(username, password);
      if (error) {
        setErrorMessage(error);
      }
      // signIn handles redirect to / on success
    } catch (error) {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView>
        <View className="mt-16 flex items-center gap-4">
          <Text className="mt-12">Log In Screen</Text>

          {errorMessage && <Text>{errorMessage}</Text>}

          <View>
            <TextInput
              placeholder="Username"
              onChangeText={setUsername}
              value={username}
              autoCapitalize="none"
              editable={!isLoading}
              className="rounded-lg border-2 border-gray-400"
            />
            <TextInput
              placeholder="Password"
              onChangeText={setPassword}
              value={password}
              secureTextEntry
              editable={!isLoading}
              className="rounded-lg border-2 border-gray-400"
            />
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : (
            <Button onPress={handleLogin} disabled={!username || !password} title="Log In" />
          )}

          <Text>Need an account?</Text>
          <Link href="/register">
            <Text>Sign up now</Text>
          </Link>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
