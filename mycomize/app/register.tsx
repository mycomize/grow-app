import { useState } from 'react';
import { View } from 'react-native';
import { useContext } from 'react';
import { AuthContext } from '~/lib/AuthContext';
import { Button, ButtonText } from '~/components/ui/button';
import { FormControl } from '@/components/ui/form-control';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { Center } from '@/components/ui/center';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Image } from '@/components/ui/image';
import { Link, LinkText } from '~/components/ui/link';
import { Text } from '~/components/ui/text';
import { useToast, Toast, ToastTitle, ToastDescription } from '@/components/ui/toast';
import { useRouter } from 'expo-router';
import { CircleX } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';

import mycomizeLogo from '~/assets/mycomize-blue-icon.png';

export default function SignUpScreen() {
  const router = useRouter();
  const toast = useToast();

  const authState = useContext(AuthContext);
  const [toastId, setToastId] = useState(0);

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
        handleErrorToast();
      }

      // register handles redirect to /login on success
    } catch (error) {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleErrorToast = () => {
    if (!toast.isActive('toast-' + toastId)) {
      showNewErrorToast();
    }
  };

  const showNewErrorToast = () => {
    const newId = Math.random();
    setToastId(newId);

    toast.show({
      id: 'toast-' + newId,
      placement: 'bottom',
      duration: 3000,
      render: ({ id }) => {
        return (
          <Toast
            action="error"
            variant="outline"
            className="mx-auto mb-20 flex w-[90%] max-w-[95%] justify-between gap-6 border-error-500 p-4 shadow-hard-5">
            <VStack space="xs" className="w-full">
              <HStack className="flex-row gap-2">
                <Icon as={CircleX} className="mt-0.5 stroke-error-500"></Icon>
                <ToastTitle className="font-semibold text-error-700">Error</ToastTitle>
              </HStack>
              <ToastDescription className="flex-wrap break-words text-typography-700">
                {errorMessage}
              </ToastDescription>
            </VStack>
          </Toast>
        );
      },
    });
  };

  return (
    <View className="mt-16 flex items-center gap-4">
      <VStack space="xl">
        <Center>
          <Image size="xl" source={mycomizeLogo} className="mt-4" alt="logo" resizeMode="contain" />
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
