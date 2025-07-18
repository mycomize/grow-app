import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'expo-router';
import { Keyboard } from 'react-native';
import { useToast, Toast } from '~/components/ui/toast';
import { useTheme } from '~/components/ui/themeprovider/themeprovider';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Icon } from '~/components/ui/icon';
import { AlertCircle, CheckCircle } from 'lucide-react-native';

import { AuthContext } from '~/lib/AuthContext';
import { getBackendUrl } from '~/lib/backendUrl';
import { BulkGrow, BulkGrowFlush } from '~/lib/growTypes';

type GrowData = BulkGrow;

const generateId = () => Math.floor(Math.random() * 1000000);

const defaultBulkGrowFlush: Partial<BulkGrowFlush> = {
  id: generateId(),
  bulk_grow_id: 0, // Will be set when saving
  harvest_date: undefined,
  wet_yield_grams: undefined,
  dry_yield_grams: undefined,
  concentration_mg_per_gram: undefined,
};

const createEmptyBulkGrow = (): BulkGrow => ({
  id: 0,
  name: '',
  description: '',
  species: '',
  variant: '',
  location: '',
  tags: [],
  inoculation_date: '',
  spawn_start_date: '',
  bulk_start_date: '',
  fruiting_start_date: '',
  full_spawn_colonization_date: '',
  full_bulk_colonization_date: '',
  fruiting_pin_date: '',

  inoculation_status: '',
  spawn_colonization_status: '',
  bulk_colonization_status: '',
  fruiting_status: '',
  current_stage: '',
  status: '',
  total_cost: 0,
  stages: {
    inoculation: { items: [], environmental_conditions: [], tasks: [], notes: '' },
    spawn_colonization: { items: [], environmental_conditions: [], tasks: [], notes: '' },
    bulk_colonization: { items: [], environmental_conditions: [], tasks: [], notes: '' },
    fruiting: { items: [], environmental_conditions: [], tasks: [], notes: '' },
    harvest: { items: [], environmental_conditions: [], tasks: [], notes: '' },
  },
});

interface UseGrowFormLogicProps {
  initialData?: BulkGrow;
  growId?: string;
  fromTek?: string;
}

