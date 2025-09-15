import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { router } from 'expo-router';
import { apiClient, isUnauthorizedError } from '../api/ApiClient';
import * as ImageManipulator from 'expo-image-manipulator';

// Image processing constants
const MAX_IMAGE_SIZE_MB = 2;
const TARGET_IMAGE_WIDTH = 200;
const TARGET_IMAGE_HEIGHT = 200;
const COMPRESSION_QUALITY = 0.5;

// TypeScript interfaces
interface ProfileData {
  id: string;
  username: string;
  profile_image: string | null;
}

interface ProfileStore {
  // State
  profile: ProfileData | null;
  isLoading: boolean;
  hasInitiallyLoaded: boolean;
  
  // In-memory image cache for profile images
  imageCache: Map<string, string>;
  
  // Actions
  fetchProfile: (token: string) => Promise<void>;
  updateProfileImage: (token: string, imageUri: string) => Promise<boolean>;
  clearProfile: () => void;
  
  // Image cache management
  getCachedImage: (userId: string) => string | null;
  setCachedImage: (userId: string, imageData: string) => void;
  clearImageCache: () => void;
}

// Helper function to handle unauthorized errors consistently
const handleUnauthorizedError = (error: Error) => {
  if (isUnauthorizedError(error)) {
    router.replace('/login');
    throw error;
  }
};

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
  console.log('[ProfileStore] Checking if resize needed...');
  
  // Get image info to check dimensions
  const imageInfo = await ImageManipulator.manipulateAsync(uri, [], { format: ImageManipulator.SaveFormat.JPEG });
  
  console.log(`[ProfileStore] Original dimensions: ${imageInfo.width}x${imageInfo.height}`);
  
  if (imageInfo.width <= TARGET_IMAGE_WIDTH && imageInfo.height <= TARGET_IMAGE_HEIGHT) {
    console.log('[ProfileStore] Image already within size limits, no resize needed');
    return uri;
  }
  
  // Calculate scaling to fit within target dimensions while maintaining aspect ratio
  const scaleX = TARGET_IMAGE_WIDTH / imageInfo.width;
  const scaleY = TARGET_IMAGE_HEIGHT / imageInfo.height;
  const scale = Math.min(scaleX, scaleY);
  
  const newWidth = Math.round(imageInfo.width * scale);
  const newHeight = Math.round(imageInfo.height * scale);
  
  console.log(`[ProfileStore] Resizing to: ${newWidth}x${newHeight} (scale: ${scale.toFixed(3)})`);
  
  const resizedImage = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: newWidth, height: newHeight } }],
    { format: ImageManipulator.SaveFormat.JPEG, compress: 1 }
  );
  
  console.log(`[ProfileStore] Resize complete: ${resizedImage.width}x${resizedImage.height}`);
  return resizedImage.uri;
};

const compressImage = async (uri: string): Promise<string> => {
  console.log(`[ProfileStore] Compressing image with quality: ${COMPRESSION_QUALITY}`);
  
  const compressedImage = await ImageManipulator.manipulateAsync(
    uri,
    [],
    { 
      format: ImageManipulator.SaveFormat.JPEG, 
      compress: COMPRESSION_QUALITY 
    }
  );
  
  console.log('[ProfileStore] Compression complete');
  return compressedImage.uri;
};

