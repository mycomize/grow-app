export interface PaymentState {
  paymentStatus: 'unpaid' | 'paid' | 'failed' | 'loading';
  needsPayment: boolean;
  isPaymentLoading: boolean;
}

export interface StripePaymentIntent {
  id: string;
  client_secret: string;
  amount: number;
  currency: string;
  status: string;
}

export interface PaymentStatusResponse {
  payment_status: 'unpaid' | 'paid' | 'failed';
  payment_method?: 'stripe' | 'bitcoin';
  payment_date?: string;
}

export interface CreatePaymentIntentRequest {
  amount: number; // in cents, always 1999 for $19.99
  currency: string; // 'usd'
  plan_id: string; // plan ID (e.g., 'lifetime')
}

export interface CreatePaymentIntentResponse {
  payment_intent_id: string;
  client_secret: string;
  publishable_key: string;
}

export interface PublishableKeyResponse {
  publishable_key: string;
}

export interface PriceResponse {
  price_id: string;
  product_id: string;
  product_type: string;
  amount: number; // Amount in cents
  currency: string;
  recurring: boolean;
}

export interface PaymentMethodType {
  id: 'stripe' | 'bitcoin';
  name: string;
  description: string;
  enabled: boolean;
}

export interface PaymentFormState {
  selectedMethod: 'stripe' | 'bitcoin' | null;
  isProcessing: boolean;
  error: string | null;
}

export type PaymentStatus = 'unpaid' | 'paid' | 'failed' | 'loading';
export type PaymentMethod = 'stripe' | 'bitcoin';

// SSE-related types
export interface PaymentSSEEvent {
  event_type: string;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  payment_intent_id: string;
  subscription_id?: string;
  confirmation_code?: string;
  timestamp: number;
  user_id: number;
}

export interface SSEConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  lastEvent?: PaymentSSEEvent;
  error?: string;
}

// Payment Plan types
export interface PaymentPlan {
  id: string;
  name: string;
  description: string;
  price: number; // Amount in cents
  currency: string;
  billing_interval: string;
  stripe_price_id: string;
}

export interface PaymentPlansResponse {
  plans: PaymentPlan[];
}
