import { useState } from 'react';
import { View, Text } from 'react-native';
import { useContext } from 'react';
import { AuthContext } from '~/lib/AuthContext';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { FormControl } from '@/components/ui/form-control';
import { Heading } from '@/components/ui/heading';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { Center } from '@/components/ui/center';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import mycomizeLogo from '~/assets/mycomize-blue-icon.png';
import { Image } from '@/components/ui/image';
import { Link, LinkText } from '~/components/ui/link';
import { useRouter } from 'expo-router';

export default function RegisterScreen() {
  const router = useRouter();
  const authState = useContext(AuthContext);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleConfirmPassword = (text: string) => {
    setConfirmPassword(text);

    if (text === password) {
      setPasswordsMatch(true);
    } else {
      setPasswordsMatch(false);
    }
  };

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
    <View className="mt-16 flex items-center gap-4">
      {errorMessage && <Text>{errorMessage}</Text>}
      <VStack space="xl">
        <Center>
          <Image size="xl" source={mycomizeLogo} className="mt-4" alt="logo" resizeMode="contain" />
        </Center>
        <FormControl className="mt-16 rounded-lg border border-outline-300 p-4">
          <VStack space="xl">
            <Heading className="text-typography-900">Register</Heading>
            <VStack space="xs">
              <Text className="text-typography-700">Username</Text>
              <Input className="min-w-[250px]">
                <InputField
                  type="text"
                  autoCapitalize="none"
                  autoComplete="username"
                  autoCorrect={false}
                  autoFocus={true}
                  onChangeText={setUsername}
                  value={username}
                  onFocus={() => setConfirmFocused(false)}
                />
              </Input>
            </VStack>
            <VStack space="xs">
              <Text className="text-typography-700">Password</Text>
              <Input className="text-center">
                <InputField
                  type="password"
                  autoCapitalize="none"
                  onChangeText={setPassword}
                  value={password}
                  secureTextEntry={true}
                  onFocus={() => setConfirmFocused(false)}
                />
              </Input>
            </VStack>
            <VStack space="xs">
              <Text className="text-typography-700">Confirm Password</Text>
              <Input className="text-center" isInvalid={!passwordsMatch && confirmFocused}>
                <InputField
                  type="password"
                  autoCapitalize="none"
                  onChangeText={handleConfirmPassword}
                  value={confirmPassword}
                  secureTextEntry={true}
                  onFocus={() => setConfirmFocused(true)}
                />
              </Input>
            </VStack>
            <Button
              className="mx-auto"
              action="positive"
              onPress={handleSignUp}
              isDisabled={isLoading}>
              <ButtonText className="text-typography-0">Sign Up</ButtonText>
            </Button>
          </VStack>
        </FormControl>
      </VStack>
      <Link className="mt-10" onPress={() => router.replace('/login')}>
        <HStack>
          <Text>Already have an account? </Text>
          <LinkText className="text-success-300">Log In</LinkText>
        </HStack>
      </Link>
    </View>
  );
}
