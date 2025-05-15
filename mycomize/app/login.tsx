import { Image } from '@/components/ui/image';
import { useState } from 'react';
import { View } from 'react-native';
import { Box } from '@/components/ui/box';
import { useContext } from 'react';
import { AuthContext } from '~/lib/AuthContext';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { FormControl } from '@/components/ui/form-control';
import { Heading } from '@/components/ui/heading';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Center } from '@/components/ui/center';
import { VStack } from '@/components/ui/vstack';
import { useRouter } from 'expo-router';
import { HStack } from '@/components/ui/hstack';
import { Link, LinkText } from '~/components/ui/link';
import { EyeIcon, EyeOffIcon } from 'lucide-react-native';
import MycomizeLogo from '@/assets/mycomize-logo.svg';

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
    <Box className="h-full w-full flex-1 bg-background-200">
      <View className="mt-36 flex items-center gap-4">
        {errorMessage && <Text className="text-error-500">{errorMessage}</Text>}
        <VStack space="xl">
          <Center>
            <MycomizeLogo width={111} height={131} />
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
                    <InputIcon as={showPassword ? EyeIcon : EyeOffIcon} size="lg" />
                  </InputSlot>
                </Input>
              </VStack>
              <Button
                className="mx-auto"
                action="positive"
                onPress={handleLogin}
                isDisabled={isLoading}>
                <ButtonText className="text-typography-700">Log In</ButtonText>
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
    </Box>
  );
}
