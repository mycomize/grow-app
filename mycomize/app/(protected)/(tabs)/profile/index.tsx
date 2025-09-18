import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { useToast, Toast } from '@/components/ui/toast';
import { Input, InputField } from '@/components/ui/input';

import { useCurrentUser, useSignOut } from '~/lib/stores/authStore';
import { useProfileImage, useAvatarFallback, useUpdateProfileImage } from '~/lib/stores/profileStore';
import { useTheme } from '@/components/ui/themeprovider/themeprovider';
import { isUnauthorizedError } from '~/lib/api/ApiClient';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useUnifiedToast } from '~/components/ui/unified-toast';
import { updateStateUpdatePreferences, getEntityStateUpdateCadenceMinutes } from '~/lib/userPreferences';
import EntityStateUpdateManager from '~/lib/iot/entityStateUpdateManager';
import { ConfirmationModal } from '~/components/modals/ConfirmationModal';
import { deleteUser } from '~/lib/db/authDb';
import { clearUserAuthPreferences } from '~/lib/auth/authPreferences';

import { ChevronRight, Camera, AlertCircle, CheckCircle, Trash2 } from 'lucide-react-native';

export default function ProfileScreen() {
  const currentUser = useCurrentUser();
  const signOut = useSignOut();
  const profileImage = useProfileImage();
  const avatarFallback = useAvatarFallback();
  const updateProfileImage = useUpdateProfileImage();
  const { theme } = useTheme();
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [cadenceMinutes, setCadenceMinutes] = useState<number>(1);
  const [cadenceInputValue, setCadenceInputValue] = useState<string>('1');
  const [isUpdatingCadence, setIsUpdatingCadence] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const unifiedToast = useUnifiedToast();

  // Load current cadence preference
  const loadCadencePreference = async () => {
    try {
      const currentCadence = await getEntityStateUpdateCadenceMinutes();
      setCadenceMinutes(currentCadence);
      setCadenceInputValue(currentCadence.toString());
    } catch (error) {
      console.error('Error loading cadence preference:', error);
      setCadenceMinutes(1); // Default fallback
      setCadenceInputValue('1');
    }
  };

  useEffect(() => {
    loadCadencePreference();
  }, []);

  // Handle cadence input change and validation
  const handleCadenceInputChange = (value: string) => {
    setCadenceInputValue(value);
  };

  // Handle cadence preference change with clamping (1-720 minutes = 1-12 hours)
  const handleCadenceBlur = async () => {
    const inputNumber = parseInt(cadenceInputValue, 10);
    
    if (isNaN(inputNumber)) {
      // Invalid input, reset to current value
      setCadenceInputValue(cadenceMinutes.toString());
      return;
    }
    
    // Clamp value between 1 and 720 minutes (12 hours)
    const clampedValue = Math.max(1, Math.min(720, inputNumber));
    
    if (clampedValue === cadenceMinutes) {
      // No change needed, just update input display
      setCadenceInputValue(clampedValue.toString());
      return;
    }
    
    setIsUpdatingCadence(true);
    try {
      // Update preferences storage
      await updateStateUpdatePreferences({
        entityStateUpdateCadenceMinutes: clampedValue,
      });
      
      // Update the EntityStateUpdateManager
      await EntityStateUpdateManager.updateUserCadenceSetting(clampedValue);
      
      setCadenceMinutes(clampedValue);
      setCadenceInputValue(clampedValue.toString());
      
      const hours = Math.floor(clampedValue / 60);
      const minutes = clampedValue % 60;
      let timeDisplay = '';
      
      if (hours > 0) {
        timeDisplay += `${hours} hour${hours === 1 ? '' : 's'}`;
        if (minutes > 0) {
          timeDisplay += ` ${minutes} minute${minutes === 1 ? '' : 's'}`;
        }
      } else {
        timeDisplay = `${minutes} minute${minutes === 1 ? '' : 's'}`;
      }
      
      showToast(`Home Assistant update interval set to ${timeDisplay}`, 'success');
    } catch (error) {
      console.error('Error updating cadence preference:', error);
      showToast('Failed to update Home Assistant preferences', 'error');
      setCadenceInputValue(cadenceMinutes.toString()); // Reset on error
    } finally {
      setIsUpdatingCadence(false);
    }
  };

  const navigateToChangePassword = () => {
    router.push('/profile/change-password');
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (!currentUser) {
      unifiedToast.showError('No user session found');
      return;
    }

    setIsDeletingAccount(true);

    try {
      const userId = parseInt(currentUser.id);
      
      // Clear user preferences from secure store
      await clearUserAuthPreferences(currentUser.id);
      
      // Delete user from auth database
      await deleteUser(userId);
      
      // Clear any cached data and sign out
      await signOut();
      
      unifiedToast.showSuccess('Account deleted successfully');
      
      // Navigate to login
      router.replace('/login');
      
    } catch (error) {
      console.error('Error deleting account:', error);
      unifiedToast.showError('Failed to delete account. Please try again.');
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteModal(false);
    }
  };

  // Toast functions
  const showToast = (message: string, type: 'error' | 'success') => {
    const toastId = Math.random().toString();
    const bgColor = 'bg-background-0';
    const textColor =
      type === 'error'
        ? theme === 'dark'
          ? 'text-error-600'
          : 'text-error-700'
        : theme === 'dark'
          ? 'text-green-600'
          : 'text-green-700';
    const descColor = 'text-typography-300';

    toast.show({
      id: `${type}-toast-${toastId}`,
      placement: 'top',
      duration: 3000,
      render: () => (
        <Toast variant="outline" className={`mx-auto mt-36 w-full p-4 ${bgColor}`}>
          <VStack space="xs" className="w-full">
            <HStack className="flex-row gap-2">
              <Icon
                as={type === 'error' ? AlertCircle : CheckCircle}
                className={`mt-0.5 ${textColor}`}
              />
              <Text className={`font-semibold ${textColor}`}>
                {type === 'error' ? 'Error' : 'Success'}
              </Text>
            </HStack>
            <Text className={descColor}>{message}</Text>
          </VStack>
        </Toast>
      ),
    });
  };

  // Handle profile image upload using the profile store
  const handleImageUpload = async () => {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        unifiedToast.showError('Permission to access camera roll is required!');
        return;
      }

      // Launch image picker with square cropping
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        aspect: [1, 1], // Force square aspect ratio
        quality: 1,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        setIsUploadingImage(true);

        if (!currentUser) {
          unifiedToast.showError('Authentication required');
          return;
        }

        // Use the profile store to update the image (assuming it handles auth internally)
        await updateProfileImage(currentUser.id, result.assets[0].uri);
        unifiedToast.showSuccess('Profile image updated successfully!');
      }
    } catch (error) {
      if (isUnauthorizedError(error as Error)) {
        router.replace('/login');
        return;
      }

      console.error('[Profile] Error uploading image:', error);
      
      // Handle specific error messages from the store
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('Image is too large')) {
        unifiedToast.showError(
          errorMessage,
          'Image Size Error'
        );
      } else {
        unifiedToast.showError('Failed to update profile image');
      }
    } finally {
      setIsUploadingImage(false);
    }
  };

  if (!currentUser) {
    return (
      <View className="flex-1 items-center justify-center bg-background-50">
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <>
      <Text className="bg-background-50 pl-6 pt-10" size="2xl">
        @{currentUser.username}
      </Text>
      <VStack className="flex-1 items-center gap-3 bg-background-50 py-3">
        {/* Avatar and Username Section */}
        <VStack className="items-center gap-3 py-4">
          <View className="relative">
            <Avatar size="2xl">
              {profileImage ? (
                <AvatarImage source={{ uri: profileImage }} />
              ) : (
                <AvatarFallbackText>{avatarFallback}</AvatarFallbackText>
              )}
            </Avatar>
            <Pressable
              onPress={handleImageUpload}
              disabled={isUploadingImage}
              className="absolute -bottom-1 -right-1 h-8 w-8 items-center justify-center rounded-full bg-success-400">
              <Icon
                as={Camera}
                size="sm"
                className={isUploadingImage ? 'text-primary-300' : 'text-white'}
              />
            </Pressable>
          </View>
        </VStack>

        {/* Account card */}
        <Card className="w-11/12 bg-background-0">
          <Heading className="mb-3 text-typography-400">ACCOUNT</Heading>
          <Pressable onPress={navigateToChangePassword}>
            <HStack className="flex w-full flex-row items-center py-2">
              <Text className="text-lg">Change password</Text>
              <Icon className="ml-auto h-6 w-6 text-typography-500" as={ChevronRight} />
            </HStack>
          </Pressable>
        </Card>

        {/* Home Assistant Preferences card */}
        <Card className="w-11/12 bg-background-0">
          <Heading className="mb-3 text-typography-400">IOT GATEWAY</Heading>
          <VStack className="gap-4">
            <VStack className="gap-2">
              <HStack className="flex w-full flex-row items-center justify-between">
                <HStack className="flex flex-row items-center gap-3">
                  <Text className="text-lg flex-1">State Update Interval</Text>
                  <Input size="md" className="w-24">
                    <InputField
                      placeholder="1-720"
                      value={cadenceInputValue}
                      onChangeText={handleCadenceInputChange}
                      onBlur={handleCadenceBlur}
                      keyboardType="numeric"
                      editable={!isUpdatingCadence}
                      textAlign="center"
                    />
                  </Input>
                  <Text className="text-sm text-typography-500">
                    minutes
                  </Text>
                </HStack>
              </HStack>
            </VStack>
          </VStack>
        </Card>

        {/* DANGER ZONE card */}
        <Card className="w-11/12 bg-background-0 border-error-300">
          <Heading className="mb-3 text-error-600">DANGER ZONE</Heading>
          <Pressable 
            onPress={() => setShowDeleteModal(true)}
            disabled={isDeletingAccount}
          >
            <HStack className="flex w-full flex-row items-center py-2">
              <VStack className="flex-1">
                <Text className="text-lg text-typography-600">Delete Account</Text>
                <Text className="text-sm text-typography-500">
                  Permanently delete your account and all associated data
                </Text>
              </VStack>
              <Icon className="mr-3 text-typography-400" as={Trash2} size="md" />
            </HStack>
          </Pressable>
        </Card>

        {/* Sign out button */}
        <View className="flex-1" />
        <Button
          className="w-11/12 bg-error-500"
          onPress={() => {
            signOut();
          }}>
          <ButtonText className="text-white">Sign Out</ButtonText>
        </Button>
      </VStack>

      {/* Delete Account Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        type="delete"
        title="Delete Account"
        message="Are you sure you want to permanently delete your account? This action cannot be undone and will permanently delete all data."
        itemName={currentUser?.username || 'your account'}
        confirmText={isDeletingAccount ? "Deleting..." : "Delete"}
        cancelText="Cancel"
      />
    </>
  );
}
