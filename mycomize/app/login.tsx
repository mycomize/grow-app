import { Image } from '@/components/ui/image';
import { useState } from 'react';
import { View } from 'react-native';
import { useContext } from 'react';
import { AuthContext } from '~/lib/AuthContext';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { FormControl } from '@/components/ui/form-control';
import { Heading } from '@/components/ui/heading';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Center } from '@/components/ui/center';
import { VStack } from '@/components/ui/vstack';
import { EyeIcon, EyeOffIcon } from '@/components/ui/icon';
import { useRouter } from 'expo-router';
import { HStack } from '@/components/ui/hstack';
import { Link, LinkText } from '~/components/ui/link';
import mycomizeLogo from '~/assets/mycomize-blue-icon.png';

export default function LoginScreen() {
  const router = useRouter();
  const authState = useContext(AuthContext);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleShowState = () => {
    setShowPassword((show) => {
      return !show;
    });
  };

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
    <View className="mt-16 flex items-center gap-4">
      {errorMessage && <Text>{errorMessage}</Text>}
      <VStack space="xl">
        <Center>
          <Image size="xl" source={mycomizeLogo} className="mt-4" alt="logo" resizeMode="contain" />
        </Center>
        <FormControl className="mt-16 rounded-lg border border-outline-300 p-4">
          <VStack space="xl">
            <Heading className="text-typography-900">Login</Heading>
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
                />
              </Input>
            </VStack>
            <VStack space="xs">
              <Text className="text-typography-700">Password</Text>
              <Input className="text-center">
                <InputField
                  type={showPassword ? 'text' : 'password'}
                  autoCapitalize="none"
                  onChangeText={setPassword}
                  value={password}
                />
                <InputSlot className="pr-3" onPress={handleShowState}>
                  <InputIcon as={showPassword ? EyeIcon : EyeOffIcon} />
                </InputSlot>
              </Input>
            </VStack>
            <Button
              className="mx-auto"
              action="positive"
              onPress={handleLogin}
              isDisabled={isLoading}>
              <ButtonText className="text-typography-0">Log In</ButtonText>
            </Button>
          </VStack>
        </FormControl>
      </VStack>
      <Link className="mt-10" onPress={() => router.replace('/register')}>
        <HStack>
          <Text>Need an account? </Text>
          <LinkText className="text-success-300">Sign Up</LinkText>
        </HStack>
      </Link>
    </View>
  );
}
