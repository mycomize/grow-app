import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { router } from 'expo-router';
import { apiClient, isUnauthorizedError } from '../api/ApiClient';
import {
  BulkGrowComplete,
  BulkGrowCreate,
  BulkGrowUpdate,
  BulkGrowFlush,
} from '../growTypes';

// Helper function to handle unauthorized errors consistently
const handleUnauthorizedError = (error: Error) => {
  if (isUnauthorizedError(error)) {
    router.replace('/login');
    throw error;
  }
};

// Generate unique IDs for flushes
const generateId = () => Math.floor(Math.random() * 1000000);

// Current grow being edited/created
interface CurrentGrow {
  id?: number; // undefined for new, set for editing
  formData: BulkGrowUpdate; // all form fields
  flushes: BulkGrowFlush[];
}

// Grow fetch strategy result
interface GrowFetchStrategy {
  shouldFetchAll: boolean;
  shouldFetchSingle: number | null;
}

// Grow modification tracking
type GrowAction = 'create' | 'update' | 'delete' | 'cancel' | null;

// Extended API types for flushes
interface BulkGrowCreateWithFlushes extends BulkGrowCreate {
  flushes?: BulkGrowFlush[];
}

interface BulkGrowUpdateWithFlushes extends BulkGrowUpdate {
  flushes?: BulkGrowFlush[];
}

interface GrowStore {
  // State
  grows: BulkGrowComplete[];
  loading: boolean;
  currentGrow: CurrentGrow | null;

  // Smart fetching state
  hasInitiallyLoaded: boolean;
  lastModifiedGrowId: number | null;
  lastAction: GrowAction;

  // CRUD Actions
  fetchGrows: (token: string) => Promise<void>;
  fetchSingleGrow: (token: string, growId: string) => Promise<void>;
  createGrow: (token: string, data: BulkGrowCreateWithFlushes) => Promise<BulkGrowComplete | null>;
  updateGrow: (token: string, id: string, data: BulkGrowUpdateWithFlushes) => Promise<boolean>;
  deleteGrow: (token: string, id: string) => Promise<boolean>;

  // Current grow actions
  initializeCurrentGrow: (growId?: string, fromTek?: string, token?: string) => Promise<void>;
  updateCurrentGrowField: (field: keyof BulkGrowUpdate | 'flushes', value: any) => void;
  clearCurrentGrow: () => void;

  // Flush management
  addFlush: () => void;
  updateFlush: (id: string, data: Partial<BulkGrowFlush>) => void;
  removeFlush: (id: string) => void;

  // Date handling utilities
  parseDate: (dateString?: string) => Date | null;
  formatDateForAPI: (date: Date | null) => string | undefined;

  // Smart fetching actions
  markGrowModified: (growId: number | null, action: GrowAction) => void;
  getGrowFetchStrategy: () => GrowFetchStrategy;
  clearFetchingState: () => void;

  reset: () => void;
}

