import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView } from '~/components/ui/scroll-view';
import { VStack } from '~/components/ui/vstack';
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

import { AuthContext } from '~/lib/api/AuthContext';
import { apiClient, isUnauthorizedError } from '~/lib/api/ApiClient';
import { IoTGateway, HAEntity } from '~/lib/iot/iot';
import { SensorGraph } from '~/components/charts/SensorGraph';
import { useGrows } from '~/lib/stores/growStore';
import { useEntityStore } from '~/lib/stores/iot/entityStore';
import { stageLabels } from '~/lib/types/growTypes';

// TypeScript interface for sensor metadata
interface SensorMetadata {
  growName: string;
  growStage: string;
  friendlyName: string;
  currentValue: string;
  deviceClass: string;
  lastUpdated: string;
  unitOfMeasurement?: string;
}

export default function SensorDetailScreen() {
  const { id, sensorId } = useLocalSearchParams();
  const router = useRouter();
  const { token } = useContext(AuthContext);
  const [gateway, setGateway] = useState<IoTGateway | null>(null);
  const [sensorState, setSensorState] = useState<HAEntity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Zustand store hooks
  const grows = useGrows();
  const linkedEntities = useEntityStore((state) => state.linkedEntities);
  const entityStates = useEntityStore((state) => state.entityStates);

  // Extract sensor metadata from zustand stores
  const getSensorMetadata = (sensorId: string, gatewayId: string): SensorMetadata | null => {
    // Find the linked entity for this sensor
    const linkedEntity = linkedEntities.find(
      (entity) => entity.entity_name === sensorId && entity.gateway_id === parseInt(gatewayId)
    );

    if (!linkedEntity) {
      return null;
    }

    // Find the grow this sensor is linked to
    const grow = grows.find((g) => g.id === linkedEntity.linked_grow_id);
    
    if (!grow) {
      return null;
    }

    // Get current sensor state from entity store
    const currentState = entityStates[sensorId] || sensorState;

    // Get human-readable stage label
    const stageKey = grow.current_stage as keyof typeof stageLabels;
    const humanReadableStage = stageLabels[stageKey] || grow.current_stage || 'Unknown Stage';

    return {
      growName: grow.name || 'Unknown Grow',
      growStage: humanReadableStage,
      friendlyName: linkedEntity.friendly_name || currentState?.attributes?.friendly_name || sensorId,
      currentValue: currentState?.state || 'N/A',
      deviceClass: linkedEntity.device_class || currentState?.attributes?.device_class || 'Unknown',
      lastUpdated: currentState?.last_updated ? new Date(currentState.last_updated).toLocaleString() : 'Unknown',
      unitOfMeasurement: currentState?.attributes?.unit_of_measurement,
    };
  };

  // Memoize sensor metadata to avoid recalculation
  const sensorMetadata = useMemo(() => {
    if (!gateway || !sensorId) return null;
    return getSensorMetadata(sensorId as string, id as string);
  }, [gateway, sensorId, id, linkedEntities, grows, entityStates, sensorState]);

  // Memoize grow data for SensorGraph
  const growData = useMemo(() => {
    if (!sensorMetadata) return undefined;
    return grows.find((g) => g.name === sensorMetadata.growName);
  }, [grows, sensorMetadata]);

  // Calculate stage start date based on current stage
  const stageStartDate = useMemo(() => {
    if (!growData || !growData.current_stage) {
      console.log(`[SensorDetailScreen] No stageStartDate - growData: ${!!growData}, current_stage: ${growData?.current_stage}`);
      return undefined;
    }
    
    let calculatedDate: string | undefined;
    
    switch (growData.current_stage) {
      case 'inoculation':
        calculatedDate = growData.inoculation_date;
        break;
      case 'spawn_colonization':
        calculatedDate = growData.spawn_start_date;
        break;
      case 'bulk_colonization':
        calculatedDate = growData.bulk_start_date;
        break;
      case 'fruiting':
        calculatedDate = growData.fruiting_start_date;
        break;
      case 'harvest':
        // For harvest stage, use the last stage that had a start date
        calculatedDate = growData.fruiting_start_date || growData.bulk_start_date || growData.spawn_start_date || growData.inoculation_date;
        break;
      default:
        calculatedDate = undefined;
    }
    
    console.log(`[SensorDetailScreen] Stage start date calculation:`, {
      current_stage: growData.current_stage,
      grow_name: growData.name,
      calculatedDate,
      available_dates: {
        inoculation_date: growData.inoculation_date,
        spawn_start_date: growData.spawn_start_date,
        bulk_start_date: growData.bulk_start_date,
        fruiting_start_date: growData.fruiting_start_date,
      }
    });
    
    return calculatedDate;
  }, [growData]);

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

  return (
    <ScrollView className="flex-1 bg-background-50">
      <VStack className="p-4" space="md">
        {/* Sensor Graph */}
        <SensorGraph 
          gateway={gateway} 
          sensorEntityId={sensorId as string}
          grow={growData}
          sensorMetadata={sensorMetadata}
          stageStartDate={stageStartDate}
        />
      </VStack>
    </ScrollView>
  );
}
