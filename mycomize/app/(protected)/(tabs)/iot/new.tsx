import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { VStack } from '~/components/ui/vstack';
import { Spinner } from '~/components/ui/spinner';

import { IoTGatewayForm } from '~/components/iot/IoTGatewayForm';
import { useInitializeCurrentGateway } from '~/lib/stores/iot/gatewayStore';

export default function NewIoTGatewayScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const initializeCurrentGateway = useInitializeCurrentGateway();

  // Initialize current gateway for new gateway creation when screen focuses
  useFocusEffect(useCallback(() => {
    initializeCurrentGateway('new');
  }, [initializeCurrentGateway]));

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
