import { useState, useEffect, useContext, useCallback } from 'react';
import { Button, ButtonIcon, ButtonText } from '~/components/ui/button';
import { Heading } from '~/components/ui/heading';
import { Text } from '~/components/ui/text';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { ScrollView } from '~/components/ui/scroll-view';
import { getBackendUrl } from '~/lib/backendUrl';
import { Icon } from '~/components/ui/icon';
import { Input, InputField, InputIcon } from '~/components/ui/input';
import { Pressable } from '~/components/ui/pressable';
import { Card } from '~/components/ui/card';
import MushroomIcon from '~/components/icons/MushroomIcon';
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
  List,
  PlusIcon,
  Search,
  X,
  ArrowUpDown,
  Filter,
  Check,
  Circle,
  CircleCheckBig,
} from 'lucide-react-native';
import { View } from '~/components/ui/view';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '~/lib/AuthContext';
import { BulkGrowComplete, bulkGrowStatuses, bulkGrowStages } from '~/lib/growTypes';
import { GrowCard } from '~/components/grow/GrowCard';
import { GrowCardSkeleton } from '~/components/grow/GrowCardSkeleton';
import { CountBadge } from '~/components/ui/count-badge';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';
import { getSwitchColors } from '~/lib/switchUtils';

export default function GrowScreen() {
  const { token } = useContext(AuthContext);
  const router = useRouter();
  const [grows, setGrows] = useState<BulkGrowComplete[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [filterActiveOnly, setFilterActiveOnly] = useState<boolean>(false);
  const [showSortModal, setShowSortModal] = useState<boolean>(false);
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [tempSortBy, setTempSortBy] = useState<string>('name');
  const [tempFilterActiveOnly, setTempFilterActiveOnly] = useState<boolean>(false);

  // Define the fetch function
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const url = getBackendUrl();
      // Reset grows before fetching to avoid stale data
      setGrows([]);

      const response = await fetch(`${url}/grows/all`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.replace('/login');
        } else {
          console.error('Failed to fetch grows:', response.statusText);
        }
        setLoading(false);
        return;
      }

      const data: BulkGrowComplete[] = await response.json();
      setGrows(data);
      setLoading(false);
    } catch (error) {
      console.error('Exception fetching grows:', error);
      setLoading(false);
    }
  }, [token, router]);

  // Delete grow function
  const deleteGrow = useCallback(
    async (growId: number) => {
      try {
        const url = getBackendUrl();
        const response = await fetch(`${url}/grows/${growId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            router.replace('/login');
          } else {
            console.error('Failed to delete grow:', response.statusText);
          }
          return;
        }

        // Remove the grow from the local state
        setGrows((prevGrows) => prevGrows.filter((grow) => grow.id !== growId));
      } catch (error) {
        console.error('Exception deleting grow:', error);
      }
    },
    [token, router]
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
    setTempFilterActiveOnly(filterActiveOnly);
    setShowFilterModal(true);
  };

  const handleFilterConfirm = () => {
    setFilterActiveOnly(tempFilterActiveOnly);
    setShowFilterModal(false);
  };

  const handleClearFiltersAndSort = () => {
    setSortBy('name');
    setFilterActiveOnly(false);
    setSearchQuery('');
  };

  const getSortDisplayText = () => {
    switch (sortBy) {
      case 'name':
        return 'Name';
      case 'species':
        return 'Species';
      case 'inoculationDate':
        return 'Inoculation Date';
      case 'stage':
        return 'Stage';
      default:
        return 'Name';
    }
  };

  const getFilterDisplayText = () => {
    return filterActiveOnly ? 'Active Only' : 'All Grows';
  };

  // Calculate in-progress grows (have inoculation date but not harvested)
  const inProgressGrows = grows.filter((grow) => {
    return grow.inoculation_date && grow.status !== bulkGrowStatuses.HARVESTED;
  });

  // Sort grows function
  const sortGrows = (growsToSort: BulkGrowComplete[]) => {
    return [...growsToSort].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'species':
          return (a.species || '').localeCompare(b.species || '');
        case 'inoculationDate':
          const dateA = a.inoculation_date;
          const dateB = b.inoculation_date;
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          return new Date(dateB).getTime() - new Date(dateA).getTime(); // Most recent first
        case 'stage':
          const stageOrder = [
            bulkGrowStages.INOCULATION,
            bulkGrowStages.SPAWN_COLONIZATION,
            bulkGrowStages.BULK_COLONIZATION,
            bulkGrowStages.FRUITING,
            bulkGrowStages.HARVEST,
          ];
          const stageA = stageOrder.indexOf(a.current_stage as any);
          const stageB = stageOrder.indexOf(b.current_stage as any);
          return stageA - stageB;
        default:
          return 0;
      }
    });
  };

  // Filter and sort grows based on search query and active filter
  const filteredAndSortedGrows = sortGrows(
    grows.filter((grow) => {
      // Active filter
      const isActive = grow.inoculation_date && grow.status !== bulkGrowStatuses.HARVESTED;
      const matchesActiveFilter = !filterActiveOnly || isActive;

      // Search filter
      if (searchQuery === '') {
        return matchesActiveFilter;
      }

      const searchLower = searchQuery?.toLowerCase() ?? '';
      const matchesSearch =
        (grow.name?.toLowerCase()?.includes(searchLower) ?? false) ||
        (grow.species?.toLowerCase()?.includes(searchLower) ?? false) ||
        (grow.variant?.toLowerCase()?.includes(searchLower) ?? false) ||
        (grow.current_stage?.toLowerCase()?.includes(searchLower) ?? false) ||
        (grow.status?.toLowerCase()?.includes(searchLower) ?? false) ||
        (grow.location?.toLowerCase()?.includes(searchLower) ?? false);

      return matchesActiveFilter && matchesSearch;
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

  if (loading) {
    return (
      <VStack className="flex-1 items-center gap-4 bg-background-50">
        <View className="mt-2" />
        {/* Show 3 skeleton cards while loading */}
        {Array.from({ length: 1 }).map((_, index) => (
          <GrowCardSkeleton key={index} />
        ))}
      </VStack>
    );
  }

  return grows.length == 0 ? (
    <VStack className="flex-1 items-center justify-center gap-5 bg-background-50">
      <MushroomIcon height={22} width={22} strokeWidth={2} color="#888888" />
      <Text className="text-lg">Add your first grow to get started!</Text>
      <Button
        variant="solid"
        className="h-16 w-16 rounded-full"
        action="positive"
        onPress={() => {
          router.push('/grows/new');
        }}>
        <ButtonIcon as={PlusIcon} className="h-6 w-6 text-white" />
      </Button>
    </VStack>
  ) : (
    <ScrollView className="m-0 flex-1 bg-background-50">
      <VStack className="items-center gap-4 pb-16">
        <View className="mt-2" />

        {/* Dashboard Card */}
        <Card className="mx-4 w-11/12 bg-background-0">
          <VStack className="p-2" space="md">
            <HStack className="">
              <HStack className="items-center gap-2">
                <Icon as={List} size="xl" className="text-typography-900" />
                <Heading size="xl">Grow List</Heading>
              </HStack>
              <HStack className="ml-auto items-center gap-2">
                <CountBadge count={grows.length} label="TOTAL" variant="success" />
                {inProgressGrows.length > 0 && (
                  <CountBadge count={inProgressGrows.length} label="ACTIVE" variant="green-dark" />
                )}
              </HStack>
            </HStack>

            <Input className="mt-2">
              <InputIcon as={Search} className="ml-3" />
              <InputField
                placeholder="Search grows..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery && (
                <Pressable onPress={() => setSearchQuery('')} className="pr-3">
                  <Icon as={X} size="sm" className="text-typography-500" />
                </Pressable>
              )}
            </Input>

            {/* Current Filter/Sort Status */}
            <HStack className="mt-2 items-center justify-around gap-2">
              <Pressable onPress={handleSortModalOpen}>
                <Icon as={ArrowUpDown} size="md" className="text-typography-300" />
              </Pressable>
              <Pressable onPress={handleFilterModalOpen}>
                <Icon as={Filter} size="md" className="text-typography-300" />
              </Pressable>
              <Pressable
                onPress={() => {
                  router.push('/grows/new');
                }}>
                <Icon className="text-typography-300" as={PlusIcon} size="md" />
              </Pressable>
            </HStack>
          </VStack>
        </Card>

        {/* Grow Cards */}
        {filteredAndSortedGrows.map((grow, index) => (
          <GrowCard key={index} grow={grow} onDelete={deleteGrow} />
        ))}

        {filteredAndSortedGrows.length === 0 && (searchQuery || filterActiveOnly) && (
          <VStack className="items-center justify-center p-8">
            <Text className="text-center text-typography-500">
              {searchQuery && filterActiveOnly
                ? `No active grows found matching "${searchQuery}"`
                : searchQuery
                  ? `No grows found matching "${searchQuery}"`
                  : 'No active grows found'}
            </Text>
          </VStack>
        )}
      </VStack>

      {/* Sort Modal */}
      <Modal isOpen={showSortModal} onClose={() => setShowSortModal(false)} size="md">
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Heading size="lg">Sort Grows</Heading>
            <ModalCloseButton onPress={() => setShowSortModal(false)}>
              <Icon as={X} />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <VStack space="lg">
              <Text className="text-typography-600">Choose how to sort your grows:</Text>
              <VStack space="md">
                {[
                  { value: 'name', label: 'Name' },
                  { value: 'species', label: 'Species' },
                  { value: 'inoculationDate', label: 'Inoculation Date' },
                  { value: 'stage', label: 'Stage' },
                ].map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => setTempSortBy(option.value)}
                    className="flex-row items-center justify-between rounded-lg border border-outline-200 p-4">
                    <Text className="text-typography-900">{option.label}</Text>
                    {tempSortBy === option.value && (
                      <Icon as={CircleCheckBig} className="text-success-500" size="xl" />
                    )}
                    {tempSortBy !== option.value && (
                      <Icon as={Circle} className="text-success-500" size="xl" />
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
                <ButtonText className="text-typography-900">Apply Sort</ButtonText>
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Filter Modal */}
      <Modal isOpen={showFilterModal} onClose={() => setShowFilterModal(false)} size="md">
        <ModalBackdrop style={{ backdropFilter: 'blur(100px)' }} />
        <ModalContent>
          <ModalHeader>
            <Heading size="lg">Filter Grows</Heading>
            <ModalCloseButton onPress={() => setShowFilterModal(false)}>
              <Icon as={X} />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <VStack space="lg">
              <Text className="text-typography-600">Choose which grows to display:</Text>
              <VStack space="md">
                {[
                  {
                    value: false,
                    label: 'All Grows',
                    description: 'Show all grows regardless of status',
                  },
                  {
                    value: true,
                    label: 'Active Only',
                    description: 'Show only grows that are currently active',
                  },
                ].map((option) => (
                  <Pressable
                    key={option.value.toString()}
                    onPress={() => setTempFilterActiveOnly(option.value)}
                    className="rounded-lg border border-outline-200 p-4">
                    <HStack className="items-center justify-between">
                      <VStack className="flex-1">
                        <Text className="text-typography-900">{option.label}</Text>
                        <Text className="text-sm text-typography-600">{option.description}</Text>
                      </VStack>
                      {tempFilterActiveOnly === option.value && (
                        <Icon as={CircleCheckBig} className="text-success-500" size="xl" />
                      )}
                      {tempFilterActiveOnly !== option.value && (
                        <Icon as={Circle} className="text-success-500" size="xl" />
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
                <ButtonText className="text-typography-900">Apply Filter</ButtonText>
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </ScrollView>
  );
}
