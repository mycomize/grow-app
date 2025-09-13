import { apiClient, isUnauthorizedError } from '../api/ApiClient';
import {
  PaymentStatusResponse,
  CreatePaymentIntentRequest,
  CreatePaymentIntentResponse,
  PublishableKeyResponse,
  PriceResponse,
  PaymentPlansResponse,
} from '../types/paymentTypes';

/**
 * Service for handling payment-related operations
 * Centralizes payment API calls and provides consistent error handling
 */
class PaymentService {
  /**
   * Check the current user's payment status
   */
  async checkPaymentStatus(token: string): Promise<PaymentStatusResponse> {
    if (!token) {
      console.warn('[PaymentService] No token provided for checkPaymentStatus');
      throw new Error('UNAUTHORIZED');
    }

    try {
      const response = await apiClient.call({
        endpoint: '/payment/status',
        config: {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        },
      });

      return response as PaymentStatusResponse;
    } catch (error: any) {
      if (isUnauthorizedError(error)) {
        throw new Error('UNAUTHORIZED');
      }
      throw new Error('Failed to check payment status. Please try again.');
    }
  }

  /**
   * Create a Stripe payment intent for the user
   */
  async createPaymentIntent(
    token: string,
    request: CreatePaymentIntentRequest
  ): Promise<CreatePaymentIntentResponse> {
    if (!token) {
      console.warn('[PaymentService] No token provided for createPaymentIntent');
      throw new Error('UNAUTHORIZED');
    }

    try {
      const response = await apiClient.call({
        endpoint: '/payment/create-intent',
        config: {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: request,
        },
      });

      return response as CreatePaymentIntentResponse;
    } catch (error: any) {
      if (isUnauthorizedError(error)) {
        throw new Error('UNAUTHORIZED');
      }
      console.error('[PaymentService] Failed to create payment intent:', error);
      
      // Handle specific payment errors
      const errorMessage = error.message || 'Unknown error';
      if (errorMessage.includes('payment_method_required')) {
        throw new Error('Payment method is required. Please select a payment method and try again.');
      }
      if (errorMessage.includes('amount_too_small')) {
        throw new Error('Payment amount is too small. Please contact support.');
      }
      if (errorMessage.includes('currency_not_supported')) {
        throw new Error('Currency not supported. Please contact support.');
      }
      
      throw new Error('Failed to create payment intent. Please try again.');
    }
  }

  /**
   * Get Stripe publishable key for frontend integration
   */
  async getPublishableKey(token: string): Promise<PublishableKeyResponse> {
    if (!token) {
      console.warn('[PaymentService] No token provided for getPublishableKey');
      throw new Error('UNAUTHORIZED');
    }

    try {
      const response = await apiClient.call({
        endpoint: '/payment/publishable-key',
        config: {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        },
      });

      return response as PublishableKeyResponse;
    } catch (error: any) {
      if (isUnauthorizedError(error)) {
        throw new Error('UNAUTHORIZED');
      }
      console.error('[PaymentService] Failed to get publishable key:', error);
      throw new Error('Failed to get payment configuration. Please try again.');
    }
  }

  /**
   * Get product price information from Stripe
   */
  async getPrice(token: string, productType: string = 'opentek-lifetime'): Promise<PriceResponse> {
    if (!token) {
      console.warn('[PaymentService] No token provided for getPrice');
      throw new Error('UNAUTHORIZED');
    }

    try {
      const response = await apiClient.call({
        endpoint: `/payment/price?product_type=${encodeURIComponent(productType)}`,
        config: {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        },
      });

      return response as PriceResponse;
    } catch (error: any) {
      if (isUnauthorizedError(error)) {
        throw new Error('UNAUTHORIZED');
      }
      console.error('[PaymentService] Failed to get price information:', error);
      throw new Error('Failed to get pricing information. Please try again.');
    }
  }

  /**
   * Get available payment plans
   */
  async getPaymentPlans(token: string): Promise<PaymentPlansResponse> {
    if (!token) {
      console.warn('[PaymentService] No token provided for getPaymentPlans');
      throw new Error('UNAUTHORIZED');
    }

    try {
      const response = await apiClient.call({
        endpoint: '/payment/plans',
        config: {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
          },
        },
      });

      return response as PaymentPlansResponse;
    } catch (error: any) {
      if (isUnauthorizedError(error)) {
        throw new Error('UNAUTHORIZED');
      }
      console.error('[PaymentService] Failed to get payment plans:', error);
      throw new Error('Failed to get payment plans. Please try again.');
    }
  }

  /**
   * Refresh payment status - alias for checkPaymentStatus for consistency
   */
  async refreshPaymentStatus(token: string): Promise<PaymentStatusResponse> {
    return this.checkPaymentStatus(token);
  }

  /**
   * Validate payment method selection
   */
  validatePaymentMethod(paymentMethod: string): boolean {
    const validMethods = ['stripe_card', 'btcpay_bitcoin'];
    return validMethods.includes(paymentMethod);
  }

  /**
   * Get payment method display name
   */
  getPaymentMethodDisplayName(paymentMethod: string): string {
    switch (paymentMethod) {
      case 'stripe_card':
        return 'Credit Card';
      case 'btcpay_bitcoin':
        return 'Bitcoin';
      default:
        return 'Unknown Payment Method';
    }
  }

  /**
   * Format payment amount for display
   */
  formatPaymentAmount(amountCents: number, currency: string = 'USD'): string {
    const amount = amountCents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  }

  /**
   * Get payment status display text
   */
  getPaymentStatusDisplayText(status: string): string {
    switch (status) {
      case 'paid':
        return 'Payment Complete';
      case 'unpaid':
        return 'Payment Required';
      case 'pending':
        return 'Payment Processing';
      case 'failed':
        return 'Payment Failed';
      default:
        return 'Unknown Status';
    }
  }

  /**
   * Get payment status color for UI
   */
  getPaymentStatusColor(status: string): 'success' | 'error' | 'warning' | 'info' {
    switch (status) {
      case 'paid':
        return 'success';
      case 'failed':
        return 'error';
      case 'pending':
        return 'warning';
      case 'unpaid':
      default:
        return 'info';
    }
  }
}

// Export singleton instance
export const paymentService = new PaymentService();

// Export class for testing/advanced usage
export { PaymentService };

// Export utility functions
export function isPaymentRequired(status: string): boolean {
  return status === 'unpaid' || status === 'failed';
}

export function isPaymentComplete(status: string): boolean {
  return status === 'paid';
}

export function isPaymentPending(status: string): boolean {
  return status === 'pending';
}