// Create empty grow structure
const createEmptyBulkGrow = (): BulkGrowUpdate => ({
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
  s2b_ratio: '',
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

// Default flush structure
const defaultBulkGrowFlush: Omit<BulkGrowFlush, 'bulk_grow_id'> = {
  id: generateId(),
  harvest_date: undefined,
  wet_yield_grams: undefined,
  dry_yield_grams: undefined,
  concentration_mg_per_gram: undefined,
};

export const useGrowStore = create<GrowStore>((set, get) => ({
  // Initial state
  grows: [],
  loading: false,
  currentGrow: null,

  // Smart fetching initial state
  hasInitiallyLoaded: false,
  lastModifiedGrowId: null,
  lastAction: null,

  // Fetch all grows
  fetchGrows: async (token: string) => {
    try {
      set({ loading: true });

      const data: BulkGrowComplete[] = await apiClient.get('/grows/', token, 'BulkGrow', true);

      set({
        grows: data,
        loading: false,
        hasInitiallyLoaded: true,
      });
    } catch (error) {
      console.error('Error fetching grows:', error);
      set({ loading: false });
      handleUnauthorizedError(error as Error);
      throw error;
    }
  },

  // Fetch single grow (optimized selective fetch)
  fetchSingleGrow: async (token: string, growId: string) => {
    try {
      const data: BulkGrowComplete = await apiClient.getBulkGrow(growId, token);

      // Update only this grow in the array
      set((state) => ({
        grows: state.grows.map((grow) =>
          grow.id.toString() === growId ? data : grow
        ),
      }));
    } catch (error) {
      console.error('Error fetching single grow:', error);
      handleUnauthorizedError(error as Error);
      throw error;
    }
  },

  // Create a new grow
  createGrow: async (token: string, data: BulkGrowCreateWithFlushes) => {
    try {
      // Calculate total cost from stages data
      const calculateTotalCost = () => {
        if (!data.stages) return data.total_cost || 0;

        let totalCost = 0;
        Object.values(data.stages).forEach((stage: any) => {
          if (stage?.items) {
            stage.items.forEach((item: any) => {
              totalCost += parseFloat(item.cost || '0') || 0;
            });
          }
        });

        return totalCost || data.total_cost || 0;
      };

      // Prepare data for API
      const apiData = {
        ...data,
        total_cost: calculateTotalCost(),
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

      const newGrow: BulkGrowComplete = await apiClient.createBulkGrow(apiData, token);

      set((state) => ({
        grows: [...state.grows, newGrow],
        lastModifiedGrowId: newGrow.id,
        lastAction: 'create',
      }));

      return newGrow;
    } catch (error) {
      console.error('Error creating grow:', error);
      handleUnauthorizedError(error as Error);
      return null;
    }
  },

  // Update an existing grow
  updateGrow: async (token: string, id: string, data: BulkGrowUpdateWithFlushes) => {
    const updateStart = performance.now();
    console.log(`[GrowStore] Starting optimized grow update for grow ${id}`);

    try {
      // Calculate total cost from stages data
      const calculateTotalCost = () => {
        if (!data.stages) return data.total_cost || 0;

        let totalCost = 0;
        Object.values(data.stages).forEach((stage: any) => {
          if (stage?.items) {
            stage.items.forEach((item: any) => {
              totalCost += parseFloat(item.cost || '0') || 0;
            });
          }
        });

        return totalCost || data.total_cost || 0;
      };

      // Prepare data for API
      const apiData = {
        ...data,
        total_cost: calculateTotalCost(),
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

      const updatedGrow: BulkGrowComplete = await apiClient.updateBulkGrow(id, apiData, token);

      // Update local state directly from PUT response
      set((state) => ({
        grows: state.grows.map((grow) =>
          grow.id.toString() === id ? updatedGrow : grow
        ),
        lastModifiedGrowId: updatedGrow.id,
        lastAction: 'update',
      }));

      const updateEnd = performance.now();
      console.log(
        `[GrowStore] Optimized grow update completed in ${updateEnd - updateStart}ms - local state updated directly from PUT response`
      );

      return true;
    } catch (error) {
      console.error('Error updating grow:', error);
      handleUnauthorizedError(error as Error);
      return false;
    }
  },

  // Delete a grow
  deleteGrow: async (token: string, id: string) => {
    const growIdNum = parseInt(id, 10);

    try {
      console.log(`[GrowStore] Deleting grow ${id} from backend`);
      await apiClient.deleteBulkGrow(id, token);

      console.log(`[GrowStore] Backend deletion successful, updating grow store state`);
      set((state) => ({
        grows: state.grows.filter((grow) => grow.id.toString() !== id),
        lastModifiedGrowId: growIdNum,
        lastAction: 'delete',
      }));

      console.log(`[GrowStore] Grow ${id} deletion completed successfully`);
      return true;
    } catch (error) {
      console.error('Error deleting grow:', error);
      handleUnauthorizedError(error as Error);
      return false;
    }
  },

  // Initialize current grow for editing/creating
  initializeCurrentGrow: async (growId?: string, fromTek?: string, token?: string) => {
    const { grows } = get();

    if (!growId || growId === 'new') {
      // Check if we need to load tek data
      if (fromTek && token) {
        try {
          console.log(`[GrowStore] Loading tek data for new grow: ${fromTek}`);
          const tekData = await apiClient.getBulkGrowTek(fromTek, token);

          // Create grow data from tek
          const growFromTek: BulkGrowUpdate = {
            ...createEmptyBulkGrow(),
            name: `${tekData.name} Grow`,
            description: tekData.description || '',
            species: tekData.species || '',
            variant: tekData.variant || '',
            tags: tekData.tags || [],
            // Copy all stages data from tek including items, environmental_conditions, tasks, and notes
            stages: tekData.stages || {
              inoculation: { items: [], environmental_conditions: [], tasks: [], notes: '' },
              spawn_colonization: { items: [], environmental_conditions: [], tasks: [], notes: '' },
              bulk_colonization: { items: [], environmental_conditions: [], tasks: [], notes: '' },
              fruiting: { items: [], environmental_conditions: [], tasks: [], notes: '' },
              harvest: { items: [], environmental_conditions: [], tasks: [], notes: '' },
            },
          };

          set({
            currentGrow: {
              formData: growFromTek,
              flushes: [],
            },
          });

          console.log(`[GrowStore] Successfully loaded tek data for new grow`);
        } catch (error) {
          console.error('Error loading tek data:', error);
          handleUnauthorizedError(error as Error);
          
          // Fall back to empty grow if tek loading fails
          set({
            currentGrow: {
              formData: createEmptyBulkGrow(),
              flushes: [],
            },
          });
        }
      } else {
        // New grow - initialize with empty form data
        set({
          currentGrow: {
            formData: createEmptyBulkGrow(),
            flushes: [],
          },
        });
      }
    } else {
      // Existing grow - populate from saved data
      const grow = grows.find((g) => g.id.toString() === growId);
      if (grow) {
        set({
          currentGrow: {
            id: grow.id,
            formData: {
              name: grow.name || '',
              description: grow.description || '',
              species: grow.species || '',
              variant: grow.variant || '',
              location: grow.location || '',
              tags: grow.tags || [],
              inoculation_date: grow.inoculation_date || '',
              spawn_start_date: grow.spawn_start_date || '',
              bulk_start_date: grow.bulk_start_date || '',
              fruiting_start_date: grow.fruiting_start_date || '',
              full_spawn_colonization_date: grow.full_spawn_colonization_date || '',
              full_bulk_colonization_date: grow.full_bulk_colonization_date || '',
              fruiting_pin_date: grow.fruiting_pin_date || '',
              s2b_ratio: grow.s2b_ratio || '',
              inoculation_status: grow.inoculation_status || '',
              spawn_colonization_status: grow.spawn_colonization_status || '',
              bulk_colonization_status: grow.bulk_colonization_status || '',
              fruiting_status: grow.fruiting_status || '',
              current_stage: grow.current_stage || '',
              status: grow.status || '',
              total_cost: grow.total_cost || 0,
              stages: grow.stages || {
                inoculation: { items: [], environmental_conditions: [], tasks: [], notes: '' },
                spawn_colonization: { items: [], environmental_conditions: [], tasks: [], notes: '' },
                bulk_colonization: { items: [], environmental_conditions: [], tasks: [], notes: '' },
                fruiting: { items: [], environmental_conditions: [], tasks: [], notes: '' },
                harvest: { items: [], environmental_conditions: [], tasks: [], notes: '' },
              },
            },
            flushes: grow.flushes || [],
          },
        });
      }
    }
  },

  // Update a field in current grow form data
  updateCurrentGrowField: (field: keyof BulkGrowUpdate | 'flushes', value: any) => {
    set((state) => {
      if (!state.currentGrow) return state;

      // Handle flushes specially
      if (field === 'flushes') {
        return {
          currentGrow: {
            ...state.currentGrow,
            flushes: value,
          },
        };
      }

      return {
        currentGrow: {
          ...state.currentGrow,
          formData: {
            ...state.currentGrow.formData,
            [field]: value,
          },
        },
      };
    });
  },

  // Clear current grow
  clearCurrentGrow: () => {
    set({ currentGrow: null });
  },

  // Add flush
  addFlush: () => {
    set((state) => {
      if (!state.currentGrow) return state;

      const newFlush = {
        ...defaultBulkGrowFlush,
        id: generateId(),
        bulk_grow_id: state.currentGrow.id || 0,
      } as BulkGrowFlush;

      return {
        currentGrow: {
          ...state.currentGrow,
          flushes: [...state.currentGrow.flushes, newFlush],
        },
      };
    });
  },

  // Update flush
  updateFlush: (id: string, data: Partial<BulkGrowFlush>) => {
    const numericId = parseInt(id);
    set((state) => {
      if (!state.currentGrow) return state;

      return {
        currentGrow: {
          ...state.currentGrow,
          flushes: state.currentGrow.flushes.map((flush) =>
            flush.id === numericId ? { ...flush, ...data } : flush
          ),
        },
      };
    });
  },

  // Remove flush
  removeFlush: (id: string) => {
    const numericId = parseInt(id);
    set((state) => {
      if (!state.currentGrow) return state;

      return {
        currentGrow: {
          ...state.currentGrow,
          flushes: state.currentGrow.flushes.filter((flush) => flush.id !== numericId),
        },
      };
    });
  },

  // Date utilities
  parseDate: (dateString?: string): Date | null => {
    if (!dateString) return null;
    // Parse the date string in local timezone to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed
  },

  formatDateForAPI: (date: Date | null): string | undefined => {
    if (!date) return undefined;
    // Format date in local timezone to avoid timezone conversion issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // Smart fetching methods
  markGrowModified: (growId: number | null, action: GrowAction) => {
    set({
      lastModifiedGrowId: growId,
      lastAction: action,
    });
  },

  getGrowFetchStrategy: (): GrowFetchStrategy => {
    const { hasInitiallyLoaded, lastAction, lastModifiedGrowId } = get();

    // First time loading - fetch all
    if (!hasInitiallyLoaded) {
      return {
        shouldFetchAll: true,
        shouldFetchSingle: null,
      };
    }

    // Handle different actions
    switch (lastAction) {
      case 'create':
        // New grow created - fetch the new one
        return {
          shouldFetchAll: false,
          shouldFetchSingle: lastModifiedGrowId,
        };

      case 'update':
        // Grow updated - fetch it
        return {
          shouldFetchAll: false,
          shouldFetchSingle: lastModifiedGrowId,
        };

      case 'delete':
        // Grow deleted - state already updated, no fetching needed
        return {
          shouldFetchAll: false,
          shouldFetchSingle: null,
        };

      case 'cancel':
      case null:
      default:
        // No changes or cancelled - no operations needed
        return {
          shouldFetchAll: false,
          shouldFetchSingle: null,
        };
    }
  },

  clearFetchingState: () => {
    set({
      lastModifiedGrowId: null,
      lastAction: null,
    });
  },

  // Reset store state
  reset: () => {
    set({
      grows: [],
      loading: false,
      currentGrow: null,
      hasInitiallyLoaded: false,
      lastModifiedGrowId: null,
      lastAction: null,
    });
  },
}));

// Helper selectors for optimized subscriptions
export const useGrows = () => useGrowStore((state) => state.grows);
export const useGrowById = (id: string) =>
  useGrowStore((state) => state.grows.find((g) => g.id.toString() === id));
export const useGrowLoading = () => useGrowStore((state) => state.loading);

// Current grow selectors for performance optimization with proper caching
export const useCurrentGrow = () => useGrowStore((state) => state.currentGrow);
export const useCurrentGrowFormData = () =>
  useGrowStore((state) => state.currentGrow?.formData);

export const useCurrentGrowFlushes = () =>
  useGrowStore(
    useShallow((state) => state.currentGrow?.flushes || [])
  );

// Individual action selectors to prevent infinite loops
export const useInitializeCurrentGrow = () =>
  useGrowStore((state) => state.initializeCurrentGrow);
export const useUpdateCurrentGrowField = () =>
  useGrowStore((state) => state.updateCurrentGrowField);
export const useClearCurrentGrow = () => useGrowStore((state) => state.clearCurrentGrow);

// Date handling selectors
export const useParseDateUtility = () => useGrowStore((state) => state.parseDate);
export const useFormatDateForAPI = () => useGrowStore((state) => state.formatDateForAPI);

// Flush management selectors
export const useAddFlush = () => useGrowStore((state) => state.addFlush);
export const useUpdateFlush = () => useGrowStore((state) => state.updateFlush);
export const useRemoveFlush = () => useGrowStore((state) => state.removeFlush);
