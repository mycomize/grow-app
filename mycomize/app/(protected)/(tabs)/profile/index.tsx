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
import { Input, InputField } from '@/components/ui/input';

import { useAuthToken, useSignOut } from '~/lib/stores/authEncryptionStore';
import { useTheme } from '@/components/ui/themeprovider/themeprovider';
import { apiClient, isUnauthorizedError } from '~/lib/api/ApiClient';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { getSwitchColors } from '@/lib/switchUtils';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { cacheProfileImage } from '@/lib/imageCache';
import { useUnifiedToast } from '~/components/ui/unified-toast';
import { updateStateUpdatePreferences, getEntityStateUpdateCadenceMinutes } from '~/lib/userPreferences';
import EntityStateUpdateManager from '~/lib/iot/entityStateUpdateManager';

import { ChevronRight, Camera, AlertCircle, CheckCircle, Settings } from 'lucide-react-native';

// Image processing constants
const MAX_IMAGE_SIZE_MB = 2;
const TARGET_IMAGE_WIDTH = 200;
const TARGET_IMAGE_HEIGHT = 200;
const COMPRESSION_QUALITY = 0.5;

// Image processing utility functions
const calculateImageSize = (base64: string): number => {
  // Remove data URL prefix to get pure base64
  const base64Data = base64.split(',')[1] || base64;
  // Calculate size: base64 is ~4/3 the size of original binary
  const sizeInBytes = (base64Data.length * 3) / 4;
  const sizeInMB = sizeInBytes / (1024 * 1024);
  return sizeInMB;
};

const resizeImageIfNeeded = async (uri: string): Promise<string> => {
  console.log('[Image Processing] Checking if resize needed...');
  
  // Get image info to check dimensions
  const imageInfo = await ImageManipulator.manipulateAsync(uri, [], { format: ImageManipulator.SaveFormat.JPEG });
  
  console.log(`[Image Processing] Original dimensions: ${imageInfo.width}x${imageInfo.height}`);
  
  if (imageInfo.width <= TARGET_IMAGE_WIDTH && imageInfo.height <= TARGET_IMAGE_HEIGHT) {
    console.log('[Image Processing] Image already within size limits, no resize needed');
    return uri;
  }
  
  // Calculate scaling to fit within target dimensions while maintaining aspect ratio
  const scaleX = TARGET_IMAGE_WIDTH / imageInfo.width;
  const scaleY = TARGET_IMAGE_HEIGHT / imageInfo.height;
  const scale = Math.min(scaleX, scaleY);
  
  const newWidth = Math.round(imageInfo.width * scale);
  const newHeight = Math.round(imageInfo.height * scale);
  
  console.log(`[Image Processing] Resizing to: ${newWidth}x${newHeight} (scale: ${scale.toFixed(3)})`);
  
  const resizedImage = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: newWidth, height: newHeight } }],
    { format: ImageManipulator.SaveFormat.JPEG, compress: 1 }
  );
  
  console.log(`[Image Processing] Resize complete: ${resizedImage.width}x${resizedImage.height}`);
  return resizedImage.uri;
};

const compressImage = async (uri: string): Promise<string> => {
  console.log(`[Image Processing] Compressing image with quality: ${COMPRESSION_QUALITY}`);
  
  const compressedImage = await ImageManipulator.manipulateAsync(
    uri,
    [],
    { 
      format: ImageManipulator.SaveFormat.JPEG, 
      compress: COMPRESSION_QUALITY 
    }
  );
  
  console.log('[Image Processing] Compression complete');
  return compressedImage.uri;
};

