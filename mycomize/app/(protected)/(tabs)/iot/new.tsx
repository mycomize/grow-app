import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { VStack } from '~/components/ui/vstack';
import { Spinner } from '~/components/ui/spinner';

import { IoTGatewayForm } from '~/components/iot/IoTGatewayForm';
import { useGatewayStore } from '~/lib/stores/iot/gatewayStore';
import { NEW_GATEWAY_ID } from '~/lib/types/iotTypes';

export default function NewIoTGatewayScreen() {
  const [isLoading, setIsLoading] = useState(false);

  // Initialize current gateway for new gateway creation when screen focuses
  // Now with QR scanning flag-based preservation logic
  useFocusEffect(useCallback(() => {
    // Access store directly in the callback to avoid subscription issues
    const store = useGatewayStore.getState();
    const { initializeCurrentGateway, checkAndClearQrScanningFlag } = store;
    const wasQrScanning = checkAndClearQrScanningFlag();
    
    if (wasQrScanning) {
      console.log('[NewGatewayScreen] Returned from QR scanner, preserving existing gateway data');
      return;
    }
    
    initializeCurrentGateway('new');
  }, []));

  if (isLoading) {
    return (
      <VStack className="flex-1 items-center justify-center bg-background-50">
        <Spinner size="large" />
      </VStack>
    );
  }

  // Pass minimal props - form handles its own state via stores
  return <IoTGatewayForm gatewayId="new" />;
}
