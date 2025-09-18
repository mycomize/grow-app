import * as LocalAuthentication from 'expo-local-authentication';

/**
 * Biometric Authentication Utility
 * 
 * Handles biometric authentication using expo-local-authentication.
 * Provides device capability checking and secure biometric authentication.
 */

export interface BiometricCapabilities {
  isAvailable: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
  hasHardware: boolean;
  isEnrolled: boolean;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  cancelled?: boolean;
}

/**
 * Check device biometric capabilities
 */
export const getBiometricCapabilities = async (): Promise<BiometricCapabilities> => {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    const capabilities: BiometricCapabilities = {
      isAvailable: hasHardware && isEnrolled,
      supportedTypes,
      hasHardware,
      isEnrolled,
    };

    console.log('[BiometricAuth] Device capabilities:', capabilities);
    return capabilities;

  } catch (error) {
    console.error('[BiometricAuth] Error checking capabilities:', error);
    return {
      isAvailable: false,
      supportedTypes: [],
      hasHardware: false,
      isEnrolled: false,
    };
  }
};

/**
 * Check if biometric authentication is available on the device
 */
export const isBiometricAvailable = async (): Promise<boolean> => {
  const capabilities = await getBiometricCapabilities();
  return capabilities.isAvailable;
};

/**
 * Get a user-friendly description of available biometric types
 */
export const getBiometricTypeDescription = (types: LocalAuthentication.AuthenticationType[]): string => {
  if (types.length === 0) return 'Biometric authentication';

  const descriptions = types.map(type => {
    switch (type) {
      case LocalAuthentication.AuthenticationType.FINGERPRINT:
        return 'Fingerprint';
      case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
        return 'Face ID';
      case LocalAuthentication.AuthenticationType.IRIS:
        return 'Iris';
      default:
        return 'Biometric';
    }
  });

  if (descriptions.length === 1) {
    return descriptions[0];
  } else if (descriptions.length === 2) {
    return descriptions.join(' or ');
  } else {
    return descriptions.slice(0, -1).join(', ') + ', or ' + descriptions.slice(-1);
  }
};

/**
 * Authenticate using biometrics
 */
export const authenticateWithBiometrics = async (
  reason: string = 'Authenticate to access your account'
): Promise<BiometricAuthResult> => {
  console.log('[BiometricAuth] Starting biometric authentication');

  try {
    // Check if biometrics are available
    const capabilities = await getBiometricCapabilities();
    
    if (!capabilities.isAvailable) {
      const error = !capabilities.hasHardware 
        ? 'Biometric authentication is not available on this device'
        : 'No biometric authentication is enrolled on this device';
      
      console.log('[BiometricAuth] Biometric authentication not available:', error);
      return { success: false, error };
    }

    // Attempt authentication
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: 'Use Password',
      fallbackLabel: 'Use Password',
      disableDeviceFallback: true, // We'll handle our own password fallback
    });

    if (result.success) {
      console.log('[BiometricAuth] Biometric authentication successful');
      return { success: true };
    } else {
      console.log('[BiometricAuth] Biometric authentication failed:', result.error);
      
      // Handle different error types
      let errorMessage = 'Biometric authentication failed';
      let cancelled = false;

      switch (result.error) {
        case 'user_cancel':
        case 'user_fallback':
        case 'app_cancel':
          cancelled = true;
          errorMessage = 'Biometric authentication was cancelled';
          break;
        case 'lockout':
          errorMessage = 'Too many failed attempts. Please try again later.';
          break;
        case 'not_available':
          errorMessage = 'Biometric authentication is not available';
          break;
        case 'not_enrolled':
          errorMessage = 'No biometric authentication is set up on this device';
          break;
        case 'passcode_not_set':
          errorMessage = 'Device passcode is not set up';
          break;
        default:
          errorMessage = 'Biometric authentication failed. Please try again.';
      }

      return { success: false, error: errorMessage, cancelled };
    }

  } catch (error) {
    console.error('[BiometricAuth] Error during biometric authentication:', error);
    return { 
      success: false, 
      error: 'An unexpected error occurred during biometric authentication' 
    };
  }
};

/**
 * Check if the user should be prompted to enable biometrics
 * (device supports it but user hasn't enabled it in preferences)
 */
export const shouldPromptForBiometricSetup = async (): Promise<boolean> => {
  const capabilities = await getBiometricCapabilities();
  return capabilities.isAvailable; // We can suggest enabling if hardware is available
};

/**
 * Get biometric authentication prompt text based on available types
 */
export const getBiometricPromptText = async (): Promise<string> => {
  const capabilities = await getBiometricCapabilities();
  const typeDescription = getBiometricTypeDescription(capabilities.supportedTypes);
  
  return `Use ${typeDescription} to access your account`;
};