const processImageForUpload = async (uri: string): Promise<{ compressed: string; uncompressed: string } | null> => {
  try {
    console.log('[ProfileStore] Starting image processing pipeline...');
    
    const resizedUri = await resizeImageIfNeeded(uri);
    const compressedUri = await compressImage(resizedUri);
    const compressedResult = await ImageManipulator.manipulateAsync(
      compressedUri,
      [],
      { format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    
    if (!compressedResult.base64) {
      throw new Error('Failed to generate base64 for compressed image');
    }
    
    const compressedSizeMB = calculateImageSize(compressedResult.base64);
    console.log(`[ProfileStore] Compressed image size: ${compressedSizeMB.toFixed(2)}MB`);
    
    if (compressedSizeMB > MAX_IMAGE_SIZE_MB) {
      console.log(`[ProfileStore] FAILED: Compressed image size (${compressedSizeMB.toFixed(2)}MB) exceeds limit (${MAX_IMAGE_SIZE_MB}MB)`);
      return null;
    }
    
    const uncompressedResult = await ImageManipulator.manipulateAsync(
      resizedUri,
      [],
      { format: ImageManipulator.SaveFormat.JPEG, base64: true, compress: 1 }
    );
    
    if (!uncompressedResult.base64) {
      throw new Error('Failed to generate base64 for uncompressed image');
    }
    
    const uncompressedSizeMB = calculateImageSize(uncompressedResult.base64);
    console.log(`[ProfileStore] Uncompressed image size: ${uncompressedSizeMB.toFixed(2)}MB`);
    console.log(`[ProfileStore] Size reduction: ${((uncompressedSizeMB - compressedSizeMB) / uncompressedSizeMB * 100).toFixed(1)}%`);
    
    const compressedBase64 = `data:image/jpeg;base64,${compressedResult.base64}`;
    const uncompressedBase64 = `data:image/jpeg;base64,${uncompressedResult.base64}`;
    
    console.log('[ProfileStore] Processing pipeline complete');
    return {
      compressed: compressedBase64,
      uncompressed: uncompressedBase64
    };
    
  } catch (error) {
    console.error('[ProfileStore] Error in processing pipeline:', error);
    throw error;
  }
};

export const useProfileStore = create<ProfileStore>((set, get) => ({
  // Initial state
  profile: null,
  isLoading: false,
  hasInitiallyLoaded: false,
  imageCache: new Map<string, string>(),

  // Fetch profile data
  fetchProfile: async (token: string) => {
    try {
      set({ isLoading: true });

      const userData = await apiClient.get('/auth/me', token, 'User'); // Decrypt response using User schema

      const profileData: ProfileData = {
        id: userData.id?.toString() || '',
        username: userData.username || '',
        profile_image: userData.profile_image || null,
      };

      set({
        profile: profileData,
        isLoading: false,
        hasInitiallyLoaded: true,
      });

      console.log('[ProfileStore] Profile data fetched successfully');
    } catch (error) {
      console.error('[ProfileStore] Error fetching profile:', error);
      set({ isLoading: false });
      handleUnauthorizedError(error as Error);
      throw error;
    }
  },

  // Update profile image
  updateProfileImage: async (token: string, imageUri: string) => {
    try {
      const { profile } = get();
      if (!profile) {
        throw new Error('No profile data available');
      }

      console.log(`[ProfileStore] Selected image URI: ${imageUri}`);
      
      // Calculate original image size for logging
      const originalResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [],
        { format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      
      if (originalResult.base64) {
        const originalSizeMB = calculateImageSize(originalResult.base64);
        console.log(`[ProfileStore] Original image size: ${originalSizeMB.toFixed(2)}MB`);
      }

      // Process the image through our pipeline
      const processedImages = await processImageForUpload(imageUri);
      
      if (!processedImages) {
        // Image was too large even after compression
        throw new Error(`Image is too large. Please select a smaller image or reduce quality. Maximum allowed size is ${MAX_IMAGE_SIZE_MB}MB after compression.`);
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

      // Update profile state with response from backend
      const updatedProfile: ProfileData = {
        ...profile,
        profile_image: userData.profile_image,
      };

      set({ profile: updatedProfile });

      // Cache uncompressed version locally for fast display
      get().setCachedImage(profile.id, processedImages.uncompressed);
      
      console.log('[ProfileStore] Profile image updated successfully and cached locally');
      return true;
    } catch (error) {
      console.error('[ProfileStore] Error updating profile image:', error);
      handleUnauthorizedError(error as Error);
      throw error;
    }
  },

  // Clear profile data
  clearProfile: () => {
    console.log('[ProfileStore] Clearing profile data');
    set({
      profile: null,
      isLoading: false,
      hasInitiallyLoaded: false,
    });
    get().clearImageCache();
  },

  // Get cached image for a user
  getCachedImage: (userId: string) => {
    const { imageCache } = get();
    return imageCache.get(userId) || null;
  },

  // Set cached image for a user
  setCachedImage: (userId: string, imageData: string) => {
    const { imageCache } = get();
    imageCache.set(userId, imageData);
    console.log(`[ProfileStore] Cached image for user: ${userId}`);
  },

  // Clear all cached images
  clearImageCache: () => {
    const { imageCache } = get();
    imageCache.clear();
    console.log('[ProfileStore] Cleared image cache');
  },
}));

// Optimized selector hooks using useShallow to prevent unnecessary re-renders

// Profile data selectors
export const useProfile = () => useProfileStore((state) => state.profile);
export const useProfileLoading = () => useProfileStore((state) => state.isLoading);
export const useHasProfileLoaded = () => useProfileStore((state) => state.hasInitiallyLoaded);

// Combined profile state selector
export const useProfileState = () =>
  useProfileStore(
    useShallow((state) => ({
      profile: state.profile,
      isLoading: state.isLoading,
      hasInitiallyLoaded: state.hasInitiallyLoaded,
    }))
  );

// Action selectors to prevent infinite loops
export const useFetchProfile = () => useProfileStore((state) => state.fetchProfile);
export const useUpdateProfileImage = () => useProfileStore((state) => state.updateProfileImage);
export const useClearProfile = () => useProfileStore((state) => state.clearProfile);

// Image cache selectors
export const useGetCachedImage = () => useProfileStore((state) => state.getCachedImage);
export const useSetCachedImage = () => useProfileStore((state) => state.setCachedImage);

// Helper hook to get profile image with fallback to cache
export const useProfileImage = () => {
  const profile = useProfile();
  const getCachedImage = useGetCachedImage();
  
  if (!profile) return null;
  
  // First try the cached version for better quality
  const cachedImage = getCachedImage(profile.id);
  if (cachedImage) {
    return cachedImage;
  }
  
  // Fallback to profile image from backend
  return profile.profile_image;
};

// Helper hook to get avatar fallback text
export const useAvatarFallback = () => {
  const profile = useProfile();
  
  if (!profile?.username) return '';
  
  return profile.username.length >= 2 
    ? profile.username.substring(0, 2).toUpperCase() 
    : profile.username.toUpperCase();
};
