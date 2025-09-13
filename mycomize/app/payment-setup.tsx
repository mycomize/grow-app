import React, { useEffect } from 'react';
import { router } from 'expo-router';
import { VStack } from '~/components/ui/vstack';
import { ScrollView } from '~/components/ui/scroll-view';
import { SafeAreaView } from '~/components/ui/safe-area-view';
import { useUnifiedToast } from '~/components/ui/unified-toast';
import { StripeProvider } from '@stripe/stripe-react-native';
import { 
  useAuth, 
  usePaymentFlow,
} from '~/lib/stores/authEncryptionStore';
import { PaymentMethodSelector } from '~/components/payment/PaymentMethodSelector';
import { PaymentPlanSelector } from '~/components/payment/PaymentPlanSelector';
import { PaymentConfirmation } from '~/components/payment/PaymentConfirmation';

export default function PaymentSetupScreen() {
  const { token } = useAuth();
  const paymentFlow = usePaymentFlow();
  const { showError, showSuccess } = useUnifiedToast();

  // Handle token validation and initialization
  useEffect(() => {
    if (!token) {
      console.warn('[PaymentSetup] No token found, redirecting to login');
      router.replace('/login');
      return;
    }
    
    // Initialize payment flow when component mounts
    paymentFlow.initialize();
  }, [token, paymentFlow.initialize]);

  // Handle errors from the payment flow
  useEffect(() => {
    if (paymentFlow.error) {
      showError(paymentFlow.error);
    }
  }, [paymentFlow.error, showError]);

  const handlePlanSelected = () => {
    paymentFlow.setStep('method-selection');
  };

  const handleMethodSelected = async (method: 'stripe' | 'bitcoin') => {
    if (method === 'bitcoin') {
      showError('Bitcoin payments are coming soon');
      return;
    }
    
    await paymentFlow.selectMethod(method);
  };

  const handlePaymentConfirmed = (confirmationCode: string) => {
    // Payment confirmation is handled by SSE in the store
    // This callback might not be needed anymore, but keeping for compatibility
    console.log('[PaymentSetup] Payment confirmed with code:', confirmationCode);
  };

  const handleContinueToApp = async () => {
    await paymentFlow.complete();
  };

  const renderCurrentStep = () => {
    switch (paymentFlow.step) {
      case 'plan-selection':
        return (
          <PaymentPlanSelector
            onPlanSelected={handlePlanSelected}
            onBack={() => router.replace('/login')}
            disabled={paymentFlow.isProcessing}
          />
        );

      case 'method-selection':
        return (
          paymentFlow.stripePublishableKey && (
            <StripeProvider publishableKey={paymentFlow.stripePublishableKey}>
              <PaymentMethodSelector
                selectedMethod={paymentFlow.selectedMethod}
                onMethodChange={handleMethodSelected}
                onPaymentConfirmed={handlePaymentConfirmed}
                onBackToPlan={() => paymentFlow.setStep('plan-selection')}
                clientSecret={paymentFlow.paymentIntentData?.client_secret}
                paymentIntentId={paymentFlow.paymentIntentData?.payment_intent_id}
                disabled={paymentFlow.isProcessing || paymentFlow.isSubmitting}
                priceData={paymentFlow.priceData}
              />
            </StripeProvider>
          )
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
      
      {/* Payment Confirmation Overlay */}
      {paymentFlow.showConfirmation && paymentFlow.confirmationCode && (
        <VStack className="absolute inset-0 bg-background-50">
          <PaymentConfirmation
            confirmationCode={paymentFlow.confirmationCode}
            onContinue={handleContinueToApp}
          />
        </VStack>
      )}
    </SafeAreaView>
  );
}
