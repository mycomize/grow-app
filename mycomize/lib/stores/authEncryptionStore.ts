import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { router } from 'expo-router';
import { apiClient } from '~/lib/api/ApiClient';
import { getEncryptionService } from '~/lib/crypto/EncryptionService';
import { UserContextManager } from '~/lib/utils/userContextManager';
import {
  AuthEncryptionState,
  AuthEncryptionActions,
  AuthEncryptionStore,
  User,
  AuthResponse,
  RegisterResponse,
} from '../types/authEncryptionTypes';
import { PaymentStatusResponse, PaymentSSEEvent, PaymentPlan } from '../types/paymentTypes';
import { paymentService } from '../services/PaymentService';
import { SSEService } from '../services/SSEService';
import { getStripeErrorMessage } from '../utils/stripeErrorHandler';

/**
 * Unified Zustand store for authentication and encryption state management.
 * This eliminates race conditions by providing a single source of truth.
 */
const useAuthEncryptionStore = create<AuthEncryptionStore>((set, get) => ({
  // Initial state
  token: null,
  currentUser: null,
  isAuthLoading: false,
  isEncryptionReady: false,
  isEncryptionLoading: false,
  needsEncryptionSetup: false,
  needsPayment: false,
  isPaymentLoading: false,
  isInitializing: false,

  // Payment Flow State
  paymentFlowStep: 'plan-selection',
  showPaymentConfirmation: false,
  selectedPaymentMethod: null,
  selectedPlan: null,
  availablePlans: [],
  paymentIntentData: null,
  priceData: null,
  stripePublishableKey: '',

  // Payment Processing State
  isPaymentProcessing: false,
  isPaymentSubmitting: false,
  paymentConfirmationCode: null,
  paymentFlowError: null,

  // SSE State
  sseConnectionState: {
    isConnected: false,
    isConnecting: false,
  },
  sseService: null,

  // Utility function to extract user ID from JWT token
  getUserIdFromToken: (token: string): string | null => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || payload.user_id || null;
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  },

  // Authentication actions
  signIn: async (username: string, password: string) => {
    console.log(`[AuthEncryptionStore] Starting sign in for user: ${username}`);
    set({ isAuthLoading: true, isInitializing: true });

    try {
      // Prepare OAuth2 form data
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      formData.append('grant_type', 'password');
      formData.append('scope', '');
      formData.append('client_id', '');
      formData.append('client_secret', '');

      // Call login API
      const loginResponse = await apiClient.call({
        endpoint: '/auth/token',
        config: {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          body: formData.toString(),
        },
      });

      const token = loginResponse.access_token;
      
      // Get user info with the new token
      const userResponse = await apiClient.call({
        endpoint: '/auth/me',
        config: {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            Accept: 'application/json',
          },
        },
      });

      // Create user object - ensure ID is a string for SecureStore compatibility
      const user: User = {
        id: String(userResponse.id),
        username: userResponse.username,
        hasEncryptionKey: false, // Will be determined by checkUserEncryptionStatus
        encryptionInitialized: false,
        paymentStatus: 'unpaid', // Default status, will be updated by checkPaymentStatus
      };
      
      const userId = user.id;

      // Store auth state
      set({
        token,
        currentUser: user,
        isAuthLoading: false,
      });

      // Store user auth data and current user ID
      await UserContextManager.storeUserAuthState(userId, { token, user: userResponse });
      await UserContextManager.storeCurrentUserId(userId);

      // Check encryption status for this user (this is the single place this happens)
      await get().checkUserEncryptionStatus(userId);

      // Check payment status for this user
      await get().checkPaymentStatus();

      console.log(`[AuthEncryptionStore] Sign in completed successfully for user: ${username}`);
      set({ isInitializing: false });

      // Navigate based on what's needed: payment first, then encryption, then main app
      const state = get();
      if (state.needsPayment || state.currentUser?.paymentStatus === 'unpaid') {
        router.replace('/payment-setup');
      } else if (state.needsEncryptionSetup) {
        router.replace('/encryption-setup');
      } else {
        router.replace('/');
      }

      return { success: true };

    } catch (error: any) {
      set({
        isAuthLoading: false,
        isInitializing: false,
        token: null,
        currentUser: null,
      });

      const errorMessage = error.message;
      if (errorMessage.includes('401') || errorMessage.toLowerCase().includes('unauthorized')) {
        return { success: false, error: 'Invalid username or password. Please try again.' };
      }
      return { success: false, error: 'Network error. Please check your connection and try again.' };
    }
  },

  signOut: async () => {
    console.log('[AuthEncryptionStore] Starting sign out');
    const { currentUser } = get();

    try {
      // Disconnect SSE service
      get().disconnectPaymentSSE();

      // Clear encryption service state
      const encryptionService = getEncryptionService();
      encryptionService.clearKeys();

      // Clear store state including payment flow state
      set({
        token: null,
        currentUser: null,
        isAuthLoading: false,
        isEncryptionReady: false,
        isEncryptionLoading: false,
        needsEncryptionSetup: false,
        needsPayment: false,
        isPaymentLoading: false,
        isInitializing: false,
        // Reset payment flow state
        paymentFlowStep: 'plan-selection',
        showPaymentConfirmation: false,
        selectedPaymentMethod: null,
        paymentIntentData: null,
        priceData: null,
        stripePublishableKey: '',
        isPaymentProcessing: false,
        isPaymentSubmitting: false,
        paymentConfirmationCode: null,
        paymentFlowError: null,
        // Reset SSE state
        sseConnectionState: {
          isConnected: false,
          isConnecting: false,
        },
        sseService: null,
      });

      // Clear user context data
      await UserContextManager.performLogoutCleanup(currentUser?.id);

      // Navigate to login
      router.replace('/login');
      console.log('[AuthEncryptionStore] Sign out completed successfully');

    } catch (error) {
      console.error('[AuthEncryptionStore] Error during sign out:', error);
      throw error;
    }
  },

  register: async (username: string, password: string) => {
    console.log(`[AuthEncryptionStore] Starting registration for user: ${username}`);
    set({ isAuthLoading: true });

    try {
      await apiClient.call({
        endpoint: '/auth/register',
        config: {
          method: 'POST',
          body: { username, password },
        },
      });

      set({ isAuthLoading: false });
      router.replace('/login');
      return { success: true };

    } catch (error: any) {
      console.error('[AuthEncryptionStore] Registration failed:', error);
      set({ isAuthLoading: false });

      const errorMessage = error.message;

      // Handle specific error cases
      if (
        errorMessage.includes('already registered') ||
        errorMessage.includes('Username already registered')
      ) {
        return { success: false, error: 'This username is already taken. Please choose another one.' };
      }

      if (
        errorMessage.includes('Password must be at least') ||
        errorMessage.includes('Username must be at least') ||
        errorMessage.includes('characters long')
      ) {
        return { success: false, error: errorMessage };
      }

      if (errorMessage === 'UNAUTHORIZED') {
        return { success: false, error: 'Invalid credentials. Please try again.' };
      }

      if (
        errorMessage.includes('fetch') ||
        errorMessage.includes('network') ||
        errorMessage === 'Request failed'
      ) {
        return { success: false, error: 'Network error. Please check your connection and try again.' };
      }

      return { success: false, error: errorMessage };
    }
  },

  // Encryption actions
  initializeEncryption: async (seedWords: string[], password?: string) => {
    console.log('[AuthEncryptionStore] Starting encryption initialization');
    const { currentUser } = get();

    if (!currentUser) {
      console.error('[AuthEncryptionStore] No current user for encryption initialization');
      return false;
    }

    set({ isEncryptionLoading: true });

    try {
      const encryptionService = getEncryptionService();
      const success = await encryptionService.initializeEncryption(
        currentUser.id,
        seedWords,
        password
      );

      if (success) {
        // Update user and state
        const updatedUser: User = {
          ...currentUser,
          hasEncryptionKey: true,
          encryptionInitialized: true,
        };

        set({
          currentUser: updatedUser,
          isEncryptionReady: true,
          isEncryptionLoading: false,
          needsEncryptionSetup: false,
        });

        // Update stored user data
        const authState = await UserContextManager.loadUserAuthState(currentUser.id);
        if (authState) {
          await UserContextManager.storeUserAuthState(currentUser.id, {
            ...authState,
            user: { ...authState.user, hasEncryptionKey: true, encryptionInitialized: true },
          });
        }

        console.log('[AuthEncryptionStore] Encryption initialization successful');
        return true;
      }

      set({ isEncryptionLoading: false });
      return false;

    } catch (error) {
      console.error('[AuthEncryptionStore] Encryption initialization failed:', error);
      set({ isEncryptionLoading: false });
      return false;
    }
  },

  checkUserEncryptionStatus: async (userId: string) => {
    console.log(`[AuthEncryptionStore] Checking encryption status for user: ${userId}`);
    set({ isEncryptionLoading: true });

    try {
      // Check if user has existing encryption setup
      const hasEncryptionSetup = await UserContextManager.hasUserEncryptionSetup(userId);
      
      if (hasEncryptionSetup) {
        // Try to load the master key
        const encryptionService = getEncryptionService();
        const keyLoaded = await encryptionService.loadMasterKey(userId);

        if (keyLoaded) {
          // Test if encryption works
          const testResult = await encryptionService.testEncryption();
          
          if (testResult) {
            // Encryption is working
            const { currentUser } = get();
            if (currentUser && currentUser.id === userId) {
              const updatedUser: User = {
                ...currentUser,
                hasEncryptionKey: true,
                encryptionInitialized: true,
              };

              set({
                currentUser: updatedUser,
                isEncryptionReady: true,
                isEncryptionLoading: false,
                needsEncryptionSetup: false,
              });

              console.log(`[AuthEncryptionStore] Encryption loaded successfully for user: ${userId}`);
              return;
            }
          } else {
            console.warn(`[AuthEncryptionStore] Encryption test failed for user: ${userId}`);
          }
        } else {
          console.warn(`[AuthEncryptionStore] Failed to load encryption key for user: ${userId}`);
        }
      }

      // No working encryption found - user needs setup
      const { currentUser } = get();
      if (currentUser && currentUser.id === userId) {
        const updatedUser: User = {
          ...currentUser,
          hasEncryptionKey: hasEncryptionSetup,
          encryptionInitialized: false,
        };

        set({
          currentUser: updatedUser,
          isEncryptionReady: false,
          isEncryptionLoading: false,
          needsEncryptionSetup: true,
        });

        console.log(`[AuthEncryptionStore] User ${userId} needs encryption setup`);
      }

    } catch (error) {
      console.error(`[AuthEncryptionStore] Error checking encryption status for user ${userId}:`, error);
      set({
        isEncryptionReady: false,
        isEncryptionLoading: false,
        needsEncryptionSetup: true,
      });
    }
  },

  // Internal state management
  setToken: (token: string | null) => {
    set({ token });
  },

  setCurrentUser: (user: User | null) => {
    set({ currentUser: user });
  },

  resetEncryptionState: () => {
    set({
      isEncryptionReady: false,
      isEncryptionLoading: false,
      needsEncryptionSetup: false,
    });
  },

  // Payment actions
  checkPaymentStatus: async () => {
    console.log('[AuthEncryptionStore] Checking payment status');
    const { token, currentUser } = get();
    
    if (!token || !currentUser) {
      console.warn('[AuthEncryptionStore] No token or user for payment status check');
      return;
    }

    set({ isPaymentLoading: true });

    try {
      const response = await apiClient.call({
        endpoint: '/payment/status',
        config: {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            Accept: 'application/json',
          },
        },
      });

      const paymentData = response as PaymentStatusResponse;
      
      // Update user with payment information
      const updatedUser: User = {
        ...currentUser,
        paymentStatus: paymentData.payment_status as any,
        paymentMethod: paymentData.payment_method as any,
        paymentDate: paymentData.payment_date,
      };

      const needsPayment = paymentData.payment_status === 'unpaid';

      set({
        currentUser: updatedUser,
        needsPayment,
        isPaymentLoading: false,
      });

      console.log(`[AuthEncryptionStore] Payment status updated: ${paymentData.payment_status}`);

    } catch (error: any) {
      // Check if it's an authorization error
      if (error.message === 'UNAUTHORIZED') {
        // Get current user ID before clearing state
        const currentUserId = currentUser?.id;
        
        // Clear authentication state
        set({
          token: null,
          currentUser: null,
          needsPayment: false,
          isPaymentLoading: false,
        });
        
        // Clear stored data and redirect to login
        await UserContextManager.performLogoutCleanup(currentUserId);
        router.replace('/login');
        return;
      }
      
      set({
        needsPayment: true, // Default to needing payment on error
        isPaymentLoading: false,
      });
    }
  },

  refreshPaymentStatus: async () => {
    // Alias for checkPaymentStatus to refresh the payment status
    await get().checkPaymentStatus();
  },

  resetPaymentState: () => {
    set({
      needsPayment: false,
      isPaymentLoading: false,
    });
  },

  // Payment Flow Actions
  initializePaymentFlow: async () => {
    console.log('[AuthEncryptionStore] Initializing payment flow');
    const { token } = get();
    
    if (!token) {
      set({ paymentFlowError: 'Authentication required' });
      return;
    }

    set({ 
      paymentFlowError: null,
      paymentFlowStep: 'plan-selection',
      selectedPaymentMethod: null,
      selectedPlan: null,
      paymentIntentData: null,
      isPaymentProcessing: false,
    });

    try {
      // Get payment plans, price data and publishable key in parallel
      const [plansData, priceData, keyData] = await Promise.all([
        paymentService.getPaymentPlans(token),
        paymentService.getPrice(token),
        paymentService.getPublishableKey(token),
      ]);

      // Select the lifetime plan by default since it's the only one
      const lifetimePlan = plansData.plans.find(plan => plan.id === 'lifetime');

      set({
        availablePlans: plansData.plans,
        selectedPlan: lifetimePlan || null,
        priceData,
        stripePublishableKey: keyData.publishable_key,
      });

      // Connect to SSE for payment updates
      await get().connectPaymentSSE();

    } catch (error: any) {
      console.error('[AuthEncryptionStore] Failed to initialize payment flow:', error);
      if (error.message === 'UNAUTHORIZED') {
        router.replace('/login');
        return;
      }
      set({ paymentFlowError: error.message });
    }
  },

  selectPaymentPlan: (plan: PaymentPlan) => {
    console.log(`[AuthEncryptionStore] Selecting payment plan: ${plan.id}`);
    set({ 
      selectedPlan: plan,
      paymentFlowError: null,
    });
  },

  setPaymentFlowStep: (step: 'plan-selection' | 'method-selection') => {
    set({ paymentFlowStep: step, paymentFlowError: null });
  },

  selectPaymentMethod: async (method: 'stripe' | 'bitcoin') => {
    console.log(`[AuthEncryptionStore] Selecting payment method: ${method}`);
    const { token, priceData } = get();
    
    if (!token) {
      set({ paymentFlowError: 'Authentication required' });
      return;
    }

    set({ 
      selectedPaymentMethod: method,
      paymentFlowError: null,
      isPaymentProcessing: true,
    });

    try {
      if (method === 'stripe') {
        // Create payment intent for Stripe
        const selectedPlan = get().selectedPlan;
        if (!selectedPlan) {
          throw new Error('No payment plan selected');
        }
        
        const paymentIntent = await paymentService.createPaymentIntent(token, {
          amount: selectedPlan.price,
          currency: selectedPlan.currency,
          plan_id: selectedPlan.id,
        });

        set({
          paymentIntentData: paymentIntent,
          paymentFlowStep: 'method-selection',
          isPaymentProcessing: false,
        });
      } else if (method === 'bitcoin') {
        // Bitcoin payment would be handled differently
        // For now, just set the step
        set({
          paymentFlowStep: 'method-selection', 
          isPaymentProcessing: false,
        });
      }
    } catch (error: any) {
      console.error('[AuthEncryptionStore] Failed to select payment method:', error);
      if (error.message === 'UNAUTHORIZED') {
        router.replace('/login');
        return;
      }
      
      // Use Stripe error message extraction for payment method selection errors
      const errorMessage = getStripeErrorMessage(error, 'Failed to initialize payment. Please try again.');
      
      set({ 
        paymentFlowError: errorMessage,
        isPaymentProcessing: false,
      });
    }
  },

  processStripePayment: async (clientSecret: string) => {
    console.log('[AuthEncryptionStore] Processing Stripe payment');
    set({ 
      isPaymentSubmitting: true,
      paymentFlowError: null,
    });

    try {
      // The actual Stripe payment processing is handled by the Stripe component
      // This method just tracks the submission state
      // The SSE connection will handle the payment completion event
      
    } catch (error: any) {
      console.error('[AuthEncryptionStore] Payment processing failed:', error);
      
      // Use Stripe error message extraction
      const errorMessage = getStripeErrorMessage(error, 'Payment processing failed. Please try again.');
      
      set({ 
        paymentFlowError: errorMessage,
        isPaymentSubmitting: false,
      });
    }
  },

  handleSSEPaymentEvent: (event: PaymentSSEEvent) => {
    console.log('[AuthEncryptionStore] Handling SSE payment event:', event);
    
    if (event.payment_status === 'paid' && event.confirmation_code) {
      set({
        paymentConfirmationCode: event.confirmation_code,
        showPaymentConfirmation: true,
        isPaymentProcessing: false,
        isPaymentSubmitting: false,
        paymentFlowError: null,
      });

      // Update payment status
      get().refreshPaymentStatus();
      
      // Payment completed successfully - disconnect SSE as we no longer need to listen
      console.log('[AuthEncryptionStore] Payment completed successfully, disconnecting SSE');
      get().disconnectPaymentSSE();
      
    } else if (event.payment_status === 'failed') {
      set({
        paymentFlowError: 'Payment failed. Please try again.',
        isPaymentProcessing: false,
        isPaymentSubmitting: false,
      });
      
      // Payment failed - disconnect SSE as we no longer need to listen
      console.log('[AuthEncryptionStore] Payment failed, disconnecting SSE');
      get().disconnectPaymentSSE();
    }
  },

  completePaymentFlow: async () => {
    console.log('[AuthEncryptionStore] Completing payment flow');
    
    // Refresh payment status to ensure everything is up to date
    await get().refreshPaymentStatus();
    
    // Ensure SSE is disconnected and cleaned up
    console.log('[AuthEncryptionStore] Cleaning up SSE connection');
    get().disconnectPaymentSSE();
    
    // Reset payment flow state
    get().resetPaymentFlow();
    
    // Navigate to main app or encryption setup if needed
    const state = get();
    if (state.needsEncryptionSetup) {
      router.replace('/encryption-setup');
    } else {
      router.replace('/');
    }
  },

  resetPaymentFlow: () => {
    set({
      paymentFlowStep: 'plan-selection',
      showPaymentConfirmation: false,
      selectedPaymentMethod: null,
      paymentIntentData: null,
      isPaymentProcessing: false,
      isPaymentSubmitting: false,
      paymentConfirmationCode: null,
      paymentFlowError: null,
    });
  },

  // SSE Integration Actions
  connectPaymentSSE: async () => {
    const { token, sseService } = get();
    
    if (!token) {
      console.warn('[AuthEncryptionStore] No token for SSE connection');
      return;
    }
    
    if (sseService) {
      console.log('[AuthEncryptionStore] SSE service already connected');
      return;
    }

    set({
      sseConnectionState: {
        isConnected: false,
        isConnecting: true,
      }
    });

    try {
      const newSSEService = new SSEService();
      
      // Add event listener for payment events
      newSSEService.addEventListener(get().handleSSEPaymentEvent);
      
      // Add connection state listener
      newSSEService.addConnectionListener((connectionState) => {
        set({ sseConnectionState: connectionState });
      });
      
      // Connect to SSE
      await newSSEService.connect(token);
      
      set({ sseService: newSSEService });
      
    } catch (error: any) {
      console.error('[AuthEncryptionStore] Failed to connect SSE:', error);
      set({
        sseConnectionState: {
          isConnected: false,
          isConnecting: false,
          error: error.message,
        }
      });
    }
  },

  disconnectPaymentSSE: () => {
    console.log('[AuthEncryptionStore] Disconnecting payment SSE service');
    const { sseService } = get();
    
    if (sseService) {
      // Clean up the service (this will remove event listeners and close connection)
      sseService.cleanup();
      
      set({ 
        sseService: null,
        sseConnectionState: {
          isConnected: false,
          isConnecting: false,
        }
      });
      
      console.log('[AuthEncryptionStore] Payment SSE service disconnected and cleaned up');
    } else {
      console.log('[AuthEncryptionStore] No active SSE service to disconnect');
    }
  },

  // Combined initialization for app startup
  initializeStore: async () => {
    console.log('[AuthEncryptionStore] Initializing store from persisted data');
    set({ isInitializing: true });

    try {
      // Check for current user
      const currentUserId = await UserContextManager.loadCurrentUserId();
      
      if (!currentUserId) {
        console.log('[AuthEncryptionStore] No current user found');
        set({ isInitializing: false });
        return;
      }

      // Load user's auth state
      const authState = await UserContextManager.loadUserAuthState(currentUserId);
      
      if (!authState || !authState.token) {
        console.log(`[AuthEncryptionStore] No valid auth state found for user: ${currentUserId}`);
        await UserContextManager.clearCurrentUserId();
        set({ isInitializing: false });
        return;
      }

      // Create user object
      const user: User = {
        id: currentUserId,
        username: authState.user.username,
        hasEncryptionKey: false, // Will be determined by checkUserEncryptionStatus
        encryptionInitialized: false,
        paymentStatus: 'unpaid', // Default status, will be updated by checkPaymentStatus
      };

      // Restore auth state
      set({
        token: authState.token,
        currentUser: user,
      });

      // Check encryption status
      await get().checkUserEncryptionStatus(currentUserId);
      
      // Check payment status
      await get().checkPaymentStatus();

      console.log(`[AuthEncryptionStore] Store initialized successfully for user: ${currentUserId}`);

    } catch (error) {
      console.error('[AuthEncryptionStore] Error initializing store:', error);
      // Clear any invalid state
      await UserContextManager.clearCurrentUserId();
    } finally {
      set({ isInitializing: false });
    }
  },
}));

