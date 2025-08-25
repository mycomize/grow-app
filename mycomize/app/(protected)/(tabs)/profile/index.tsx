import { Button, ButtonText } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Switch } from '@/components/ui/switch';
import { Icon } from '@/components/ui/icon';
import { Pressable } from '@/components/ui/pressable';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { useToast, Toast } from '@/components/ui/toast';

import { AuthContext } from '~/lib/api/AuthContext';
import { useTheme } from '@/components/ui/themeprovider/themeprovider';
import { apiClient, isUnauthorizedError } from '~/lib/api/ApiClient';
import { useContext, useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { getSwitchColors } from '@/lib/switchUtils';
import * as ImagePicker from 'expo-image-picker';
import { cacheProfileImage } from '@/lib/imageCache';

import { ChevronRight, Camera, AlertCircle, CheckCircle } from 'lucide-react-native';

// Function to decode JWT token and extract username
function getUsernameFromToken(token: string | null | undefined): string {
  if (!token) return 'User';

  try {
    // JWT tokens have 3 parts separated by dots: header.payload.signature
    const payload = token.split('.')[1];
    if (!payload) return 'User';

    // Decode base64 payload
    const decodedPayload = JSON.parse(atob(payload));
    return decodedPayload.sub || decodedPayload.username || 'User';
  } catch (error) {
    console.error('Error decoding token:', error);
    return 'User';
  }
}

export default function ProfileScreen() {
  const { signOut, token } = useContext(AuthContext);
  const { theme, toggleTheme } = useTheme();
  const { trackFalse, trackTrue, thumbColor } = getSwitchColors(theme);
  const [darkModeEnabled, setDarkModeEnabled] = useState(theme === 'dark');
  const [username, setUsername] = useState('User');
  const [userId, setUserId] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const router = useRouter();
  const toast = useToast();

  // Load user profile data
  const loadUserProfile = async () => {
    if (!token) return;

    try {
      const userData = await apiClient.get('/auth/me', token);
      setUsername(userData.username);
      setUserId(userData.id?.toString());
      setProfileImage(userData.profile_image);
    } catch (error) {
      if (isUnauthorizedError(error as Error)) {
        router.replace('/login');
        return;
      }
      console.error('Error loading user profile:', error);
    }
  };

  useEffect(() => {
    loadUserProfile();
  }, [token]);

  const handleDarkModeToggle = () => {
    setDarkModeEnabled((prev) => !prev);
    toggleTheme();
  };

  const navigateToChangePassword = () => {
    router.push('/profile/change-password');
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

  // Handle profile image upload
  const handleImageUpload = async () => {
    try {
      // Request permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        showToast('Permission to access camera roll is required!', 'error');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setIsUploadingImage(true);

        if (!token) {
          showToast('Authentication required', 'error');
          return;
        }

        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;

        // Upload to backend
        const userData = await apiClient.put(
          '/auth/profile-image',
          {
            profile_image: base64Image,
          },
          token
        );

        setProfileImage(userData.profile_image);

        // Cache the updated image
        if (userId && userData.profile_image) {
          await cacheProfileImage(userId, userData.profile_image);
        }

        showToast('Profile image updated successfully!', 'success');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      showToast('Failed to update profile image', 'error');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Get the first two letters of username for avatar fallback
  const getAvatarFallback = (name: string) => {
    return name.length >= 2 ? name.substring(0, 2).toUpperCase() : name.toUpperCase();
  };

  return (
    <>
      <Text className="bg-background-50 pl-6 pt-10" size="2xl">
        @{username}
      </Text>
      <VStack className="flex-1 items-center gap-3 bg-background-50 py-3">
        {/* Avatar and Username Section */}
        <VStack className="items-center gap-3 py-4">
          <View className="relative">
            <Avatar size="2xl">
              {profileImage ? (
                <AvatarImage source={{ uri: profileImage }} />
              ) : (
                <AvatarFallbackText>{getAvatarFallback(username)}</AvatarFallbackText>
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

        {/* Display card */}
        <Card className="w-11/12 bg-background-0">
          <Heading className="mb-3 text-typography-400">DISPLAY</Heading>
          <HStack className="flex w-full flex-row">
            <Text className="text-lg">Dark mode</Text>
            <Switch
              trackColor={{ false: trackFalse, true: trackTrue }}
              thumbColor={thumbColor}
              ios_backgroundColor={trackFalse}
              className="ml-auto"
              size="md"
              value={darkModeEnabled}
              onToggle={handleDarkModeToggle}
            />
          </HStack>
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
    </>
  );
}
