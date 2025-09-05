import React from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Icon } from '~/components/ui/icon';
import { Pressable } from '~/components/ui/pressable';
import { View } from '~/components/ui/view';
import { Divider } from '~/components/ui/divider';
import { Heading } from '~/components/ui/heading';
import { useRouter } from 'expo-router';
import {
  SquarePen,
  Trash2,
  Wifi,
  WifiOff,
  PowerOff,
  RadioTower,
  Link,
  Gauge,
} from 'lucide-react-native';

import { IoTGateway } from '~/lib/iot/iot';
import { ConnectionStatus } from '~/lib/types/iotTypes';
import { InfoBadge, InfoBadgeVariant } from '~/components/ui/info-badge';
import { useLinkedEntitiesByGateway } from '~/lib/stores/iot/entityStore';
import { useConnectionStatus } from '~/lib/stores/iot/gatewayStore';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

interface IoTGatewayCardProps {
  gateway: IoTGateway;
  onDelete: (gateway: IoTGateway) => void;
}

export const IoTGatewayCard: React.FC<IoTGatewayCardProps> = ({
  gateway,
  onDelete,
}) => {
  const router = useRouter();
  const linkedEntities = useLinkedEntitiesByGateway(gateway.id);
  
  // Get connection status and latency from store
  const { status: connectionStatus, latency } = useConnectionStatus(gateway.id);

  // Calculate linked grows count inline
  const uniqueGrowIds = new Set();

  linkedEntities.forEach(entity => {
    if (entity.linked_grow_id) {
      uniqueGrowIds.add(entity.linked_grow_id);
    }
  });

  const linkedGrowsCount = uniqueGrowIds.size;

  // Helper function to get InfoBadge props from connection status
  const getConnectionBadgeProps = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return {
          text: 'CONNECTED',
          icon: Wifi,
          variant: 'success' as InfoBadgeVariant,
        };
      case 'connecting':
        return {
          text: 'CONNECTING',
          icon: RadioTower,
          variant: 'info' as InfoBadgeVariant,
        };
      case 'disconnected':
        return {
          text: 'DISCONNECTED',
          icon: PowerOff,
          variant: 'error' as InfoBadgeVariant,
        };
      default:
        return {
          text: 'UNKNOWN',
          icon: WifiOff,
          variant: 'error' as InfoBadgeVariant,
        };
    }
  };

  return (
    <VStack className="border-t border-outline-50 py-4 px-6 bg-background-0 w-full">
      <View>
        {/* Header with gateway name and type */}
        <HStack className="mb-4 items-center justify-between">
          <Heading
            size="lg"
            className="flex-1 text-typography-700"
            numberOfLines={1}
            ellipsizeMode="tail">
            {gateway.name || 'Unnamed Gateway'}
          </Heading>
          <HStack className="items-center" space="sm">
            <Icon as={Link} className="text-typography-500" size="sm" />
            <Text
              className="text-typography-500"
              numberOfLines={1}
              ellipsizeMode="middle">
              {gateway.api_url || 'No URL set'}
            </Text>
          </HStack>
        </HStack>

        {/* Connection Status Line */}
        {connectionStatus === 'connected' && 
          <HStack className="mb-4 items-center justify-around mx-3">
            <FontAwesome name="mobile-phone" size={34} color="#acacac" />
            <View className="mx-2 flex-1 border-b-2 border-success-300" />
            <InfoBadge {...getConnectionBadgeProps(connectionStatus)} size="md" />
            <View className="mx-2 flex-1 border-b-2 border-success-300" />
            <MaterialCommunityIcons name="home-assistant" size={30} color="#acacac" />
          </HStack>
        }

        {connectionStatus === 'connecting' && 
          <HStack className="mb-3 items-center justify-around mx-3">
            <FontAwesome name="mobile-phone" size={34} color="#acacac" />
            <View className="mx-2 flex-1 border-b-2 border-purple-700" />
            <InfoBadge {...getConnectionBadgeProps(connectionStatus)} size="md" />
            <View className="mx-2 flex-1 border-b-2 border-outline-300 border-dotted" />
            <MaterialCommunityIcons name="home-assistant" size={30} color="#acacac" />
          </HStack>
        }
        
        {connectionStatus !== 'connecting' && connectionStatus !== 'connected' && 
          <HStack className="mb-3 items-center justify-around mx-3">
            <FontAwesome name="mobile-phone" size={34} color="#acacac" />
            <View className="mx-2 flex-1 border-b-2 border-outline-300 border-dotted" />
            <InfoBadge {...getConnectionBadgeProps(connectionStatus)} size="md" />
            <View className="mx-2 flex-1 border-b-2 border-outline-300 border-dotted" />
            <MaterialCommunityIcons name="home-assistant" size={30} color="#acacac" />
          </HStack>
        }

        <HStack className="mb-2 items-center">
          <Text className="">Latency</Text>
          <HStack className="ml-auto items-center" space="xs">
            {latency !== undefined && connectionStatus === 'connected' && (
              <InfoBadge icon={Gauge} text={` ${latency} ms`} variant="healthy" size="sm"/>
            )}
          </HStack>
        </HStack>

        {/* Linked Entities */}
        <HStack className="mb-2 items-center">
          <Text className="">Linked Controls</Text>
          <HStack className="ml-auto">
            <InfoBadge
              text={`${linkedEntities.length} CONTROLS`}
              variant="default"
              size="sm"
            />
          </HStack>
        </HStack>

        {/* Linked Grows */}
        <HStack className="mb-2 items-center">
          <Text className="">Linked Grows</Text>
          <HStack className="ml-auto">
            <InfoBadge
              text={`${linkedGrowsCount} GROWS`}
              variant="default"
              size="sm"
            />
          </HStack>
        </HStack>

        {/* Action controls */}
        <HStack className="mt-2 justify-around" space="md">
          <Pressable
            onPress={() => {
              router.push({
                pathname: `/iot/[id]`,
                params: { id: gateway.id },
              });
            }}>
            <Icon as={SquarePen} size="md" className="text-typography-300" />
          </Pressable>
          <Pressable onPress={() => onDelete(gateway)}>
            <Icon as={Trash2} size="md" className="text-typography-300" />
          </Pressable>
        </HStack>
      </View>
    </VStack>
  );
};