const processImageForUpload = async (uri: string): Promise<{ compressed: string; uncompressed: string } | null> => {
  try {
    console.log('[Image Processing] Starting image processing pipeline...');
    
    // Step 1: Resize if needed
    const resizedUri = await resizeImageIfNeeded(uri);
    
    // Step 2: Compress the image
    const compressedUri = await compressImage(resizedUri);
    
    // Step 3: Get base64 for size calculation and upload
    const compressedResult = await ImageManipulator.manipulateAsync(
      compressedUri,
      [],
      { format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    
    if (!compressedResult.base64) {
      throw new Error('Failed to generate base64 for compressed image');
    }
    
    // Step 4: Check size
    const compressedSizeMB = calculateImageSize(compressedResult.base64);
    console.log(`[Image Processing] Compressed image size: ${compressedSizeMB.toFixed(2)}MB`);
    
    if (compressedSizeMB > MAX_IMAGE_SIZE_MB) {
      console.log(`[Image Processing] FAILED: Compressed image size (${compressedSizeMB.toFixed(2)}MB) exceeds limit (${MAX_IMAGE_SIZE_MB}MB)`);
      return null;
    }
    
    // Step 5: Get uncompressed version for local caching
    const uncompressedResult = await ImageManipulator.manipulateAsync(
      resizedUri,
      [],
      { format: ImageManipulator.SaveFormat.JPEG, base64: true, compress: 1 }
    );
    
    if (!uncompressedResult.base64) {
      throw new Error('Failed to generate base64 for uncompressed image');
    }
    
    const uncompressedSizeMB = calculateImageSize(uncompressedResult.base64);
    console.log(`[Image Processing] Uncompressed image size: ${uncompressedSizeMB.toFixed(2)}MB`);
    console.log(`[Image Processing] Size reduction: ${((uncompressedSizeMB - compressedSizeMB) / uncompressedSizeMB * 100).toFixed(1)}%`);
    
    const compressedBase64 = `data:image/jpeg;base64,${compressedResult.base64}`;
    const uncompressedBase64 = `data:image/jpeg;base64,${uncompressedResult.base64}`;
    
    console.log('[Image Processing] Processing pipeline complete');
    return {
      compressed: compressedBase64,
      uncompressed: uncompressedBase64
    };
    
  } catch (error) {
    console.error('[Image Processing] Error in processing pipeline:', error);
    throw error;
  }
};

export default function ProfileScreen() {
  const token = useAuthToken();
  const signOut = useSignOut();
  const { theme, toggleTheme } = useTheme();
  const { trackFalse, trackTrue, thumbColor } = getSwitchColors(theme);
  const [darkModeEnabled, setDarkModeEnabled] = useState(theme === 'dark');
  const [username, setUsername] = useState('User');
  const [userId, setUserId] = useState<string | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [cadenceMinutes, setCadenceMinutes] = useState<number>(1);
  const [cadenceInputValue, setCadenceInputValue] = useState<string>('1');
  const [isUpdatingCadence, setIsUpdatingCadence] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const unifiedToast = useUnifiedToast();

  // Load user profile data
  const loadUserProfile = async () => {
    if (!token) return;

    try {
      const userData = await apiClient.get('/auth/me', token, 'User'); // Decrypt response using User schema

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
    loadUserProfile();
    loadCadencePreference();
  }, [token]);

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

  // Handle profile image upload with enhanced processing
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

        if (!token) {
          unifiedToast.showError('Authentication required');
          return;
        }

        console.log(`[Image Processing] Selected image URI: ${result.assets[0].uri}`);
        
        // Calculate original image size for logging
        const originalResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [],
          { format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        
        if (originalResult.base64) {
          const originalSizeMB = calculateImageSize(originalResult.base64);
          console.log(`[Image Processing] Original image size: ${originalSizeMB.toFixed(2)}MB`);
        }

        // Process the image through our pipeline
        const processedImages = await processImageForUpload(result.assets[0].uri);
        
        if (!processedImages) {
          // Image was too large even after compression
          unifiedToast.showError(
            `Image is too large. Please select a smaller image or reduce quality.`,
            'Image Size Error',
            `Maximum allowed size is ${MAX_IMAGE_SIZE_MB}MB after compression.`
          );
          return;
        }

        // Upload compressed version to backend with encryption
        const userData = await apiClient.put(
          '/auth/profile-image',
          {
            profile_image: processedImages.compressed,
          },
          token,
          'User', // Encrypt request data using User schema
          'User'  // Decrypt response data using User schema
        );

        // Update local state with the response from backend (which contains compressed image)
        setProfileImage(userData.profile_image);

        // Cache uncompressed version locally for fast display
        if (userId) {
          await cacheProfileImage(userId, processedImages.uncompressed);
          console.log('[Image Processing] Cached uncompressed version locally');
        }

        unifiedToast.showSuccess('Profile image updated successfully!');
      }
    } catch (error) {
      if (isUnauthorizedError(error as Error)) {
        router.replace('/login');
        return;
      }

      console.error('[Image Processing] Error uploading image:', error);
      unifiedToast.showError('Failed to update profile image');
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
