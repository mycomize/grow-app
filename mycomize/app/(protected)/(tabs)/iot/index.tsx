import React, { useState, useContext, useCallback } from 'react';
import { Alert } from 'react-native';
import { Button, ButtonIcon, ButtonText } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { VStack } from '~/components/ui/vstack';
import { Card } from '~/components/ui/card';
import { Heading } from '~/components/ui/heading';
import { HStack } from '~/components/ui/hstack';
import { Icon } from '~/components/ui/icon';
import { Input, InputField, InputIcon } from '~/components/ui/input';
import { ScrollView } from '~/components/ui/scroll-view';
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from '~/components/ui/modal';
import {
  PlusIcon,
  SquarePen,
  Search,
  X,
  ArrowUpDown,
  Filter,
  Check,
  Gauge,
  Wifi,
  WifiOff,
  PowerOff,
  RadioTower,
  CircuitBoard,
  Trash2,
  CirclePlus,
  HouseWifi,
} from 'lucide-react-native';
import { Pressable } from '~/components/ui/pressable';
import { View } from '~/components/ui/view';
import { useRouter } from 'expo-router';

import { AuthContext } from '~/lib/api/AuthContext';
import { IoTGateway, gatewayTypeLabels } from '~/lib/iot/iot';
import { IoTGatewayCardSkeleton } from '~/components/iot/IoTGatewayCardSkeleton';
import { ConnectionStatus } from '~/components/ui/connection-status-badge';
import { InfoBadge, InfoBadgeVariant } from '~/components/ui/info-badge';
import { CountBadge } from '~/components/ui/count-badge';
import { useGateways, useGatewayLoading, useGatewayStore } from '~/lib/stores/iot/gatewayStore';
import { useLinkedEntitiesByGateway } from '~/lib/stores/iot/entityStore';

interface AddIoTGatewayButtonProps {
  title: string;
  initial?: boolean;
}

const AddIoTGatewayButton: React.FC<AddIoTGatewayButtonProps> = ({ title, initial = false }) => {
  const router = useRouter();

  return (
    <>
      <Button
        variant="solid"
        className={
          initial ? 'h-16 w-16 rounded-full' : 'absolute bottom-0 z-50 mb-4 h-12 w-11/12 rounded-md'
        }
        action="positive"
        onPress={() => {
          router.push('/iot/new');
        }}>
        <ButtonIcon as={PlusIcon} className="h-6 w-6 text-white" />
      </Button>
    </>
  );
};

interface IoTGatewayCardProps {
  gateway: IoTGateway;
  token: string | null | undefined;
  connectionStatus: ConnectionStatus;
  latency?: number;
  onDelete: (gateway: IoTGateway) => void;
}

const IoTGatewayCard: React.FC<IoTGatewayCardProps> = ({
  gateway,
  token,
  connectionStatus,
  latency,
  onDelete,
}) => {
  const router = useRouter();
  const linkedEntities = useLinkedEntitiesByGateway(gateway.id);

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
    <>
      <Card className="w-11/12 rounded-xl bg-background-0">
        <VStack className="flex p-0">
          <Pressable
            onPress={() => {
              router.push({
                pathname: `/iot/[id]`,
                params: { id: gateway.id },
              });
            }}>
            <HStack className="mb-2 items-center">
              <Heading size="lg" className="flex-1">
                {gateway.name || 'Unnamed IoTGateway'}
              </Heading>
              <HStack className="items-center" space="xs">
                <Text size="sm" className="text-typography-500">
                  {gateway.type
                    ? gatewayTypeLabels[gateway.type as keyof typeof gatewayTypeLabels] ||
                      gateway.type
                    : 'Unknown Type'}
                </Text>
                {gateway.type === 'home_assistant' && (
                  <Icon as={HouseWifi} size="md" className="text-typography-500" />
                )}
              </HStack>
            </HStack>

            <HStack className="mb-1 mt-1">
              <Text className="text-typography-600">API URL</Text>
              <Text className="text-md ml-auto" numberOfLines={1} ellipsizeMode="middle">
                {gateway.api_url || 'No URL set'}
              </Text>
            </HStack>

            <HStack className="mb-1 mt-1 items-center">
              <Text className="text-typography-600">Link Status</Text>
              <HStack className="ml-auto items-center" space="xs">
                <InfoBadge {...getConnectionBadgeProps(connectionStatus)} />
                {latency !== undefined && connectionStatus === 'connected' && (
                  <CountBadge count={latency} label="ms" variant="green-dark" icon={Gauge} />
                )}
              </HStack>
            </HStack>

            <HStack className="mb-1 mt-1 items-center">
              <Text className="text-typography-600">IoT Controls</Text>
              <InfoBadge
                text={`${linkedEntities.length} LINKED`}
                variant="default"
                className="ml-auto"
              />
            </HStack>
          </Pressable>

          {/* Action controls */}
          <HStack className="mt-4 justify-around" space="md">
            <Pressable
              onPress={() => {
                router.push({
                  pathname: `/iot/[id]`,
                  params: { id: gateway.id },
                });
              }}>
              <Icon className="text-typography-300" as={SquarePen} size="md" />
            </Pressable>
            <Pressable onPress={() => onDelete(gateway)}>
              <Icon className="text-typography-300" as={Trash2} size="md" />
            </Pressable>
          </HStack>
        </VStack>
      </Card>
    </>
  );
};

