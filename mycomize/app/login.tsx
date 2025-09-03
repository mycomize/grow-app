import { useState, useContext } from 'react';
import { View } from 'react-native';
import { ScrollView } from '@/components/ui/scroll-view';
import { Box } from '@/components/ui/box';
import { AuthContext } from '~/lib/api/AuthContext';
import { useEncryption } from '~/lib/crypto/EncryptionContext';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { FormControl } from '@/components/ui/form-control';
import { Heading } from '@/components/ui/heading';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Center } from '@/components/ui/center';
import { VStack } from '@/components/ui/vstack';
import { useRouter } from 'expo-router';
import { HStack } from '@/components/ui/hstack';
import { EyeIcon, EyeOffIcon, UserPlus, LogIn } from 'lucide-react-native';
import OpenTekLogo from '@/assets/opentek-logo.svg';

export default function LoginScreen() {
  const router = useRouter();
  const authState = useContext(AuthContext);
  const { isInitialized, checkEncryptionStatus } = useEncryption();

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
      // signIn returns an error message or null on success, skip redirect to check encryption
      const error = await authState.signIn(username, password, true);
      if (error) {
        setErrorMessage(error);
      } else {
        // Check encryption status after successful login
        await checkEncryptionStatus();

        // If encryption is not initialized, redirect to setup
        if (!isInitialized) {
          router.replace('/encryption-setup');
        } else {
          // If already initialized, go to home
          router.replace('/');
        }
      }
    } catch (error) {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box className="h-full w-full flex-1 bg-background-50">
      <ScrollView>
        <View className="mt-36 flex items-center gap-4">
          <VStack space="xl">
            <Center>
              <OpenTekLogo width={111} height={131} />
            </Center>
            {errorMessage && <Text className="mt-6 text-error-500">{errorMessage}</Text>}
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
                  <ButtonText className="text-white">Log In</ButtonText>
                  <ButtonIcon className="text-white" as={LogIn} size="md" />
                </Button>
              </VStack>
            </FormControl>
          </VStack>
          <HStack className="my-8 items-center gap-4">
            <Text>Need an account?</Text>
            <Button onPress={() => router.replace('/register')} variant="solid" action="positive">
              <ButtonText className="text-white">Sign Up</ButtonText>
              <ButtonIcon className="text-white" as={UserPlus} size="md" />
            </Button>
          </HStack>
        </View>
      </ScrollView>
    </Box>
  );
}
