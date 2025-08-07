import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Button, ButtonIcon, ButtonText } from '~/components/ui/button';
import { Heading } from '~/components/ui/heading';
import { Text } from '~/components/ui/text';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { ScrollView } from '~/components/ui/scroll-view';
import { apiClient, isUnauthorizedError } from '~/lib/ApiClient';
import { Icon } from '~/components/ui/icon';
import { Input, InputField, InputIcon } from '~/components/ui/input';
import { Pressable } from '~/components/ui/pressable';
import { Card } from '~/components/ui/card';
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from '~/components/ui/modal';
import { Skeleton, SkeletonText } from '~/components/ui/skeleton';
import { useUnifiedToast } from '~/components/ui/unified-toast';
import {
  Plus,
  CirclePlus,
  Search,
  X,
  ArrowUpDown,
  Filter,
  Check,
  Layers,
  AlertCircle,
  CheckCircle,
} from 'lucide-react-native';
import { View } from '~/components/ui/view';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '~/lib/AuthContext';
import { TekCard } from '~/components/tek/TekCard';
import { TekCardSkeleton } from '~/components/tek';
import { CountBadge } from '~/components/ui/count-badge';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';
import { BulkGrowTek } from '~/lib/tekTypes';

export default function TekLibraryScreen() {
  const { token } = useContext(AuthContext);
  const router = useRouter();
  const { showError, showSuccess } = useUnifiedToast();

  const [teks, setTeks] = useState<BulkGrowTek[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [filterBy, setFilterBy] = useState<string>('all'); // 'all', 'public', 'private'
  const [showSortModal, setShowSortModal] = useState<boolean>(false);
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [tempSortBy, setTempSortBy] = useState<string>('name');
  const [tempFilterBy, setTempFilterBy] = useState<string>('all');

  // Define the fetch function
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setTeks([]);

      // Load teks using the encrypted API client
      const allTeks = await apiClient.getBulkGrowTeks(token!);
      setTeks(allTeks);
    } catch (err) {
      if (isUnauthorizedError(err as Error)) {
        router.replace('/login');
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load teks');
    } finally {
      setLoading(false);
    }
  }, [token, router]);

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
    setTempFilterBy(filterBy);
    setShowFilterModal(true);
  };

  const handleFilterConfirm = () => {
    setFilterBy(tempFilterBy);
    setShowFilterModal(false);
  };

  // Sort teks function
  const sortTeks = (teksToSort: BulkGrowTek[]) => {
    return [...teksToSort].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'species':
          return (a.species || '').localeCompare(b.species || '');
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // Most recent first
        case 'usage_count':
          return b.usage_count - a.usage_count; // Most used first
        default:
          return 0;
      }
    });
  };

  // Calculate filtered counts
  const publicTeks = teks.filter((tek) => tek.is_public);
  const privateTeks = teks.filter((tek) => !tek.is_public);

  // Filter and sort teks based on search query and filter
  const filteredAndSortedTeks = sortTeks(
    teks.filter((tek) => {
      // Filter by public/private
      const matchesFilter =
        filterBy === 'all' ||
        (filterBy === 'public' && tek.is_public) ||
        (filterBy === 'private' && !tek.is_public);

      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        (() => {
          const searchLower = searchQuery?.toLowerCase() ?? '';
          return (
            (tek.name?.toLowerCase()?.includes(searchLower) ?? false) ||
            (tek.species?.toLowerCase()?.includes(searchLower) ?? false) ||
            (tek.description?.toLowerCase()?.includes(searchLower) ?? false) ||
            (tek.variant?.toLowerCase()?.includes(searchLower) ?? false) ||
            (tek.creator_name?.toLowerCase()?.includes(searchLower) ?? false) ||
            (tek.tags?.some((tag) => tag.toLowerCase().includes(searchLower)) ?? false)
          );
        })();

      return matchesFilter && matchesSearch;
    })
  );

  useEffect(() => {
    if (error) {
      showError(error);
      setError(null);
    }
  }, [error, showError]);

  const handleTekPress = (tek: BulkGrowTek) => {
    router.push(`/teks/${tek.id}`);
  };

  const handleUseTek = (tek: BulkGrowTek) => {
    router.push(`/teks/${tek.id}/use`);
  };

  const handleEditTek = (tek: BulkGrowTek) => {
    router.push(`/teks/${tek.id}`);
  };

  const handleDeleteTek = async (tek: BulkGrowTek) => {
    try {
      await apiClient.deleteBulkGrowTek(tek.id.toString(), token!);
      showSuccess('Tek deleted successfully');
      await fetchData(); // Refresh the list
    } catch (err) {
      if (isUnauthorizedError(err as Error)) {
        router.replace('/login');
        return;
      }
      showError(err instanceof Error ? err.message : 'Failed to delete tek');
    }
  };

  const handleUseForNewGrow = (tek: BulkGrowTek) => {
    router.push({
      pathname: '/grows/new',
      params: { fromTek: tek.id.toString() },
    });
  };

  const handleCopyToNewTek = async (tek: BulkGrowTek) => {
    try {
      // Fetch the full tek data including stages
      const fullTek = await apiClient.getBulkGrowTek(tek.id.toString(), token!);

      router.push({
        pathname: '/teks/new',
        params: { tekToCopy: JSON.stringify(fullTek) },
      });
    } catch (err) {
      if (isUnauthorizedError(err as Error)) {
        router.replace('/login');
        return;
      }
      showError(err instanceof Error ? err.message : 'Failed to load tek for copying');
    }
  };

  const handleTagPress = (tag: string) => {
    setSearchQuery(tag);
  };

  const getFilterDisplayText = () => {
    switch (filterBy) {
      case 'public':
        return 'Public Only';
      case 'private':
        return 'Private Only';
      default:
        return 'All Teks';
    }
  };

  // Use useFocusEffect to refresh data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchData();
      return () => {};
    }, [fetchData])
  );

  if (loading) {
    return (
      <ScrollView className="m-0 flex-1 bg-background-50">
        <VStack className="items-center gap-4 pb-16">
          <View className="mt-2" />

          {/* Tek Control Card Skeleton */}
          <Card className="mx-4 w-11/12 bg-background-0">
            <VStack className="p-2" space="md">
              <HStack className="">
                <HStack className="items-center gap-2">
                  <Skeleton className="h-8 w-8 rounded" />
                  <SkeletonText className="h-6 w-16" />
                  <SkeletonText className="h-6 w-20" />
                </HStack>
              </HStack>

              <HStack className="mt-2 items-center justify-around gap-2">
                <Skeleton className="h-6 w-6 rounded" />
                <Skeleton className="h-6 w-6 rounded" />
                <Skeleton className="h-6 w-6 rounded" />
              </HStack>
            </VStack>
          </Card>

          {/* Tek Card Skeletons */}
          {Array.from({ length: 3 }).map((_, index) => (
            <TekCardSkeleton key={index} />
          ))}
        </VStack>
      </ScrollView>
    );
  }

  return publicTeks.length === 0 && privateTeks.length === 0 ? (
    <VStack className="flex-1 items-center justify-center gap-5 bg-background-50">
      <Icon as={Layers} size="xl" className="text-typography-400" />
      <Text className="text-center text-lg ">Create your first tek to get started!</Text>
      <Button
        variant="solid"
        className="h-16 w-16 rounded-full"
        action="positive"
        onPress={() => router.push('/teks/new')}>
        <ButtonIcon as={Plus} className="h-6 w-6 text-white" />
      </Button>
    </VStack>
  ) : (
    <ScrollView className="m-0 flex-1 bg-background-50">
      <VStack className="items-center gap-4 pb-16">
        <View className="mt-2" />

        {/* Tek Control Card */}
        <Card className="mx-4 w-11/12 bg-background-0">
          <VStack className="p-2" space="md">
            <HStack className="">
              <HStack className="items-center gap-2">
                <Icon as={Layers} size="xl" className="text-typography-600" />
                <CountBadge count={teks.length} label="TOTAL" variant="success" />
                {publicTeks.length > 0 && (
                  <CountBadge count={publicTeks.length} label="PUBLIC" variant="green-dark" />
                )}
                {privateTeks.length > 0 && (
                  <CountBadge count={privateTeks.length} label="PRIVATE" variant="error" />
                )}
              </HStack>
            </HStack>

            <Input className="mt-2">
              <InputIcon as={Search} className="ml-3" />
              <InputField
                placeholder="Search teks..."
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
                <Icon className="text-typography-300" as={ArrowUpDown} size="md" />
              </Pressable>
              <Pressable onPress={handleFilterModalOpen}>
                <Icon className="text-typography-300" as={Filter} size="md" />
              </Pressable>
              <Pressable onPress={() => router.push('/teks/new')}>
                <Icon className="text-typography-300" as={CirclePlus} size="md" />
              </Pressable>
            </HStack>
          </VStack>
        </Card>

        {/* Tek Cards */}
        {filteredAndSortedTeks.map((tek) => (
          <TekCard
            key={tek.id}
            tek={tek}
            onPress={handleTekPress}
            onUseTek={handleUseTek}
            onDelete={handleDeleteTek}
            onEdit={handleEditTek}
            onUseForNewGrow={handleUseForNewGrow}
            onCopyToNewTek={handleCopyToNewTek}
            onTagPress={handleTagPress}
          />
        ))}

        {filteredAndSortedTeks.length === 0 && (searchQuery || filterBy !== 'all') && (
          <VStack className="items-center justify-center  gap-3 p-8">
            <Icon as={Layers} size="xl" className="text-typography-400" />
            <Text className="mt-0 text-center text-typography-500">
              {searchQuery && filterBy !== 'all'
                ? `No ${getFilterDisplayText().toLowerCase()} found matching "${searchQuery}"`
                : searchQuery
                  ? `No teks found matching "${searchQuery}"`
                  : `No ${getFilterDisplayText().toLowerCase()} found`}
            </Text>
          </VStack>
        )}
      </VStack>

      {/* Sort Modal */}
      <Modal isOpen={showSortModal} onClose={() => setShowSortModal(false)} size="md">
        <ModalBackdrop />
        <ModalContent>
          <ModalHeader>
            <Heading size="lg">Sort Teks</Heading>
            <ModalCloseButton onPress={() => setShowSortModal(false)}>
              <Icon as={X} />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <VStack space="lg">
              <Text className="text-typography-600">Choose how to sort your teks:</Text>
              <VStack space="md">
                {[
                  { value: 'name', label: 'Name' },
                  { value: 'species', label: 'Species' },
                  { value: 'created_at', label: 'Created Date' },
                  { value: 'usage_count', label: 'Usage Count' },
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
                <ButtonText className="text-typography-900">Apply Sort</ButtonText>
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
            <Heading size="lg">Filter Teks</Heading>
            <ModalCloseButton onPress={() => setShowFilterModal(false)}>
              <Icon as={X} />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <VStack space="lg">
              <Text className="text-typography-600">Choose which teks to display:</Text>
              <VStack space="md">
                {[
                  {
                    value: 'all',
                    label: 'All Teks',
                    description: 'Show both public and private teks',
                  },
                  {
                    value: 'public',
                    label: 'Public Only',
                    description: 'Show only publicly shared teks',
                  },
                  {
                    value: 'private',
                    label: 'Private Only',
                    description: 'Show only your private teks',
                  },
                ].map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => setTempFilterBy(option.value)}
                    className="rounded-lg border border-outline-200 p-4">
                    <HStack className="items-center justify-between">
                      <VStack className="flex-1">
                        <Text className="text-typography-900">{option.label}</Text>
                        <Text className="text-sm text-typography-600">{option.description}</Text>
                      </VStack>
                      {tempFilterBy === option.value && (
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
                <ButtonText className="text-typography-900">Apply Filter</ButtonText>
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </ScrollView>
  );
}
