import React, { useState, useContext, useCallback } from 'react';
import { Button, ButtonIcon, ButtonText } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { VStack } from '~/components/ui/vstack';
import { Card } from '~/components/ui/card';
import { Heading } from '~/components/ui/heading';
import { apiClient, isUnauthorizedError } from '~/lib/ApiClient';
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
} from 'lucide-react-native';
import { Pressable } from '~/components/ui/pressable';
import { View } from '~/components/ui/view';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import { AuthContext } from '~/lib/AuthContext';
import { IoTGateway, gatewayTypeLabels } from '~/lib/iot';
import { IntegrationCardSkeleton } from '~/components/iot/IntegrationCardSkeleton';
import { ConnectionStatus } from '~/components/ui/connection-status-badge';
import { InfoBadge, InfoBadgeVariant } from '~/components/ui/info-badge';
import { CountBadge } from '~/components/ui/count-badge';

interface AddIntegrationButtonProps {
  title: string;
  initial?: boolean;
}

const AddIntegrationButton: React.FC<AddIntegrationButtonProps> = ({ title, initial = false }) => {
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
        <ButtonIcon as={PlusIcon} className="h-8 w-8 text-white" />
      </Button>
    </>
  );
};

interface IntegrationCardProps {
  gateway: IoTGateway;
  token: string | null | undefined;
  connectionStatus: ConnectionStatus;
  latency?: number;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({
  gateway,
  token,
  connectionStatus,
  latency,
}) => {
  const router = useRouter();

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
        <VStack className="flex p-2">
          <Pressable
            onPress={() => {
              router.push({
                pathname: `/iot/[id]`,
                params: { id: gateway.id },
              });
            }}>
            <HStack className="mb-2 items-center">
              <VStack className="flex-1">
                <Heading size="lg">{gateway.name || 'Unnamed Integration'}</Heading>
                <Text size="sm" className="text-typography-500">
                  {gateway.type
                    ? gatewayTypeLabels[gateway.type as keyof typeof gatewayTypeLabels] ||
                      gateway.type
                    : 'Unknown Type'}
                </Text>
              </VStack>
              <HStack className="ml-auto items-center" space="xs">
                <InfoBadge {...getConnectionBadgeProps(connectionStatus)} />
                {latency !== undefined && connectionStatus === 'connected' && (
                  <CountBadge count={latency} label="ms" variant="green-dark" icon={Gauge} />
                )}
              </HStack>
            </HStack>

            {gateway.description && (
              <Text className="mb-2 text-sm text-typography-600">{gateway.description}</Text>
            )}

            <HStack className="mb-1 mt-1">
              <Text className="text-base">API URL</Text>
              <Text className="ml-auto text-sm" numberOfLines={1} ellipsizeMode="middle">
                {gateway.api_url || 'No URL set'}
              </Text>
            </HStack>

            {gateway.grow_id && (
              <HStack className="mb-1 mt-1">
                <Text className="text-base">Grow ID</Text>
                <Text className="ml-auto">ID: {gateway.grow_id}</Text>
              </HStack>
            )}

            {!gateway.grow_id && (
              <HStack className="mb-1 mt-1">
                <Text className="text-base">Grow ID</Text>
                <Text className="ml-auto text-base">None</Text>
              </HStack>
            )}

            <Pressable
              className="ml-auto mt-2"
              onPress={() => {
                router.push({
                  pathname: `/iot/[id]`,
                  params: { id: gateway.id },
                });
              }}>
              <Icon as={SquarePen} size="xl" />
            </Pressable>
          </Pressable>
        </VStack>
      </Card>
    </>
  );
};