export function useGrowFormLogic({ initialData, growId, fromTek }: UseGrowFormLogicProps = {}) {
  const { token } = useContext(AuthContext);
  const router = useRouter();
  const toast = useToast();
  const { theme } = useTheme();

  const [growData, setGrowData] = useState<GrowData>(initialData || createEmptyBulkGrow());
  const [flushes, setFlushes] = useState<BulkGrowFlush[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeDatePicker, setActiveDatePicker] = useState<string | null>(null);

  // Update grow data when initialData changes
  useEffect(() => {
    if (initialData) {
      setGrowData(initialData);
    }
  }, [initialData]);

  // Keyboard visibility tracking
  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Load grow data if editing existing grow or from tek
  useEffect(() => {
    if (growId === 'new' && fromTek) {
      // Load tek data for new grow
      const fetchTek = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`${getBackendUrl()}/bulk-grow-tek/${fromTek}`, {
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
            throw new Error('Failed to load tek');
          }

          const tekData = await response.json();

          // Populate grow data from tek - copy all basic tek fields
          setGrowData((prev) => ({
            ...prev,
            name: `${tekData.name} Grow`,
            description: tekData.description || '',
            species: tekData.species || '',
            variant: tekData.variant || '',
            tags: tekData.tags || [],
            tek: tekData.type === 'Bulk Grow' ? 'BulkGrow' : tekData.type || 'BulkGrow',
            // Keep space empty for user input
            space: '',
          }));
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load tek');
        } finally {
          setIsLoading(false);
        }
      };

      fetchTek();
      return;
    }

    if (!growId || growId === 'new') return;

    const fetchGrow = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${getBackendUrl()}/grows/${growId}`, {
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
          throw new Error('Failed to load grow');
        }

        const data = await response.json();

        // Convert numeric fields to strings for form inputs
        setGrowData(data);

        // Set up flushes based on flushes data from backend
        if (data.flushes && data.flushes.length > 0) {
          setFlushes(data.flushes);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load grow');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGrow();
  }, [growId, fromTek, token, router]);

  // Utility functions for date handling
  const parseDate = (dateString?: string): Date | null => {
    if (!dateString) return null;
    // Parse the date string in local timezone to avoid timezone issues
    // where dates appear one day earlier than selected
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed
  };

  const formatDateForAPI = (date: Date | null): string | undefined => {
    if (!date) return undefined;
    return date.toISOString().split('T')[0];
  };

  // Update grow data field
  const updateField = (field: string, value: any) => {
    // Handle flushes specially - update the flushes state
    if (field === 'flushes') {
      setFlushes(value);
      return;
    }
    setGrowData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle IoT Gateway linking
  const handleGatewayLinked = (gatewayId: number) => {
    // Relationship is handled by the backend IoT gateway linking endpoint
  };

  const handleGatewayUnlinked = () => {
    // Relationship is handled by the backend IoT gateway unlinking endpoint
  };

  // Handle date changes
  const handleDateChange = (field: string, date?: Date, event?: any) => {
    // If user cancelled, don't change anything
    if (event && event.type === 'dismissed') {
      setActiveDatePicker(null);
      return;
    }

    setActiveDatePicker(null);
    if (date) {
      // Handle flush dates differently from regular grow data fields
      if (field.startsWith('flush_')) {
        const flushId = field.replace('flush_', '');
        updateFlush(flushId, { harvest_date: formatDateForAPI(date) });
      } else {
        // Format the date as YYYY-MM-DD string for the API
        const formattedDate = formatDateForAPI(date);
        updateField(field as keyof GrowData, formattedDate);
      }
    }
  };

  // Flush management
  const addFlush = () => {
    setFlushes((prev) => [...prev, { ...defaultBulkGrowFlush, id: generateId() } as BulkGrowFlush]);
  };

  const updateFlush = (id: string, data: any) => {
    const numericId = parseInt(id);
    setFlushes((prev) =>
      prev.map((flush) => (flush.id === numericId ? { ...flush, ...data } : flush))
    );
  };

  const removeFlush = (id: string) => {
    const numericId = parseInt(id);
    setFlushes((prev) => prev.filter((flush) => flush.id !== numericId));
  };

  // Calculate total cost from stages data
  const calculateTotalCost = () => {
    if (!growData.stages) return growData.total_cost || 0;

    let totalCost = 0;
    Object.values(growData.stages).forEach((stage: any) => {
      if (stage?.items) {
        stage.items.forEach((item: any) => {
          totalCost += parseFloat(item.cost || '0') || 0;
        });
      }
    });

    return totalCost || growData.total_cost || 0;
  };

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
        <Toast variant="outline" className={`mx-auto mt-36 w-full p-4 ${bgColor}`}>
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

  // Delete grow
  const deleteGrow = async () => {
    if (!growId || growId === 'new') return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`${getBackendUrl()}/grows/${growId}`, {
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
        throw new Error('Failed to delete grow');
      }

      setSuccess('Grow deleted successfully!');
      setShowDeleteModal(false);

      // Navigate back to grows list after a brief delay
      setTimeout(() => {
        router.replace('/grows');
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete grow');
    } finally {
      setIsDeleting(false);
    }
  };

  // Save grow
  const saveGrow = async () => {
    // Basic validation
    if (!growData.name?.trim()) {
      setError('Grow name is required');
      return;
    }

    if (!growData.species?.trim()) {
      setError('Species is required');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Calculate total harvest weights from flushes
      const totalWetYield = flushes.reduce((sum, flush) => sum + (flush.wet_yield_grams || 0), 0);
      const totalDryYield = flushes.reduce((sum, flush) => sum + (flush.dry_yield_grams || 0), 0);
      const firstHarvestDate = flushes.find((f) => f.harvest_date)?.harvest_date;

      // Prepare data for API
      const apiData = {
        ...growData,
        total_cost: calculateTotalCost(),
        flushes: flushes, // Include flushes in the API data
      };

      // Remove undefined, null, and empty string values for optional fields
      Object.keys(apiData).forEach((key) => {
        const value = apiData[key as keyof typeof apiData];
        if (
          value === undefined ||
          value === null ||
          (typeof value === 'string' && value.trim() === '' && !['name', 'species'].includes(key))
        ) {
          delete apiData[key as keyof typeof apiData];
        }
      });

      let response;
      const isEdit = growId && growId !== 'new';

      if (isEdit) {
        // Update existing grow
        response = await fetch(`${getBackendUrl()}/grows/${growId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(apiData),
        });
      } else {
        // Create new grow
        response = await fetch(`${getBackendUrl()}/grows/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(apiData),
        });
      }

      if (!response.ok) {
        if (response.status === 401) {
          router.replace('/login');
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save grow');
      }

      const successMessage = isEdit ? 'Grow updated successfully!' : 'Grow saved successfully!';
      setSuccess(successMessage);

      // Navigate back to grows list after a brief delay
      setTimeout(() => {
        router.replace('/grows');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save grow');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle toast display
  useEffect(() => {
    if (error) {
      showToast(error, 'error');
      setError(null);
    }
  }, [error, theme]);

  useEffect(() => {
    if (success) {
      showToast(success, 'success');
      setSuccess(null);
    }
  }, [success, theme]);

  return {
    // Data
    growData,
    setGrowData,
    flushes,

    // State
    isLoading,
    isSaving,
    keyboardVisible,
    showDeleteModal,
    setShowDeleteModal,
    isDeleting,
    activeDatePicker,
    setActiveDatePicker,

    // Functions
    updateField,
    handleGatewayLinked,
    handleGatewayUnlinked,
    handleDateChange,
    parseDate,
    addFlush,
    updateFlush,
    removeFlush,
    deleteGrow,
    saveGrow,
  };
}
