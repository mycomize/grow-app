import React, { useState, useEffect, useContext } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView } from '~/components/ui/scroll-view';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Card } from '~/components/ui/card';
import { Heading } from '~/components/ui/heading';
import { Text } from '~/components/ui/text';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Spinner } from '~/components/ui/spinner';
import {
  ArrowLeft,
  Thermometer,
  Droplet,
  Activity,
  AlertCircle,
  Gauge,
  Sun,
  Wind,
  Zap,
} from 'lucide-react-native';

import { AuthContext } from '~/lib/AuthContext';
import { apiClient, isUnauthorizedError } from '~/lib/ApiClient';
import { IoTGateway, HAEntity } from '~/lib/iot';
import { SensorGraph } from '~/components/charts/SensorGraph';

export default function SensorDetailScreen() {
  const { id, sensorId } = useLocalSearchParams();
  const router = useRouter();
  const { token } = useContext(AuthContext);
  const [gateway, setGateway] = useState<IoTGateway | null>(null);
  const [sensorState, setSensorState] = useState<HAEntity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get icon based on device class
  const getSensorIcon = (deviceClass?: string) => {
    switch (deviceClass) {
      case 'temperature':
        return Thermometer;
      case 'humidity':
        return Droplet;
      case 'pressure':
        return Gauge;
      case 'illuminance':
        return Sun;
      case 'wind_speed':
        return Wind;
      case 'power':
      case 'energy':
        return Zap;
      default:
        return Activity;
    }
  };

  // Fetch gateway and sensor data
  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch gateway details
      const gatewayData: IoTGateway = await apiClient.getIoTGateway(id as string, token!);
      setGateway({
        ...gatewayData,
      });

      // Fetch current sensor state from Home Assistant
      const stateResponse = await fetch(`${gatewayData.api_url}/api/states/${sensorId}`, {
        headers: {
          Authorization: `Bearer ${gatewayData.api_key}`,
          'Content-Type': 'application/json',
        },
      });

      if (stateResponse.ok) {
        const stateData: HAEntity = await stateResponse.json();
        setSensorState(stateData);
      } else {
        throw new Error('Failed to fetch sensor state');
      }
    } catch (err) {
      if (isUnauthorizedError(err as Error)) {
        router.replace('/login');
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load sensor data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, sensorId]);

  if (isLoading) {
    return (
      <VStack className="flex-1 items-center justify-center bg-background-50">
        <Spinner size="large" />
        <Text className="mt-4 text-typography-500">Loading sensor data...</Text>
      </VStack>
    );
  }

  if (error) {
    return (
      <VStack className="flex-1 items-center justify-center bg-background-50 p-4">
        <Icon as={AlertCircle} className="text-error-600" size="xl" />
        <Text className="mt-4 text-center text-error-700">{error}</Text>
        <Button className="mt-4" onPress={() => router.back()}>
          <ButtonIcon as={ArrowLeft} />
          <ButtonText>Go Back</ButtonText>
        </Button>
      </VStack>
    );
  }

  if (!gateway || !sensorState) {
    return (
      <VStack className="flex-1 items-center justify-center bg-background-50">
        <Text>Sensor not found</Text>
        <Button className="mt-4" onPress={() => router.back()}>
          <ButtonIcon as={ArrowLeft} />
          <ButtonText>Go Back</ButtonText>
        </Button>
      </VStack>
    );
  }

  const IconComponent = getSensorIcon(sensorState.attributes.device_class);
  const friendlyName = sensorState.attributes.friendly_name || sensorState.entity_id;
  const unitOfMeasurement = sensorState.attributes.unit_of_measurement;

  return (
    <ScrollView className="flex-1 bg-background-50">
      <VStack className="p-4" space="md">
        {/* Sensor Info Card */}
        <Card className="bg-background-0">
          <VStack className="p-1" space="md">
            <HStack className="items-center" space="md">
              <Icon as={IconComponent} className="text-typography-600" size="xl" />
              <VStack className="flex-1">
                <Text className="text-lg font-semibold">{friendlyName}</Text>
                <Text className="text-sm text-typography-500">{sensorState.entity_id}</Text>
              </VStack>
              <HStack className="items-end">
                <Text className="text-2xl font-bold text-typography-600">
                  {parseFloat(sensorState.state).toFixed(2)}
                </Text>
                {unitOfMeasurement && (
                  <Text className="text-lg text-typography-600"> {unitOfMeasurement}</Text>
                )}
              </HStack>
            </HStack>

            {sensorState.attributes.device_class && (
              <HStack className="items-center" space="sm">
                <Text className="text-sm font-medium text-typography-600">Device Class:</Text>
                <Text className="text-sm capitalize text-typography-500">
                  {sensorState.attributes.device_class}
                </Text>
              </HStack>
            )}

            <HStack className="items-center" space="sm">
              <Text className="text-sm font-medium text-typography-600">Last Updated:</Text>
              <Text className="text-sm text-typography-500">
                {new Date(sensorState.last_updated).toLocaleString()}
              </Text>
            </HStack>
          </VStack>
        </Card>

        {/* Sensor Graph */}
        <SensorGraph gateway={gateway} sensorEntityId={sensorId as string} />
      </VStack>
    </ScrollView>
  );
}
