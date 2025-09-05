import React, { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { Button, ButtonIcon, ButtonText } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { VStack } from '~/components/ui/vstack';
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
  Search,
  X,
  ArrowUpDown,
  Filter,
  Check,
  Wifi,
  CircuitBoard,
  CirclePlus,
} from 'lucide-react-native';
import { Pressable } from '~/components/ui/pressable';
import { View } from '~/components/ui/view';
import { useRouter } from 'expo-router';

import { useAuthToken } from '~/lib/stores/authEncryptionStore';
import { IoTGateway } from '~/lib/iot/iot';
import { IoTGatewayCard } from '~/components/iot/IoTGatewayCard';
import { IoTGatewayCardSkeleton } from '~/components/iot/IoTGatewayCardSkeleton';
import { InfoBadge } from '~/components/ui/info-badge';
import { useGateways, useGatewayLoading, useGatewayStore } from '~/lib/stores/iot/gatewayStore';

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


export default function IoTScreen() {
  const token = useAuthToken();
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
      <>
      <VStack className="items-center h-full gap-2 bg-background-0">

        {/* IoT Control Card */}
          <VStack className="px-6 pb-3 pt-5 w-full bg-background-0" space="md">
            <HStack className="items-center gap-2">
              <Icon as={CircuitBoard} size="xl" className="text-typography-600" />
              <Heading className="flex-1">IoT Gateway List</Heading>

              <InfoBadge variant='default' icon={Wifi} text={`${connectedGateways.length} CONNECTED`}/>
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

        {/* IoT Gateway Cards */}
        <ScrollView className="w-full bg-background-50">
          {filteredAndSortedGateways.map((gateway, index) => (
            <IoTGatewayCard
              key={gateway.id}
              gateway={gateway}
              onDelete={handleDelete}
            />
          ))}
        </ScrollView>

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
      </>
  );
}
