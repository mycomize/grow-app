import { useState } from 'react';
import { View } from 'react-native';
import { ScrollView } from '@/components/ui/scroll-view';
import { Box } from '@/components/ui/box';
import { Button, ButtonIcon, ButtonText } from '~/components/ui/button';
import { FormControl } from '@/components/ui/form-control';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Center } from '@/components/ui/center';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { useUnifiedToast } from '~/components/ui/unified-toast';
import { useRouter } from 'expo-router';
import { UserPlus, LogIn } from 'lucide-react-native';
import { useRegister, useIsAuthLoading } from '~/lib/stores/authEncryptionStore';

import OpenTekLogo from '~/assets/opentek-logo.svg';

export default function SignUpScreen() {
  const router = useRouter();
  const { showError } = useUnifiedToast();
  const register = useRegister();
  const isAuthLoading = useIsAuthLoading();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
      // The unified register function handles registration and redirect
      const result = await register(username, password);
      if (!result.success) {
        showError(result.error || 'Registration failed. Please try again.');
      }
      // If successful, the register function handles navigation automatically
    } catch (error) {
      console.error('Registration error:', error);
      showError('An unexpected error occurred. Please try again.');
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
            <FormControl className="mt-16 rounded-lg border border-outline-300 p-4">
              <VStack space="xl">
                <Heading className="text-typography-900">Sign Up</Heading>
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
                  <PasswordInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter password"
                    onFocus={() => setConfirmFocused(false)}
                    className="min-w-[250px]"
                  />
                </VStack>
                <VStack space="xs">
                  <Text className="text-typography-700">Confirm Password</Text>
                  <PasswordInput
                    value={confirmPassword}
                    onChangeText={handleConfirmPassword}
                    placeholder="Confirm password"
                    isInvalid={!passwordsMatch && confirmFocused}
                    onFocus={() => setConfirmFocused(true)}
                    className="min-w-[250px]"
                  />
                </VStack>
                <Button
                  className="mx-auto"
                  action="positive"
                  onPress={handleSignUp}
                  isDisabled={isLoading}>
                  <ButtonText className="text-white">Sign Up</ButtonText>
                  <ButtonIcon className="text-white" as={UserPlus} size="md" />
                </Button>
              </VStack>
            </FormControl>
          </VStack>
          <HStack className="my-8 items-center gap-4">
            <Text>Already have an account?</Text>
            <Button onPress={() => router.replace('/login')} variant="solid" action="positive">
              <ButtonText className="text-white">Login</ButtonText>
              <ButtonIcon className="text-white" as={LogIn} size="md" />
            </Button>
          </HStack>
        </View>
      </ScrollView>
    </Box>
  );
}
