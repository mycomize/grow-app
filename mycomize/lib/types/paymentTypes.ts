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
}

export interface CreatePaymentIntentResponse {
  payment_intent_id: string;
  client_secret: string;
  publishable_key: string;
}

export interface PublishableKeyResponse {
  publishable_key: string;
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
