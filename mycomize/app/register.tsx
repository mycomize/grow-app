import { useState } from 'react';
import { View, Text } from 'react-native';
import { useContext } from 'react';
import { AuthContext } from '~/lib/AuthContext';
import { Button, ActivityIndicator } from 'react-native';
import { TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SafeAreaView } from 'react-native';
import { Link } from 'expo-router';

export default function RegisterScreen() {
  const authState = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSignUp = async () => {
    setIsLoading(true);

    try {
      // register returns an error message or null on success
      const error = await authState.register(username, password);
      if (error) {
        setErrorMessage(error);
      }
      // register handles redirect to /login on success
    } catch (error) {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView>
        <View>
          <Text>Register Screen</Text>

          {errorMessage ? <Text>Error registering. Please try again</Text> : null}
          <View>
            <TextInput
              placeholder="Username"
              onChangeText={setUsername}
              value={username}
              autoCapitalize="none"
              editable={!isLoading}
            />
            <TextInput
              placeholder="Password"
              onChangeText={setPassword}
              value={password}
              secureTextEntry
              editable={!isLoading}
            />
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : (
            <Button title="Sign Up" onPress={handleSignUp} disabled={!username || !password} />
          )}

          <Text>Already have an account?</Text>
          <Link href="/login">
            <Text>Log in here</Text>
          </Link>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