// Optimized selector hooks using useShallow to prevent unnecessary re-renders

// Auth selectors
export const useAuth = () => 
  useAuthEncryptionStore(
    useShallow((state) => ({
      token: state.token,
      currentUser: state.currentUser,
      isAuthLoading: state.isAuthLoading,
      signIn: state.signIn,
      signOut: state.signOut,
      register: state.register,
    }))
  );

export const useAuthToken = () => useAuthEncryptionStore((state) => state.token);
export const useCurrentUser = () => useAuthEncryptionStore((state) => state.currentUser);
export const useIsAuthLoading = () => useAuthEncryptionStore((state) => state.isAuthLoading);

// Encryption selectors
export const useEncryption = () =>
  useAuthEncryptionStore(
    useShallow((state) => ({
      isEncryptionReady: state.isEncryptionReady,
      isEncryptionLoading: state.isEncryptionLoading,
      needsEncryptionSetup: state.needsEncryptionSetup,
      initializeEncryption: state.initializeEncryption,
      checkUserEncryptionStatus: state.checkUserEncryptionStatus,
      resetEncryptionState: state.resetEncryptionState,
    }))
  );

export const useIsEncryptionReady = () => useAuthEncryptionStore((state) => state.isEncryptionReady);
export const useIsEncryptionLoading = () => useAuthEncryptionStore((state) => state.isEncryptionLoading);
export const useNeedsEncryptionSetup = () => useAuthEncryptionStore((state) => state.needsEncryptionSetup);