export default function IoTScreen() {
  const { token } = useContext(AuthContext);
  const router = useRouter();
  const [gateways, setGateways] = useState<IoTGateway[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [filterConnectedOnly, setFilterConnectedOnly] = useState<boolean>(false);
  const [showSortModal, setShowSortModal] = useState<boolean>(false);
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [tempSortBy, setTempSortBy] = useState<string>('name');
  const [tempFilterConnectedOnly, setTempFilterConnectedOnly] = useState<boolean>(false);
  const [connectionStatuses, setConnectionStatuses] = useState<Record<number, ConnectionStatus>>(
    {}
  );
  const [connectionLatencies, setConnectionLatencies] = useState<Record<number, number>>({});

  // Define the fetch function
  const fetchData = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      // Reset gateways before fetching to avoid stale data
      setGateways([]);

      const data: IoTGateway[] = await apiClient.get('/iot-gateways/', token, 'IoTGateway', true);
      const formattedGateways = data.map((gateway) => ({
        ...gateway,
        created_at: new Date(gateway.created_at),
      }));

      setGateways(formattedGateways);
      setLoading(false);
    } catch (error) {
      if (isUnauthorizedError(error as Error)) {
        router.replace('/login');
        return;
      }
      console.error('Exception fetching IoT gateways:', error);
      setLoading(false);
    }
  }, [token, router]);

  // Check connection status for all gateways
  const checkAllConnections = useCallback(async () => {
    const statusPromises = gateways.map(async (gateway) => {
      if (!gateway.is_active) {
        return {
          id: gateway.id,
          status: 'disconnected' as ConnectionStatus,
          latency: undefined,
        };
      }

      try {
        const startTime = Date.now();
        const response = await fetch(`${gateway.api_url}/api/`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${gateway.api_key}`,
            'Content-Type': 'application/json',
          },
        });
        const endTime = Date.now();
        const latency = endTime - startTime;

        return {
          id: gateway.id,
          status: response.ok
            ? ('connected' as ConnectionStatus)
            : ('disconnected' as ConnectionStatus),
          latency: response.ok ? latency : undefined,
        };
      } catch (err) {
        return {
          id: gateway.id,
          status: 'disconnected' as ConnectionStatus,
          latency: undefined,
        };
      }
    });

    const results = await Promise.all(statusPromises);
    const statusMap = results.reduce(
      (acc, result) => {
        acc[result.id] = result.status;
        return acc;
      },
      {} as Record<number, ConnectionStatus>
    );

    const latencyMap = results.reduce(
      (acc, result) => {
        if (result.latency !== undefined) {
          acc[result.id] = result.latency;
        }
        return acc;
      },
      {} as Record<number, number>
    );

    setConnectionStatuses(statusMap);
    setConnectionLatencies(latencyMap);
  }, [gateways]);

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
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // Most recent first
        case 'status':
          const statusA = a.is_active ? 'active' : 'inactive';
          const statusB = b.is_active ? 'active' : 'inactive';
          return statusA.localeCompare(statusB);
        default:
          return 0;
      }
    });
  };

  // Calculate connected gateways
  const connectedGateways = gateways.filter((gateway) => {
    return gateway.is_active && connectionStatuses[gateway.id] === 'connected';
  });

  // Filter and sort gateways based on search query and connected filter
  const filteredAndSortedGateways = sortGateways(
    gateways.filter((gateway) => {
      // Connected filter
      const isConnected = gateway.is_active && connectionStatuses[gateway.id] === 'connected';
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

  // Use useFocusEffect to refresh data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchData();

      // No cleanup needed for useFocusEffect in this case
      return () => {};
    }, [fetchData])
  );

  // Check connections when gateways change
  React.useEffect(() => {
    if (gateways.length > 0) {
      checkAllConnections();
    }
  }, [gateways, checkAllConnections]);

  if (loading) {
    return (
      <VStack className="flex-1 items-center gap-4 bg-background-50">
        <View className="mt-2" />
        {/* Show 2 skeleton cards while loading */}
        {Array.from({ length: 2 }).map((_, index) => (
          <IntegrationCardSkeleton key={index} />
        ))}
      </VStack>
    );
  }

  return gateways.length == 0 ? (
    <VStack className="flex-1 items-center justify-center gap-2 bg-background-50">
      <Text className="mb-4 text-center text-lg text-typography-600">
        Add your first IoT Gateway integration!
      </Text>
      <AddIntegrationButton title="Add Integration" initial={true} />
    </VStack>
  ) : (
    <ScrollView className="m-0 flex-1 bg-background-50">
      <VStack className="items-center gap-4 pb-16">
        <View className="mt-2" />

        {/* IoT Control Card */}
        <Card className="mx-4 w-11/12 bg-background-0">
          <VStack className="p-2" space="md">
            <HStack className="">
              <Heading size="xl" className="">
                IoT Control
              </Heading>
              <HStack className="ml-auto items-center gap-2">
                <CountBadge count={gateways.length} label="TOTAL" variant="success" />
                {connectedGateways.length > 0 && (
                  <CountBadge
                    count={connectedGateways.length}
                    label="CONNECTED"
                    variant="green-dark"
                  />
                )}
              </HStack>
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
                  <Icon as={X} size="sm" className="text-typography-500" />
                </Pressable>
              )}
            </Input>

            {/* Action Buttons */}
            <HStack className="mt-2 items-center justify-around gap-2">
              <Pressable onPress={handleSortModalOpen}>
                <Icon as={ArrowUpDown} size="lg" />
              </Pressable>
              <Pressable onPress={handleFilterModalOpen}>
                <Icon as={Filter} size="lg" />
              </Pressable>
              <Pressable
                onPress={() => {
                  router.push('/iot/new');
                }}>
                <Icon className="text-white" as={PlusIcon} size="lg" />
              </Pressable>
            </HStack>
          </VStack>
        </Card>

        {/* Gateway Cards */}
        {filteredAndSortedGateways.map((gateway, index) => (
          <IntegrationCard
            key={gateway.id}
            gateway={gateway}
            token={token}
            connectionStatus={connectionStatuses[gateway.id] || 'unknown'}
            latency={connectionLatencies[gateway.id]}
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
                  { value: 'created_at', label: 'Created Date' },
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
