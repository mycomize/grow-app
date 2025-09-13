import { useUnifiedToast, UnifiedToastType } from '~/components/ui/unified-toast';

export interface StripeError {
  code?: string;
  declineCode?: string | null;
  localizedMessage?: string;
  message?: string;
  stripeErrorCode?: string;
  type?: string;
}

/**
 * Configuration for handling Stripe errors
 */
interface StripeErrorHandlerOptions {
  /**
   * Custom title for the error toast (optional)
   */
  title?: string;
  
  /**
   * Fallback message if localizedMessage is not available
   */
  fallbackMessage?: string;
  
  /**
   * Toast type - defaults to 'error'
   */
  toastType?: UnifiedToastType;
  
  /**
   * Additional description to show below the main message
   */
  description?: string;
}

/**
 * Extract user-friendly error message from Stripe error response
 */
export const extractStripeErrorMessage = (error: any): string => {
  // Handle Stripe error object format
  if (error && typeof error === 'object') {
    // First priority: localizedMessage from Stripe SDK
    if (error.localizedMessage && typeof error.localizedMessage === 'string') {
      return error.localizedMessage;
    }
    
    // Second priority: message field
    if (error.message && typeof error.message === 'string') {
      return error.message;
    }
    
    // Handle nested error objects
    if (error.error) {
      return extractStripeErrorMessage(error.error);
    }
    
    // Handle Stripe error response format from API
    if (error.code && error.stripeErrorCode) {
      return error.message || 'Payment processing failed';
    }
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }
  
  // Default fallback
  return 'An unexpected error occurred during payment processing';
};

/**
 * Check if error is from Stripe based on its structure
 */
export const isStripeError = (error: any): error is StripeError => {
  if (!error || typeof error !== 'object') {
    return false;
  }
  
  // Check for Stripe-specific fields
  return !!(
    error.localizedMessage ||
    error.stripeErrorCode ||
    error.type === 'card_error' ||
    error.type === 'validation_error' ||
    error.type === 'api_error'
  );
};

/**
 * Custom hook for handling Stripe errors with unified toast
 * This centralizes all Stripe error handling logic
 */
export const useStripeErrorHandler = () => {
  const { showError, showWarning } = useUnifiedToast();

  /**
   * Handle Stripe error and display appropriate toast message
   * @param error - The error object from Stripe
   * @param options - Configuration options for error handling
   * @returns The extracted error message
   */
  const handleStripeError = (
    error: any, 
    options: StripeErrorHandlerOptions = {}
  ): string => {
    const {
      title,
      fallbackMessage = 'An unexpected error occurred during payment processing',
      toastType = 'error',
      description,
    } = options;

    // Extract the user-friendly message
    const errorMessage = extractStripeErrorMessage(error) || fallbackMessage;
    
    // Show appropriate toast based on error type
    if (toastType === 'warning') {
      showWarning(errorMessage, title, description);
    } else {
      showError(errorMessage, title, description);
    }

    return errorMessage;
  };

  /**
   * Handle Stripe error with automatic processing state reset
   * @param error - The error object from Stripe
   * @param resetProcessingState - Function to reset processing states
   * @param options - Configuration options for error handling
   * @returns The extracted error message
   */
  const handleStripeErrorWithReset = (
    error: any,
    resetProcessingState: () => void,
    options: StripeErrorHandlerOptions = {}
  ): string => {
    // Handle the error and show toast
    const errorMessage = handleStripeError(error, options);
    
    // Reset processing state
    try {
      resetProcessingState();
    } catch (resetError) {
      console.error('[StripeErrorHandler] Failed to reset processing state:', resetError);
    }
    
    return errorMessage;
  };

  return {
    handleStripeError,
    handleStripeErrorWithReset,
    extractStripeErrorMessage,
    isStripeError,
  };
};

/**
 * Utility function for non-hook contexts to extract Stripe error messages
 * This can be used in contexts where hooks are not available (e.g., utility functions)
 */
export const getStripeErrorMessage = (error: any, fallback?: string): string => {
  return extractStripeErrorMessage(error) || fallback || 'Payment processing failed';
};
