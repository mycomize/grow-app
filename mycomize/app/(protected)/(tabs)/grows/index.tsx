import { useState, useContext, useCallback } from 'react';
import { Button, ButtonIcon, ButtonText } from '~/components/ui/button';
import { Heading } from '~/components/ui/heading';
import { Text } from '~/components/ui/text';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { ScrollView } from '~/components/ui/scroll-view';
import { Icon } from '~/components/ui/icon';
import { Input, InputField, InputIcon } from '~/components/ui/input';
import { Pressable } from '~/components/ui/pressable';
import { List, PlusIcon, Search, X, ArrowUpDown, Filter, CirclePlus } from 'lucide-react-native';
import { View } from '~/components/ui/view';
import { useRouter } from 'expo-router';
import { AuthContext } from '~/lib/api/AuthContext';
import { BulkGrowComplete, bulkGrowStatuses } from '~/lib/types/growTypes';
import { GrowCard } from '~/components/grow/GrowCard';
import { GrowCardSkeleton } from '~/components/grow/GrowCardSkeleton';
import { GrowFilterModal } from '~/components/modals/GrowFilterModal';
import { GrowSortModal, SortOption } from '~/components/modals/GrowSortModal';
import { useGrows, useGrowLoading, useGrowStore } from '~/lib/stores';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export default function GrowScreen() {
  const { token } = useContext(AuthContext);
  const router = useRouter();
  const grows = useGrows();
  const loading = useGrowLoading();
  const deleteGrowFromStore = useGrowStore((state) => state.deleteGrow);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterStage, setFilterStage] = useState<string>('');
  const [filterSpecies, setFilterSpecies] = useState<string>('');
  const [filterVariant, setFilterVariant] = useState<string>('');
  const [filterLocation, setFilterLocation] = useState<string>('');
  const [showSortModal, setShowSortModal] = useState<boolean>(false);
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [tempFilterStatus, setTempFilterStatus] = useState<string>('');
  const [tempFilterStage, setTempFilterStage] = useState<string>('');
  const [tempFilterSpecies, setTempFilterSpecies] = useState<string>('');
  const [tempFilterVariant, setTempFilterVariant] = useState<string>('');
  const [tempFilterLocation, setTempFilterLocation] = useState<string>('');

  // Delete grow function using store
  const deleteGrow = useCallback(
    async (growId: number) => {
      if (!token) return;
      try {
        await deleteGrowFromStore(token, growId.toString());
      } catch (error) {
        console.error('Exception deleting grow:', error);
      }
    },
    [token, deleteGrowFromStore]
  );

  // Modal handler functions
  const handleSortModalOpen = () => {
    setShowSortModal(true);
  };

  const handleFilterModalOpen = () => {
    setTempFilterStatus(filterStatus);
    setTempFilterStage(filterStage);
    setTempFilterSpecies(filterSpecies);
    setTempFilterVariant(filterVariant);
    setTempFilterLocation(filterLocation);
    setShowFilterModal(true);
  };

  const handleFilterConfirm = () => {
    setFilterStatus(tempFilterStatus);
    setFilterStage(tempFilterStage);
    setFilterSpecies(tempFilterSpecies);
    setFilterVariant(tempFilterVariant);
    setFilterLocation(tempFilterLocation);
    setShowFilterModal(false);
  };

  // Handle tag press - populate search query with tag
  const handleTagPress = (tag: string) => {
    setSearchQuery(tag);
  };

  const getSortDisplayText = () => {
    switch (sortBy) {
      case 'name':
        return 'Name';
      case 'species':
        return 'Species';
      case 'variant':
        return 'Variant';
      case 'inoculationDate':
        return 'Inoculation Date';
      case 'totalCost':
        return 'Total Cost';
      case 'wetYield':
        return 'Wet Yield';
      case 'dryYield':
        return 'Dry Yield';
      case 'duration':
        return 'Duration (Days)';
      default:
        return 'Name';
    }
  };

  // Calculate in-progress grows (have inoculation date but not harvested/completed)
  const inProgressGrows = grows.filter((grow) => {
    return (
      grow.inoculation_date &&
      grow.status !== bulkGrowStatuses.HARVESTED &&
      grow.status !== bulkGrowStatuses.COMPLETED
    );
  });

  // Sort grows function
  const sortGrows = (growsToSort: BulkGrowComplete[]) => {
    return [...growsToSort].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'species':
          return (a.species || '').localeCompare(b.species || '');
        case 'variant':
          return (a.variant || '').localeCompare(b.variant || '');
        case 'inoculationDate':
          const dateA = a.inoculation_date;
          const dateB = b.inoculation_date;
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          return new Date(dateB).getTime() - new Date(dateA).getTime(); // Most recent first
        case 'totalCost':
          const costA = a.total_cost || 0;
          const costB = b.total_cost || 0;
          return costB - costA; // Highest cost first
        case 'wetYield':
          const wetYieldA =
            a.flushes?.reduce((sum, flush) => sum + (parseFloat(flush.wet_yield_grams || '0') || 0), 0) || 0;
          const wetYieldB =
            b.flushes?.reduce((sum, flush) => sum + (parseFloat(flush.wet_yield_grams || '0') || 0), 0) || 0;
          return wetYieldB - wetYieldA; // Highest yield first
        case 'dryYield':
          const dryYieldA =
            a.flushes?.reduce((sum, flush) => sum + (parseFloat(flush.dry_yield_grams || '0') || 0), 0) || 0;
          const dryYieldB =
            b.flushes?.reduce((sum, flush) => sum + (parseFloat(flush.dry_yield_grams || '0') || 0), 0) || 0;
          return dryYieldB - dryYieldA; // Highest yield first
        case 'duration':
          const getDuration = (grow: BulkGrowComplete) => {
            if (!grow.inoculation_date) return 0;
            const startDate = new Date(grow.inoculation_date);
            const endDate =
              grow.status === bulkGrowStatuses.COMPLETED ||
              grow.status === bulkGrowStatuses.HARVESTED
                ? new Date(grow.flushes?.[grow.flushes.length - 1]?.harvest_date || new Date())
                : new Date();
            return Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          };
          const durationA = getDuration(a);
          const durationB = getDuration(b);
          return durationB - durationA; // Longest duration first
        default:
          return 0;
      }
    });
  };

  // Filter and sort grows based on search query and filters
  const filteredAndSortedGrows = sortGrows(
    grows.filter((grow) => {
      // Status filter
      const matchesStatusFilter = !filterStatus || grow.status === filterStatus;

      // Stage filter
      const matchesStageFilter = !filterStage || grow.current_stage === filterStage;

      // Species filter (case-insensitive partial match)
      const matchesSpeciesFilter =
        !filterSpecies ||
        (grow.species?.toLowerCase().includes(filterSpecies.toLowerCase()) ?? false);

      // Variant filter (case-insensitive partial match)
      const matchesVariantFilter =
        !filterVariant ||
        (grow.variant?.toLowerCase().includes(filterVariant.toLowerCase()) ?? false);

      // Location filter (case-insensitive partial match)
      const matchesLocationFilter =
        !filterLocation ||
        (grow.location?.toLowerCase().includes(filterLocation.toLowerCase()) ?? false);

      // Search filter
      if (searchQuery === '') {
        return (
          matchesStatusFilter &&
          matchesStageFilter &&
          matchesSpeciesFilter &&
          matchesVariantFilter &&
          matchesLocationFilter
        );
      }

      const searchLower = searchQuery?.toLowerCase() ?? '';
      const matchesSearch =
        (grow.name?.toLowerCase()?.includes(searchLower) ?? false) ||
        (grow.species?.toLowerCase()?.includes(searchLower) ?? false) ||
        (grow.variant?.toLowerCase()?.includes(searchLower) ?? false) ||
        (grow.current_stage?.toLowerCase()?.includes(searchLower) ?? false) ||
        (grow.status?.toLowerCase()?.includes(searchLower) ?? false) ||
        (grow.location?.toLowerCase()?.includes(searchLower) ?? false) ||
        (grow.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower)) ?? false);

      return (
        matchesStatusFilter &&
        matchesStageFilter &&
        matchesSpeciesFilter &&
        matchesVariantFilter &&
        matchesLocationFilter &&
        matchesSearch
      );
    })
  );


  if (loading) {
    return (
      <ScrollView className="m-0 flex-1 bg-background-[#181818]">
        <VStack className="flex-1 items-center gap-4">
          <View className="mt-2" />
          {/* Show 3 skeleton cards while loading */}
          {Array.from({ length: 1 }).map((_, index) => (
            <GrowCardSkeleton key={index} />
          ))}
        </VStack>
      </ScrollView>
    );
  }

  return grows.length == 0 ? (
      <VStack className="flex-1 items-center justify-center gap-5 bg-background-50">
        <MaterialCommunityIcons name="mushroom-outline" size={30} color="#888888" />
        <Text className="text-lg">Add your first grow</Text>
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
      <>
        <VStack className="items-center h-full gap-2 bg-background-0">

          {/* Dashboard Card */}
            <VStack className="px-6 pb-3 pt-5 w-full bg-background-0" space="md">
              <HStack className="">
                <HStack className="items-center gap-2">
                  <Icon as={List} size="xl" className="text-typography-900" />
                  <Heading size="xl">Grow List</Heading>
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
                  <Icon className="text-typography-300" as={CirclePlus} size="md" />
                </Pressable>
              </HStack>
            </VStack>

          <ScrollView className="w-full bg-background-50">
          {filteredAndSortedGrows.map((grow) => (
              <GrowCard key={grow.id} grow={grow} onDelete={deleteGrow} onTagPress={handleTagPress} />
          ))}
          </ScrollView>

          {filteredAndSortedGrows.length === 0 && searchQuery && (
            <VStack className="items-center justify-center p-8">
              <Text className="text-center text-typography-500">
                {searchQuery ? `No grows found matching "${searchQuery}"` : 'No active grows found'}
              </Text>
            </VStack>
          )}
        </VStack>

      {/* Sort Modal */}
      <GrowSortModal
        isOpen={showSortModal}
        onClose={() => setShowSortModal(false)}
        currentSort={sortBy}
        onSortChange={setSortBy}
      />

      {/* Filter Modal */}
      <GrowFilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filterStatus={filterStatus}
        filterStage={filterStage}
        filterSpecies={filterSpecies}
        filterVariant={filterVariant}
        filterLocation={filterLocation}
        tempFilterStatus={tempFilterStatus}
        tempFilterStage={tempFilterStage}
        tempFilterSpecies={tempFilterSpecies}
        tempFilterVariant={tempFilterVariant}
        tempFilterLocation={tempFilterLocation}
        setTempFilterStatus={setTempFilterStatus}
        setTempFilterStage={setTempFilterStage}
        setTempFilterSpecies={setTempFilterSpecies}
        setTempFilterVariant={setTempFilterVariant}
        setTempFilterLocation={setTempFilterLocation}
        onApplyFilters={handleFilterConfirm}
        onClearAll={() => {
          setTempFilterStatus('');
          setTempFilterStage('');
          setTempFilterSpecies('');
          setTempFilterVariant('');
          setTempFilterLocation('');
        }}
      />
      </>
  );
}
