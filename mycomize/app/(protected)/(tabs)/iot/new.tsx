import { useState } from 'react';
import { VStack } from '~/components/ui/vstack';
import { Spinner } from '~/components/ui/spinner';

import { IoTGatewayForm } from '~/components/iot/IoTGatewayForm';

export default function NewIoTGatewayScreen() {
  const [isLoading, setIsLoading] = useState(false);

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
