// TypeScript interfaces for the unified authentication and encryption store

import { PaymentStatus, PaymentMethod, PaymentSSEEvent, SSEConnectionState, CreatePaymentIntentResponse, PriceResponse, PaymentPlan } from './paymentTypes';
import { SSEService } from '../services/SSEService';

/**
 * User authentication and encryption state
 */
export interface User {
  id: string;
  username: string;
  hasEncryptionKey: boolean;
  encryptionInitialized: boolean;
  // Payment status fields
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paymentDate?: string;
}

/**
 * Main store state interface combining authentication and encryption
 */
export interface AuthEncryptionState {
  // Authentication state
  token: string | null;
  currentUser: User | null;
  isAuthLoading: boolean;

  // Encryption state
  isEncryptionReady: boolean;
  isEncryptionLoading: boolean;
  needsEncryptionSetup: boolean;

  // Payment state
  needsPayment: boolean;
  isPaymentLoading: boolean;

  // Payment Flow State
  paymentFlowStep: 'plan-selection' | 'method-selection';
  showPaymentConfirmation: boolean;
  selectedPaymentMethod: 'stripe' | 'bitcoin' | null;
  selectedPlan: PaymentPlan | null;
  availablePlans: PaymentPlan[];
  paymentIntentData: CreatePaymentIntentResponse | null;
  priceData: PriceResponse | null;
  stripePublishableKey: string;

  // Payment Processing State
  isPaymentProcessing: boolean;
  isPaymentSubmitting: boolean;
  paymentConfirmationCode: string | null;
  paymentFlowError: string | null;

  // SSE State
  sseConnectionState: SSEConnectionState;
  sseService: SSEService | null;

  // Combined loading state
  isInitializing: boolean;
}

/**
 * Store actions interface for all authentication and encryption operations
 */
export interface AuthEncryptionActions {
  // Authentication actions
  signIn: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  register: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;

  // Encryption actions
  initializeEncryption: (seedWords: string[], password?: string) => Promise<boolean>;
  checkUserEncryptionStatus: (userId: string) => Promise<void>;

  // Payment actions
  checkPaymentStatus: () => Promise<void>;
  refreshPaymentStatus: () => Promise<void>;
  resetPaymentState: () => void;

  // Payment Flow Actions
  initializePaymentFlow: () => Promise<void>;
  selectPaymentPlan: (plan: PaymentPlan) => void;
  setPaymentFlowStep: (step: 'plan-selection' | 'method-selection') => void;
  selectPaymentMethod: (method: 'stripe' | 'bitcoin') => Promise<void>;
  processStripePayment: (clientSecret: string) => Promise<void>;
  handleSSEPaymentEvent: (event: PaymentSSEEvent) => void;
  completePaymentFlow: () => Promise<void>;
  resetPaymentFlow: () => void;

  // SSE Integration Actions
  connectPaymentSSE: () => Promise<void>;
  disconnectPaymentSSE: () => void;

  // Internal state management
  setToken: (token: string | null) => void;
  setCurrentUser: (user: User | null) => void;
  resetEncryptionState: () => void;
  
  // Combined initialization
  initializeStore: () => Promise<void>;

  // Utility functions
  getUserIdFromToken: (token: string) => string | null;
}

/**
 * Combined store type
 */
export type AuthEncryptionStore = AuthEncryptionState & AuthEncryptionActions;

/**
 * User context storage keys for multi-user encryption isolation
 */
export interface UserStorageKeys {
  masterKey: string;
  encryptionConfig: string;
  authState: string;
}

/**
 * Authentication response from backend API
 */
export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: string;
    username: string;
    created_at: string;
    is_active: boolean;
  };
}

/**
 * Registration response from backend API
 */
export interface RegisterResponse {
  message: string;
  user: {
    id: string;
    username: string;
    created_at: string;
    is_active: boolean;
  };
}
