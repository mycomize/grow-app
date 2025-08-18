import { useLocalSearchParams } from 'expo-router';
import { IoTGatewayForm } from '~/components/iot/IoTGatewayForm';

export default function EditIoTGatewayScreen() {
  const { id } = useLocalSearchParams();
  const gatewayId = id as string;

  return <IoTGatewayForm gatewayId={gatewayId} saveButtonText="Save" />;
}