// Combined selectors
export const useAuthEncryption = () =>
  useAuthEncryptionStore(
    useShallow((state) => ({
      token: state.token,
      currentUser: state.currentUser,
      isAuthLoading: state.isAuthLoading,
      isEncryptionReady: state.isEncryptionReady,
      isEncryptionLoading: state.isEncryptionLoading,
      needsEncryptionSetup: state.needsEncryptionSetup,
      isInitializing: state.isInitializing,
    }))
  );

export const useIsInitializing = () => useAuthEncryptionStore((state) => state.isInitializing);

// Payment selectors
export const useNeedsPayment = () => useAuthEncryptionStore((state) => state.needsPayment);
export const useIsPaymentLoading = () => useAuthEncryptionStore((state) => state.isPaymentLoading);
export const usePaymentStatus = () => useAuthEncryptionStore((state) => state.currentUser?.paymentStatus || 'unpaid');

// Action selectors to prevent infinite loops
export const useSignIn = () => useAuthEncryptionStore((state) => state.signIn);
export const useSignOut = () => useAuthEncryptionStore((state) => state.signOut);
export const useRegister = () => useAuthEncryptionStore((state) => state.register);
export const useInitializeEncryption = () => useAuthEncryptionStore((state) => state.initializeEncryption);
export const useCheckUserEncryptionStatus = () => useAuthEncryptionStore((state) => state.checkUserEncryptionStatus);
export const useInitializeStore = () => useAuthEncryptionStore((state) => state.initializeStore);

