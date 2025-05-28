import { useState, useContext } from 'react';
import { View } from 'react-native';
import { ScrollView } from '@/components/ui/scroll-view';
import { Box } from '@/components/ui/box';
import { Button, ButtonText } from '@/components/ui/button';
import { FormControl } from '@/components/ui/form-control';
import { Heading } from '@/components/ui/heading';
import { Center } from '@/components/ui/center';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { useToast, Toast, ToastTitle, ToastDescription } from '@/components/ui/toast';
import { useRouter } from 'expo-router';
import { CircleX, CheckCircle, ArrowLeft } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';

import { AuthContext } from '@/lib/AuthContext';
import { getBackendUrl } from '@/lib/backendUrl';
import { PasswordInput } from '@/components/ui/password-input';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const toast = useToast();
  const { token } = useContext(AuthContext);

  const [toastId, setToastId] = useState(0);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleConfirmPassword = (text: string) => {
    setConfirmPassword(text);
    setPasswordsMatch(text === newPassword);
  };

  const handleNewPassword = (text: string) => {
    setNewPassword(text);
    if (confirmPassword && text !== confirmPassword) {
      setPasswordsMatch(false);
    } else if (confirmPassword && text === confirmPassword) {
      setPasswordsMatch(true);
    }
  };

  const handleChangePassword = async () => {
    setIsLoading(true);
    setErrorMessage('');

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage('All fields are required');
      handleErrorToast();
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match');
      handleErrorToast();
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long');
      handleErrorToast();
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${getBackendUrl()}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (response.ok) {
        handleSuccessToast();
        // Clear form
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordsMatch(false);
        // Navigate back after a short delay
        setTimeout(() => {
          router.back();
        }, 2000);
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.detail || 'Failed to change password');
        handleErrorToast();
      }
    } catch (error) {
      setErrorMessage('Network error. Please try again.');
      handleErrorToast();
    } finally {
      setIsLoading(false);
    }
  };

  const handleErrorToast = () => {
    if (!toast.isActive('error-toast-' + toastId)) {
      showNewErrorToast();
    }
  };

  const handleSuccessToast = () => {
    const newId = Math.random();
    setToastId(newId);

    toast.show({
      id: 'success-toast-' + newId,
      placement: 'top',
      duration: 3000,
      render: ({ id }) => {
        return (
          <Toast
            action="success"
            variant="outline"
            className="mx-auto mt-20 flex w-[90%] max-w-[95%] justify-between gap-6 border-success-500 p-4 shadow-hard-5">
            <VStack space="xs" className="w-full">
              <HStack className="flex-row gap-2">
                <Icon as={CheckCircle} className="mt-0.5 stroke-success-500"></Icon>
                <ToastTitle className="font-semibold text-success-700">Success</ToastTitle>
              </HStack>
              <ToastDescription className="flex-wrap break-words text-typography-700">
                Password changed successfully!
              </ToastDescription>
            </VStack>
          </Toast>
        );
      },
    });
  };

  const showNewErrorToast = () => {
    const newId = Math.random();
    setToastId(newId);

    toast.show({
      id: 'error-toast-' + newId,
      placement: 'top',
      duration: 3000,
      render: ({ id }) => {
        return (
          <Toast
            action="error"
            variant="outline"
            className="mx-auto mt-20 flex w-[90%] max-w-[95%] justify-between gap-6 border-error-500 p-4 shadow-hard-5">
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
    <Box className="h-full w-full flex-1 bg-background-50">
      <ScrollView>
        <View className="mt-16 flex items-center">
          <VStack space="xl" className="w-full max-w-[350px] ">
            <FormControl className="rounded-lg border border-outline-300 p-4">
              <VStack space="xl">
                <VStack space="xs">
                  <Text className="text-typography-700">Current Password</Text>
                  <PasswordInput
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Enter current password"
                    autoFocus={true}
                    onFocus={() => setConfirmFocused(false)}
                  />
                </VStack>

                <VStack space="xs">
                  <Text className="text-typography-700">New Password</Text>
                  <PasswordInput
                    value={newPassword}
                    onChangeText={handleNewPassword}
                    placeholder="Enter new password"
                    onFocus={() => setConfirmFocused(false)}
                  />
                </VStack>

                <VStack space="xs">
                  <Text className="text-typography-700">Confirm New Password</Text>
                  <PasswordInput
                    value={confirmPassword}
                    onChangeText={handleConfirmPassword}
                    placeholder="Confirm new password"
                    isInvalid={!passwordsMatch && confirmFocused}
                    onFocus={() => setConfirmFocused(true)}
                  />
                </VStack>

                <VStack space="md">
                  <Button
                    className="mx-auto w-11/12"
                    action="positive"
                    onPress={handleChangePassword}
                    isDisabled={
                      isLoading ||
                      !passwordsMatch ||
                      !currentPassword ||
                      !newPassword ||
                      !confirmPassword
                    }>
                    <ButtonText className="text-white">
                      {isLoading ? 'Updating...' : 'Change Password'}
                    </ButtonText>
                  </Button>

                  <Button
                    variant="outline"
                    className="mx-auto w-11/12 border-success-400"
                    onPress={() => router.back()}
                    isDisabled={isLoading}>
                    <ButtonText className="text-typography-700">Cancel</ButtonText>
                  </Button>
                </VStack>
              </VStack>
            </FormControl>
          </VStack>
        </View>
      </ScrollView>
    </Box>
  );
}