export default function IoTScreen() {
  const { token } = useContext(AuthContext);
  const router = useRouter();

  // Zustand store hooks
  const gateways = useGateways();
  const loading = useGatewayLoading();
  const { deleteGateway } = useGatewayStore();
  const connectionStatuses = useGatewayStore((state) => state.connectionStatuses);
  const connectionLatencies = useGatewayStore((state) => state.connectionLatencies);

  // Local UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [filterConnectedOnly, setFilterConnectedOnly] = useState<boolean>(false);
  const [showSortModal, setShowSortModal] = useState<boolean>(false);
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [tempSortBy, setTempSortBy] = useState<string>('name');
  const [tempFilterConnectedOnly, setTempFilterConnectedOnly] = useState<boolean>(false);

  // Delete handler using store action
  const handleDelete = useCallback(
    async (gateway: IoTGateway) => {
      if (!token) return;

      Alert.alert(
        'Delete Gateway',
        `Are you sure you want to delete "${gateway.name || 'Unnamed IoTGateway'}"? This action cannot be undone.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                const success = await deleteGateway(token, gateway.id.toString());
                if (!success) {
                  Alert.alert('Error', 'Failed to delete the gateway. Please try again.');
                }
              } catch (error) {
                // Error handling including login redirect is done in the store
                console.error('Error deleting gateway:', error);
              }
            },
          },
        ],
        { cancelable: true }
      );
    },
    [token, deleteGateway]
  );

  // Modal handler functions
  const handleSortModalOpen = () => {
    setTempSortBy(sortBy);
    setShowSortModal(true);
  };

  const handleSortConfirm = () => {
    setSortBy(tempSortBy);
    setShowSortModal(false);
  };

  const handleFilterModalOpen = () => {
    setTempFilterConnectedOnly(filterConnectedOnly);
    setShowFilterModal(true);
  };

  const handleFilterConfirm = () => {
    setFilterConnectedOnly(tempFilterConnectedOnly);
    setShowFilterModal(false);
  };

  // Sort gateways function
  const sortGateways = (gatewaysToSort: IoTGateway[]) => {
    return [...gatewaysToSort].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'type':
          return (a.type || '').localeCompare(b.type || '');
        case 'status':
          const statusA = 'active'; // Gateways are always active if they exist
          const statusB = 'active'; // Gateways are always active if they exist
          return statusA.localeCompare(statusB);
        default:
          return 0;
      }
    });
  };

  // Calculate connected gateways
  const connectedGateways = gateways.filter((gateway) => {
    return connectionStatuses[gateway.id] === 'connected';
  });

  // Filter and sort gateways based on search query and connected filter
  const filteredAndSortedGateways = sortGateways(
    gateways.filter((gateway) => {
      // Connected filter
      const isConnected = connectionStatuses[gateway.id] === 'connected';
      const matchesConnectedFilter = !filterConnectedOnly || isConnected;

      // Search filter
      if (searchQuery === '') {
        return matchesConnectedFilter;
      }

      const searchLower = searchQuery?.toLowerCase() ?? '';
      const matchesSearch =
        (gateway.name?.toLowerCase()?.includes(searchLower) ?? false) ||
        (gateway.description?.toLowerCase()?.includes(searchLower) ?? false) ||
        (gateway.type?.toLowerCase()?.includes(searchLower) ?? false) ||
        (gateway.api_url?.toLowerCase()?.includes(searchLower) ?? false);

      return matchesConnectedFilter && matchesSearch;
    })
  );


  if (loading) {
    return (
      <VStack className="flex-1 items-center gap-4 bg-background-50">
        <View className="mt-2" />
        {/* Show 2 skeleton cards while loading */}
        {Array.from({ length: 2 }).map((_, index) => (
          <IoTGatewayCardSkeleton key={index} />
        ))}
      </VStack>
    );
  }

  return gateways.length == 0 ? (
    <VStack className="flex-1 items-center justify-center gap-5 bg-background-50">
      <Icon as={CircuitBoard} className="h-8 w-8 text-typography-400" />
      <Text className="text-center text-lg text-typography-600">Add your first IoT Gateway</Text>
      <AddIoTGatewayButton title="Add IoTGateway" initial={true} />
    </VStack>
  ) : (
    <ScrollView className="m-0 flex-1 bg-background-50">
      <VStack className="items-center gap-4 pb-16">
        <View className="mt-2" />

        {/* IoT Control Card */}
        <Card className="mx-4 w-11/12 bg-background-0">
          <VStack className="p-2" space="md">
            <HStack className="items-center" space="sm">
              <Icon as={CircuitBoard} size="xl" className="text-typography-600" />
              <CountBadge count={gateways.length} label="TOTAL" variant="success" />
              {connectedGateways.length > 0 && (
                <CountBadge
                  count={connectedGateways.length}
                  label="CONNECTED"
                  variant="green-dark"
                />
              )}
            </HStack>

            <Input className="mt-2">
              <InputIcon as={Search} className="ml-3" />
              <InputField
                placeholder="Search gateways..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery && (
                <Pressable onPress={() => setSearchQuery('')} className="pr-3">
                  <Icon as={X} size="sm" className="text-typography-700" />
                </Pressable>
              )}
            </Input>

            {/* Action Buttons */}
            <HStack className="mt-2 items-center justify-around gap-2">
              <Pressable onPress={handleSortModalOpen}>
                <Icon className="text-typography-300" as={ArrowUpDown} size="md" />
              </Pressable>
              <Pressable onPress={handleFilterModalOpen}>
                <Icon className="text-typography-300" as={Filter} size="md" />
              </Pressable>
              <Pressable
                onPress={() => {
                  router.push('/iot/new');
                }}>
                <Icon className="text-typography-300" as={CirclePlus} size="md" />
              </Pressable>
            </HStack>
          </VStack>
        </Card>

        {/* IoT Gateway Cards */}
        {filteredAndSortedGateways.map((gateway, index) => (
          <IoTGatewayCard
            key={gateway.id}
            gateway={gateway}
            token={token}
            connectionStatus={connectionStatuses[gateway.id] || 'unknown'}
            latency={connectionLatencies[gateway.id]}
            onDelete={handleDelete}
          />
        ))}

        {filteredAndSortedGateways.length === 0 && (searchQuery || filterConnectedOnly) && (
          <VStack className="items-center justify-center p-8">
            <Text className="text-center text-typography-500">
              {searchQuery && filterConnectedOnly
                ? `No connected gateways found matching "${searchQuery}"`
                : searchQuery
                  ? `No gateways found matching "${searchQuery}"`
                  : 'No connected gateways found'}
            </Text>
          </VStack>
        )}
      </VStack>

      {/* Sort Modal */}
      <Modal isOpen={showSortModal} onClose={() => setShowSortModal(false)} size="md">
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Heading size="lg">Sort Gateways</Heading>
            <ModalCloseButton onPress={() => setShowSortModal(false)}>
              <Icon as={X} />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <VStack space="lg">
              <Text className="text-typography-600">Choose how to sort your gateways:</Text>
              <VStack space="md">
                {[
                  { value: 'name', label: 'Name' },
                  { value: 'type', label: 'Type' },
                  { value: 'status', label: 'Status' },
                ].map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => setTempSortBy(option.value)}
                    className="flex-row items-center justify-between rounded-lg border border-outline-200 p-4">
                    <Text className="text-typography-900">{option.label}</Text>
                    {tempSortBy === option.value && (
                      <Icon as={Check} className="text-success-600" size="sm" />
                    )}
                  </Pressable>
                ))}
              </VStack>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack space="sm" className="w-full justify-end">
              <Button variant="outline" onPress={() => setShowSortModal(false)}>
                <ButtonText>Cancel</ButtonText>
              </Button>
              <Button action="positive" onPress={handleSortConfirm}>
                <ButtonText>Apply Sort</ButtonText>
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Filter Modal */}
      <Modal isOpen={showFilterModal} onClose={() => setShowFilterModal(false)} size="md">
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Heading size="lg">Filter Gateways</Heading>
            <ModalCloseButton onPress={() => setShowFilterModal(false)}>
              <Icon as={X} />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <VStack space="lg">
              <Text className="text-typography-600">Choose which gateways to display:</Text>
              <VStack space="md">
                {[
                  {
                    value: false,
                    label: 'All Gateways',
                    description: 'Show all gateways regardless of connection status',
                  },
                  {
                    value: true,
                    label: 'Connected Only',
                    description: 'Show only gateways that are currently connected',
                  },
                ].map((option) => (
                  <Pressable
                    key={option.value.toString()}
                    onPress={() => setTempFilterConnectedOnly(option.value)}
                    className="rounded-lg border border-outline-200 p-4">
                    <HStack className="items-center justify-between">
                      <VStack className="flex-1">
                        <Text className="text-typography-900">{option.label}</Text>
                        <Text className="text-sm text-typography-600">{option.description}</Text>
                      </VStack>
                      {tempFilterConnectedOnly === option.value && (
                        <Icon as={Check} className="text-success-600" size="sm" />
                      )}
                    </HStack>
                  </Pressable>
                ))}
              </VStack>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack space="sm" className="w-full justify-end">
              <Button variant="outline" onPress={() => setShowFilterModal(false)}>
                <ButtonText>Cancel</ButtonText>
              </Button>
              <Button action="positive" onPress={handleFilterConfirm}>
                <ButtonText>Apply Filter</ButtonText>
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </ScrollView>
  );
}
