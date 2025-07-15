import { useState } from 'react';
import { View } from 'react-native';
import { ScrollView } from '@/components/ui/scroll-view';
import { Box } from '@/components/ui/box';
import { useContext } from 'react';
import { AuthContext } from '~/lib/AuthContext';
import { Button, ButtonIcon, ButtonText } from '~/components/ui/button';
import { FormControl } from '@/components/ui/form-control';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Center } from '@/components/ui/center';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Image } from '@/components/ui/image';
import { Link, LinkText } from '@/components/ui/link';
import { Text } from '~/components/ui/text';
import { useToast, Toast, ToastTitle, ToastDescription } from '@/components/ui/toast';
import { useRouter } from 'expo-router';
import { CircleX, UserPlus, LogIn } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';

import MycomizeLogo from '~/assets/mycomize-logo.svg';

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
      placement: 'top',
      duration: 3000,
      render: ({ id }) => {
        return (
          <Toast variant="outline" className="mx-auto mt-36 w-full bg-background-0 p-4">
            <VStack space="xs" className="w-full">
              <HStack className="flex-row gap-2">
                <Icon as={CircleX} className="mt-0.5 stroke-error-500 " />
                <ToastTitle className="font-semibold text-error-500 ">Error</ToastTitle>
              </HStack>
              <ToastDescription className="text-typography-200 ">{errorMessage}</ToastDescription>
            </VStack>
          </Toast>
        );
      },
    });
  };

  return (
    <Box className="h-full w-full flex-1 bg-background-50">
      <ScrollView>
        <View className="mt-36 flex items-center gap-4">
          <VStack space="xl">
            <Center>
              <MycomizeLogo width={111} height={131} />
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