// Payment action selectors
export const useCheckPaymentStatus = () => useAuthEncryptionStore((state) => state.checkPaymentStatus);
export const useRefreshPaymentStatus = () => useAuthEncryptionStore((state) => state.refreshPaymentStatus);
export const useResetPaymentState = () => useAuthEncryptionStore((state) => state.resetPaymentState);

// Payment Flow selectors
export const usePaymentFlow = () => 
  useAuthEncryptionStore(
    useShallow((state) => ({
      step: state.paymentFlowStep,
      selectedMethod: state.selectedPaymentMethod,
      isProcessing: state.isPaymentProcessing,
      isSubmitting: state.isPaymentSubmitting,
      error: state.paymentFlowError,
      confirmationCode: state.paymentConfirmationCode,
      showConfirmation: state.showPaymentConfirmation,
      paymentIntentData: state.paymentIntentData,
      priceData: state.priceData,
      stripePublishableKey: state.stripePublishableKey,
      // Actions
      initialize: state.initializePaymentFlow,
      setStep: state.setPaymentFlowStep,
      selectMethod: state.selectPaymentMethod,
      processPayment: state.processStripePayment,
      complete: state.completePaymentFlow,
      reset: state.resetPaymentFlow,
    }))
  );

// SSE selectors
export const useSSEConnection = () => 
  useAuthEncryptionStore(
    useShallow((state) => ({
      connectionState: state.sseConnectionState,
      connect: state.connectPaymentSSE,
      disconnect: state.disconnectPaymentSSE,
    }))
  );

