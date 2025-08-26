import { useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { IoTGatewayForm } from '~/components/iot/IoTGatewayForm';
import { useInitializeCurrentGateway } from '~/lib/stores/iot/gatewayStore';

export default function EditIoTGatewayScreen() {
  const { id } = useLocalSearchParams();
  const gatewayId = id as string;
  const initializeCurrentGateway = useInitializeCurrentGateway();

  // Initialize current gateway for editing when screen focuses
  useFocusEffect(useCallback(() => {
    initializeCurrentGateway(gatewayId);
  }, [initializeCurrentGateway, gatewayId]));

  return <IoTGatewayForm gatewayId={gatewayId} saveButtonText="Save" />;
}
