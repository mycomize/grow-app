import React, { useState, useEffect } from 'react';
import { router } from 'expo-router';
import { VStack } from '~/components/ui/vstack';
import { ScrollView } from '~/components/ui/scroll-view';
import { SafeAreaView } from '~/components/ui/safe-area-view';
import { Text } from '~/components/ui/text';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { useUnifiedToast } from '~/components/ui/unified-toast';
import { StripeProvider } from '@stripe/stripe-react-native';
import { paymentService } from '~/lib/services/PaymentService';
import { 
  useAuth, 
  useRefreshPaymentStatus,
} from '~/lib/stores/authEncryptionStore';
import { PaymentMethodSelector } from '~/components/payment/PaymentMethodSelector';
import { PaymentPlanSelector } from '~/components/payment/PaymentPlanSelector';
import { PaymentStatusIndicator } from '~/components/payment/PaymentStatusIndicator';
import { PaymentFormState, CreatePaymentIntentResponse } from '~/lib/types/paymentTypes';
import { ArrowLeft } from 'lucide-react-native';

type PaymentSetupStep = 'plan-selection' | 'method-selection' | 'processing' | 'confirmation';

export default function PaymentSetupScreen() {
  const { token } = useAuth();
  const refreshPaymentStatus = useRefreshPaymentStatus();
  const { showError, showSuccess } = useUnifiedToast();

  // Step management
  const [currentStep, setCurrentStep] = useState<PaymentSetupStep>('plan-selection');
  
  // Form state
  const [formState, setFormState] = useState<PaymentFormState>({
    selectedMethod: null,
    isProcessing: false,
    error: null,
  });

  // Stripe state
  const [stripePublishableKey, setStripePublishableKey] = useState<string>('');
  const [paymentIntentData, setPaymentIntentData] = useState<CreatePaymentIntentResponse | null>(null);

  // Handle null token detection and redirect to login
  useEffect(() => {
    if (!token) {
      console.warn('[PaymentSetup] No token found, redirecting to login');
      router.replace('/login');
      return;
    }
    // Load Stripe publishable key when component mounts
    loadStripeConfig();
  }, [token]);

  const loadStripeConfig = async () => {
    if (!token) return;
    
    try {
      const response = await paymentService.getPublishableKey(token);
      setStripePublishableKey(response.publishable_key);
    } catch (error: any) {
      console.error('Failed to load Stripe configuration:', error);
      if (error.message === 'UNAUTHORIZED') {
        router.replace('/login');
        return;
      }
      showError('Failed to initialize payment system');
    }
  };

  const handlePlanSelected = () => {
    setCurrentStep('method-selection');
  };

  const handleMethodSelected = async (method: 'stripe' | 'bitcoin') => {
    setFormState(prev => ({ ...prev, selectedMethod: method, error: null }));
    
    if (method === 'stripe') {
      // Create payment intent for Stripe
      await createPaymentIntent();
    } else {
      showError('Bitcoin payments are coming soon');
    }
  };

  const createPaymentIntent = async () => {
    if (!token) return;
    
    setFormState(prev => ({ ...prev, isProcessing: true }));

    try {
      const response = await paymentService.createPaymentIntent(token, {
          // TODO SHOUDL HAPPEN IN BACKEND
        amount: 1999, // $19.99 in cents
        currency: 'usd',
      });

      setPaymentIntentData(response);
    } catch (error: any) {
      console.error('Failed to create payment intent:', error);
      if (error.message === 'UNAUTHORIZED') {
        router.replace('/login');
        return;
      }
      showError('Failed to initialize payment');
      setCurrentStep('method-selection');
    } finally {
      setFormState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const handlePaymentSuccess = async (paymentMethodId: string) => {
    setCurrentStep('processing');
    
    // Poll for payment status updates from webhook
    const pollForPaymentConfirmation = async (attempts = 0, maxAttempts = 30) => {
      if (attempts >= maxAttempts) {
        showError('Payment confirmation timeout. Please contact support if payment was charged.');
        setCurrentStep('method-selection');
        return;
      }

      try {
        await refreshPaymentStatus();
        
        // Wait a bit, then check if payment went through
        setTimeout(async () => {
          // The payment status will be updated via the store's refreshPaymentStatus call
          // If still unpaid after webhook processing, continue polling
          await pollForPaymentConfirmation(attempts + 1, maxAttempts);
        }, 2000);
        
      } catch (error) {
        console.error('Error polling payment status:', error);
        await pollForPaymentConfirmation(attempts + 1, maxAttempts);
      }
    };

    // Start polling for payment confirmation
    pollForPaymentConfirmation();
  };

  // Listen for payment status changes to navigate accordingly
  useEffect(() => {
    if (currentStep === 'processing') {
      // Check if payment was confirmed via webhook
      // This will be triggered by the store updates
      const checkPaymentStatus = async () => {
        if (!token) return;
        
        try {
          const status = await paymentService.checkPaymentStatus(token);
          if (status.payment_status === 'paid') {
            setCurrentStep('confirmation');
            showSuccess('Payment completed successfully!');
            
            // Navigate to main app after showing success
            setTimeout(() => {
              router.replace('/');
            }, 2000);
          }
        } catch (error) {
          console.error('Error checking payment status:', error);
        }
      };

      // Set up interval to check payment status while processing
      const interval = setInterval(checkPaymentStatus, 3000);
      
      // Clean up interval after 60 seconds max
      const timeout = setTimeout(() => {
        clearInterval(interval);
        if (currentStep === 'processing') {
          showError('Payment confirmation timeout. Please contact support if payment was charged.');
          setCurrentStep('method-selection');
        }
      }, 60000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [currentStep, token, showError, showSuccess]);

  const handlePaymentError = (error: string) => {
    setFormState(prev => ({ ...prev, error, isProcessing: false }));
    showError(error);
  };

  const handleBackToMethodSelection = () => {
    setCurrentStep('method-selection');
    setPaymentIntentData(null);
    setFormState({
      selectedMethod: null,
      isProcessing: false,
      error: null,
    });
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'plan-selection':
        return (
          <PaymentPlanSelector
            onPlanSelected={handlePlanSelected}
            onBack={() => router.replace('/login')}
            disabled={formState.isProcessing}
          />
        );

      case 'method-selection':
        return (
          <>
            {stripePublishableKey && (
              <StripeProvider publishableKey={stripePublishableKey}>
                <PaymentMethodSelector
                  selectedMethod={formState.selectedMethod}
                  onMethodChange={handleMethodSelected}
                  onPaymentSuccess={handlePaymentSuccess}
                  onBackToPlan={() => setCurrentStep('plan-selection')}
                  clientSecret={paymentIntentData?.client_secret}
                  disabled={formState.isProcessing}
                  isProcessing={formState.isProcessing}
                />
              </StripeProvider>
            )}
            
            {formState.error && (
              <VStack className="px-6">
                <PaymentStatusIndicator
                  status="failed"
                  message={formState.error}
                />
              </VStack>
            )}
          </>
        );

      case 'processing':
        return (
          <VStack space="lg" className="px-6 flex-1 justify-center">
            <PaymentStatusIndicator
              status="loading"
              message="Processing your payment..."
              showSpinner={true}
            />
          </VStack>
        );

      case 'confirmation':
        return (
          <VStack space="lg" className="px-6 flex-1 justify-center">
            <PaymentStatusIndicator
              status="paid"
              message="Welcome to Mycomize! You now have lifetime access to all features."
            />
            
            <Text className="text-center text-typography-600 text-sm">
              Redirecting to the main app...
            </Text>
          </VStack>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <VStack className="flex-1 min-h-full">
          {renderCurrentStep()}
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