// Export the main store for direct access when needed
export default useAuthEncryptionStore;

// Backward compatibility hooks that match the old Context API
export const useAuthSession = () => {
  const { token, isAuthLoading, signIn, signOut, register } = useAuth();
  return {
    token,
    isTokenLoading: isAuthLoading,
    signIn: (username: string, password: string, skipRedirect?: boolean) => 
      signIn(username, password),
    signOut: async () => {
      await signOut();
      return null;
    },
    register: async (username: string, password: string) => {
      const result = await register(username, password);
      return result.success ? null : result.error;
    },
  };
};

export const useEncryptionFlow = () => {
  const encryption = useEncryption();
  
  const getRequiredAction = (): 'none' | 'setup' | 'recovery' | 'loading' => {
    if (encryption.isEncryptionLoading) return 'loading';
    if (encryption.isEncryptionReady) return 'none';
    if (encryption.needsEncryptionSetup) return 'setup';
    return 'none';
  };

  return {
    requiredAction: getRequiredAction(),
    isInitialized: encryption.isEncryptionReady,
    isLoading: encryption.isEncryptionLoading,
    needsSetup: encryption.needsEncryptionSetup,
    needsRecovery: false, // Simplified for now
    initializeEncryption: encryption.initializeEncryption,
    loadExistingEncryption: async () => true, // Handled automatically by checkUserEncryptionStatus
    clearEncryption: async () => {
      const encryptionService = getEncryptionService();
      await encryptionService.deleteMasterKey();
      encryptionService.clearKeys();
      encryption.resetEncryptionState();
    },
    checkEncryptionStatus: async () => {
      const currentUser = useAuthEncryptionStore.getState().currentUser;
      if (currentUser) {
        await encryption.checkUserEncryptionStatus(currentUser.id);
      }
    },
  };
};
