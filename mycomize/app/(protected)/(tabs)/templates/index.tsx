import React, { useState, useEffect, useContext, useCallback } from 'react';
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
import {
  Modal,
  ModalBackdrop,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from '~/components/ui/modal';
import { Spinner } from '~/components/ui/spinner';
import { useToast, Toast } from '~/components/ui/toast';
import {
  PlusIcon,
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
import { TemplateCard } from '~/components/grow/TemplateCard';
import { CountBadge } from '~/components/ui/count-badge';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';

interface MonotubTekTemplate {
  id: number;
  name: string;
  description?: string;
  species: string;
  variant?: string;
  tek_type: string;
  difficulty: string;
  estimated_timeline?: number;
  tags?: string[];
  is_public: boolean;
  created_by: number;
  created_at: string;
  usage_count: number;
  creator_name?: string;
}

export default function TemplatesLibraryScreen() {
  const { token } = useContext(AuthContext);
  const router = useRouter();
  const toast = useToast();
  const { theme } = useTheme();

  const [templates, setTemplates] = useState<MonotubTekTemplate[]>([]);
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
      setTemplates([]);

      // Load both public and private templates
      const [publicResponse, myResponse] = await Promise.all([
        fetch(`${getBackendUrl()}/monotub-tek-templates/public?limit=100`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${getBackendUrl()}/monotub-tek-templates/my?limit=100`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (!publicResponse.ok || !myResponse.ok) {
        if (publicResponse.status === 401 || myResponse.status === 401) {
          router.replace('/login');
          return;
        }
        throw new Error('Failed to load templates');
      }

      const [publicData, myData] = await Promise.all([publicResponse.json(), myResponse.json()]);

      // Combine and deduplicate templates
      const allTemplates = [...publicData, ...myData];
      const uniqueTemplates = allTemplates.filter(
        (template, index, self) => index === self.findIndex((t) => t.id === template.id)
      );

      setTemplates(uniqueTemplates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
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

  // Sort templates function
  const sortTemplates = (templatesToSort: MonotubTekTemplate[]) => {
    return [...templatesToSort].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'species':
          return (a.species || '').localeCompare(b.species || '');
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // Most recent first
        case 'usage_count':
          return b.usage_count - a.usage_count; // Most used first
        case 'difficulty':
          const difficultyOrder = ['beginner', 'intermediate', 'advanced'];
          const diffA = difficultyOrder.indexOf(a.difficulty.toLowerCase());
          const diffB = difficultyOrder.indexOf(b.difficulty.toLowerCase());
          return diffA - diffB;
        default:
          return 0;
      }
    });
  };

  // Calculate filtered counts
  const publicTemplates = templates.filter((template) => template.is_public);
  const privateTemplates = templates.filter((template) => !template.is_public);

  // Filter and sort templates based on search query and filter
  const filteredAndSortedTemplates = sortTemplates(
    templates.filter((template) => {
      // Filter by public/private
      const matchesFilter =
        filterBy === 'all' ||
        (filterBy === 'public' && template.is_public) ||
        (filterBy === 'private' && !template.is_public);

      // Search filter
      if (searchQuery === '') {
        return matchesFilter;
      }

      const searchLower = searchQuery?.toLowerCase() ?? '';
      const matchesSearch =
        (template.name?.toLowerCase()?.includes(searchLower) ?? false) ||
        (template.species?.toLowerCase()?.includes(searchLower) ?? false) ||
        (template.description?.toLowerCase()?.includes(searchLower) ?? false) ||
        (template.variant?.toLowerCase()?.includes(searchLower) ?? false) ||
        (template.difficulty?.toLowerCase()?.includes(searchLower) ?? false) ||
        (template.creator_name?.toLowerCase()?.includes(searchLower) ?? false) ||
        (template.tags?.some((tag) => tag.toLowerCase().includes(searchLower)) ?? false);

      return matchesFilter && matchesSearch;
    })
  );

  // Toast functions
  const showToast = (message: string, type: 'error' | 'success') => {
    const toastId = Math.random().toString();
    const bgColor = 'bg-background-0';
    const textColor =
      type === 'error'
        ? theme === 'dark'
          ? 'text-error-600'
          : 'text-error-700'
        : theme === 'dark'
          ? 'text-green-600'
          : 'text-green-700';
    const descColor = 'text-typography-300';

    toast.show({
      id: `${type}-toast-${toastId}`,
      placement: 'top',
      duration: 3000,
      render: () => (
        <Toast variant="outline" className={`mx-auto mt-28 w-full p-4 ${bgColor}`}>
          <VStack space="xs" className="w-full">
            <HStack className="flex-row gap-2">
              <Icon
                as={type === 'error' ? AlertCircle : CheckCircle}
                className={`mt-0.5 ${textColor}`}
              />
              <Text className={`font-semibold ${textColor}`}>
                {type === 'error' ? 'Error' : 'Success'}
              </Text>
            </HStack>
            <Text className={descColor}>{message}</Text>
          </VStack>
        </Toast>
      ),
    });
  };

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
      setError(null);
    }
  }, [error, theme]);

  const handleTemplatePress = (template: MonotubTekTemplate) => {
    router.push(`/templates/${template.id}`);
  };

  const handleUseTemplate = (template: MonotubTekTemplate) => {
    router.push(`/templates/${template.id}/use`);
  };

  const handleEditTemplate = (template: MonotubTekTemplate) => {
    router.push(`/templates/${template.id}`);
  };

  const handleDeleteTemplate = async (template: MonotubTekTemplate) => {
    try {
      const response = await fetch(`${getBackendUrl()}/monotub-tek-templates/${template.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.replace('/login');
          return;
        }
        throw new Error('Failed to delete template');
      }

      showToast('Template deleted successfully', 'success');
      await fetchData(); // Refresh the list
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete template', 'error');
    }
  };

  const handleConvertToGrow = (template: MonotubTekTemplate) => {
    router.push({
      pathname: '/grows/new',
      params: { fromTemplate: template.id.toString() },
    });
  };

  const getFilterDisplayText = () => {
    switch (filterBy) {
      case 'public':
        return 'Public Only';
      case 'private':
        return 'Private Only';
      default:
        return 'All Templates';
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
      <VStack className="flex-1 items-center justify-center bg-background-50">
        <Spinner size="large" />
        <Text className="mt-4">Loading templates...</Text>
      </VStack>
    );
  }

  return templates.length === 0 ? (
    <VStack className="flex-1 items-center justify-center gap-5 bg-background-50">
      <Icon as={Layers} size="xl" className="text-typography-400" />
      <Text className="text-center text-lg text-typography-600">Create Your First Template!</Text>
      <Button
        variant="solid"
        className="h-16 w-16 rounded-full"
        action="positive"
        onPress={() => router.push('/templates/new')}>
        <ButtonIcon as={PlusIcon} className="h-8 w-8 text-white" />
      </Button>
    </VStack>
  ) : (
    <ScrollView className="m-0 flex-1 bg-background-50">
      <VStack className="items-center gap-4 pb-16">
        <View className="mt-2" />

        {/* Template Control Card */}
        <Card className="mx-4 w-11/12 bg-background-0">
          <VStack className="p-2" space="md">
            <HStack className="">
              <HStack className="items-center gap-2">
                <Icon as={Layers} size="xl" className="text-typography-900" />
                <Heading size="xl">Tek Library</Heading>
              </HStack>
              <HStack className="ml-auto items-center gap-2">
                <CountBadge count={templates.length} label="TOTAL" variant="success" />
                {publicTemplates.length > 0 && (
                  <CountBadge count={publicTemplates.length} label="PUBLIC" variant="green-dark" />
                )}
                {privateTemplates.length > 0 && (
                  <CountBadge count={privateTemplates.length} label="PRIVATE" variant="warning" />
                )}
              </HStack>
            </HStack>

            <Input className="mt-2">
              <InputIcon as={Search} className="ml-3" />
              <InputField
                placeholder="Search templates..."
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
              <Pressable onPress={() => router.push('/templates/new')}>
                <Icon className="text-white" as={PlusIcon} size="lg" />
              </Pressable>
            </HStack>
          </VStack>
        </Card>

        {/* Template Cards */}
        {filteredAndSortedTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onPress={handleTemplatePress}
            onUseTemplate={handleUseTemplate}
            onDelete={handleDeleteTemplate}
            onEdit={handleEditTemplate}
            onConvertToGrow={handleConvertToGrow}
          />
        ))}

        {filteredAndSortedTemplates.length === 0 && (searchQuery || filterBy !== 'all') && (
          <VStack className="items-center justify-center p-8">
            <Icon as={Layers} size="xl" className="text-typography-400" />
            <Text className="text-center text-typography-500">
              {searchQuery && filterBy !== 'all'
                ? `No ${getFilterDisplayText().toLowerCase()} found matching "${searchQuery}"`
                : searchQuery
                  ? `No templates found matching "${searchQuery}"`
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
            <Heading size="lg">Sort Templates</Heading>
            <ModalCloseButton onPress={() => setShowSortModal(false)}>
              <Icon as={X} />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <VStack space="lg">
              <Text className="text-typography-600">Choose how to sort your templates:</Text>
              <VStack space="md">
                {[
                  { value: 'name', label: 'Name' },
                  { value: 'species', label: 'Species' },
                  { value: 'created_at', label: 'Created Date' },
                  { value: 'usage_count', label: 'Usage Count' },
                  { value: 'difficulty', label: 'Difficulty' },
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
            <Heading size="lg">Filter Templates</Heading>
            <ModalCloseButton onPress={() => setShowFilterModal(false)}>
              <Icon as={X} />
            </ModalCloseButton>
          </ModalHeader>
          <ModalBody>
            <VStack space="lg">
              <Text className="text-typography-600">Choose which templates to display:</Text>
              <VStack space="md">
                {[
                  {
                    value: 'all',
                    label: 'All Templates',
                    description: 'Show both public and private templates',
                  },
                  {
                    value: 'public',
                    label: 'Public Only',
                    description: 'Show only publicly shared templates',
                  },
                  {
                    value: 'private',
                    label: 'Private Only',
                    description: 'Show only your private templates',
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
                <ButtonText>Apply Filter</ButtonText>
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </ScrollView>
  );
}
