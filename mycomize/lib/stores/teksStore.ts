import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { router } from 'expo-router';
import { apiClient, isUnauthorizedError } from '../api/ApiClient';
import { BulkGrowTek, BulkGrowTekData, createEmptyTekData, generateId } from '../types/tekTypes';

// Helper function to handle unauthorized errors consistently
const handleUnauthorizedError = (error: Error) => {
  if (isUnauthorizedError(error)) {
    router.replace('/login');
    throw error;
  }
};

// Constants
const NEW_TEK_ID = -1;

// Current tek being edited/created
interface CurrentTek {
  id?: number; // NEW_TEK_ID for new, set for editing
  formData: BulkGrowTekData; // all form fields
}

// Tek modification tracking
type TekAction = 'create' | 'update' | 'delete' | 'cancel' | null;

interface TeksStore {
  // State
  teks: BulkGrowTek[];
  loading: boolean;
  currentTek: CurrentTek | null;
  isSaving: boolean;

  // Smart fetching state
  hasInitiallyLoaded: boolean;
  lastModifiedTekId: number | null;
  lastAction: TekAction;

  // CRUD Actions
  fetchTeks: (token: string) => Promise<void>;
  createTek: (token: string, data: BulkGrowTekData) => Promise<BulkGrowTek | null>;
  updateTek: (token: string, id: string, data: BulkGrowTekData) => Promise<boolean>;
  deleteTek: (token: string, id: string) => Promise<boolean>;

  // Current tek actions
  initializeCurrentTek: (tekId?: string, tekToCopy?: string) => Promise<void>;
  updateCurrentTekField: (field: keyof BulkGrowTekData, value: any) => void;
  clearCurrentTek: () => void;

  // Tag management
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;

  // Saving state management
  setSaving: (saving: boolean) => void;

  // Engagement Actions
  likeTek: (token: string, tekId: string) => Promise<void>;
  viewTek: (token: string, tekId: string) => Promise<void>;
  importTek: (token: string, tekId: string) => Promise<void>;

  reset: () => void;
}

export const useTeksStore = create<TeksStore>((set, get) => {
  // Helper function to deep copy stage data with new IDs for copying teks
  const deepCopyStageData = (stageData: any) => {
    if (!stageData) return createEmptyTekData().stages.inoculation;

    return {
      items: (stageData.items || []).map((item: any) => ({
        ...item,
        id: generateId(),
      })),
      environmental_conditions: (stageData.environmental_conditions || []).map(
        (condition: any) => ({
          ...condition,
          id: generateId(),
        })
      ),
      tasks: (stageData.tasks || []).map((task: any) => ({
        ...task,
        id: generateId(),
      })),
      notes: stageData.notes || '',
    };
  };

  return {
    // Initial state
    teks: [],
    loading: false,
    currentTek: null,
    isSaving: false,

    // Smart fetching initial state
    hasInitiallyLoaded: false,
    lastModifiedTekId: null,
    lastAction: null,

  // Fetch all teks
  fetchTeks: async (token: string) => {
    try {
      set({ loading: true });

      const data: BulkGrowTek[] = await apiClient.getBulkGrowTeks(token);

      set({
        teks: data,
        loading: false,
        hasInitiallyLoaded: true,
      });
    } catch (error) {
      console.error('Error fetching teks:', error);
      set({ loading: false });
      handleUnauthorizedError(error as Error);
      throw error;
    }
  },

    // Create a new tek
    createTek: async (token: string, data: BulkGrowTekData) => {
      try {
        set({ isSaving: true });

        // Basic validation
        if (!data.name.trim()) {
          throw new Error('Tek name is required');
        }
        if (!data.species.trim()) {
          throw new Error('Species is required');
        }

        // Prepare data for API by removing empty values
        const apiData = { ...data };
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

        const newTek: BulkGrowTek = await apiClient.createBulkGrowTek(apiData, token);

        set((state) => ({
          teks: [...state.teks, newTek],
          lastModifiedTekId: newTek.id,
          lastAction: 'create',
          isSaving: false,
        }));

        return newTek;
      } catch (error) {
        console.error('Error creating tek:', error);
        set({ isSaving: false });
        handleUnauthorizedError(error as Error);
        throw error;
      }
    },

    // Update an existing tek
    updateTek: async (token: string, id: string, data: BulkGrowTekData) => {
      try {
        set({ isSaving: true });

        // Basic validation
        if (!data.name.trim()) {
          throw new Error('Tek name is required');
        }
        if (!data.species.trim()) {
          throw new Error('Species is required');
        }

        // Prepare data for API by removing empty values
        const apiData = { ...data };
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

        const updatedTek: BulkGrowTek = await apiClient.updateBulkGrowTek(id, apiData, token);

        // Update local state directly from PUT response
        set((state) => ({
          teks: state.teks.map((tek) =>
            tek.id.toString() === id ? updatedTek : tek
          ),
          lastModifiedTekId: updatedTek.id,
          lastAction: 'update',
          isSaving: false,
        }));

        return true;
      } catch (error) {
        console.error('Error updating tek:', error);
        set({ isSaving: false });
        handleUnauthorizedError(error as Error);
        throw error;
      }
    },

    // Delete a tek
    deleteTek: async (token: string, id: string) => {
      const tekIdNum = parseInt(id, 10);

      try {
        console.log(`[TeksStore] Deleting tek ${id} from backend`);
        await apiClient.deleteBulkGrowTek(id, token);

        console.log(`[TeksStore] Backend deletion successful, updating teks store state`);
        set((state) => ({
          teks: state.teks.filter((tek) => tek.id.toString() !== id),
          lastModifiedTekId: tekIdNum,
          lastAction: 'delete',
        }));

        console.log(`[TeksStore] Tek ${id} deletion completed successfully`);
        return true;
      } catch (error) {
        console.error('Error deleting tek:', error);
        handleUnauthorizedError(error as Error);
        return false;
      }
    },

    // Initialize current tek for editing/creating
    initializeCurrentTek: async (tekId?: string, tekToCopy?: string) => {
    const { teks } = get();

    if (!tekId || tekId === 'new') {
      // Check if we need to copy an existing tek
      if (tekToCopy) {
        try {
          console.log(`[TeksStore] Loading tek data for copying: ${tekToCopy}`);
          const parsedTek: BulkGrowTek = JSON.parse(tekToCopy);

          // Create new tek data based on the existing tek, but reset certain fields
          const copiedTekData: BulkGrowTekData = {
            name: `Copy of ${parsedTek.name}`,
            description: parsedTek.description || '',
            species: parsedTek.species,
            variant: parsedTek.variant || '',
            is_public: false, // Always start as private for copied teks
            tags: [...(parsedTek.tags || [])],
            stages: parsedTek.stages
              ? {
                  inoculation: deepCopyStageData(parsedTek.stages.inoculation),
                  spawn_colonization: deepCopyStageData(parsedTek.stages.spawn_colonization),
                  bulk_colonization: deepCopyStageData(parsedTek.stages.bulk_colonization),
                  fruiting: deepCopyStageData(parsedTek.stages.fruiting),
                  harvest: deepCopyStageData(parsedTek.stages.harvest),
                }
              : createEmptyTekData().stages,
          };

          set({
            currentTek: {
              id: NEW_TEK_ID,
              formData: copiedTekData,
            },
          });

          console.log(`[TeksStore] Successfully loaded tek data for copying`);
        } catch (error) {
          console.error('Error parsing tek data for copying:', error);
          
          // Fall back to empty tek if copying fails
          set({
            currentTek: {
              id: NEW_TEK_ID,
              formData: createEmptyTekData(),
            },
          });
        }
      } else {
        // New tek - initialize with empty form data
        set({
          currentTek: {
            id: NEW_TEK_ID,
            formData: createEmptyTekData(),
          },
        });
      }
    } else {
      // Existing tek - populate from saved data
      const tek = teks.find((t) => t.id.toString() === tekId);
      if (tek) {
        // Convert BulkGrowTek to BulkGrowTekData format for editing
        const tekFormData: BulkGrowTekData = {
          name: tek.name || '',
          description: tek.description || '',
          species: tek.species || '',
          variant: tek.variant || '',
          is_public: tek.is_public || false,
          tags: tek.tags || [],
          stages: tek.stages || {
            inoculation: { items: [], environmental_conditions: [], tasks: [], notes: '' },
            spawn_colonization: { items: [], environmental_conditions: [], tasks: [], notes: '' },
            bulk_colonization: { items: [], environmental_conditions: [], tasks: [], notes: '' },
            fruiting: { items: [], environmental_conditions: [], tasks: [], notes: '' },
            harvest: { items: [], environmental_conditions: [], tasks: [], notes: '' },
          },
        };

        set({
          currentTek: {
            id: tek.id,
            formData: tekFormData,
          },
        });
      }
    }
  },

  // Update a field in current tek form data
  updateCurrentTekField: (field: keyof BulkGrowTekData, value: any) => {
    set((state) => {
      if (!state.currentTek) return state;

      return {
        currentTek: {
          ...state.currentTek,
          formData: {
            ...state.currentTek.formData,
            [field]: value,
          },
        },
      };
    });
  },

  // Clear current tek
  clearCurrentTek: () => {
    set({ currentTek: null });
  },

  // Add tag to current tek
  addTag: (tag: string) => {
    set((state) => {
      if (!state.currentTek || !tag.trim()) return state;
      
      const trimmedTag = tag.trim();
      if (state.currentTek.formData.tags.includes(trimmedTag)) return state;

      return {
        currentTek: {
          ...state.currentTek,
          formData: {
            ...state.currentTek.formData,
            tags: [...state.currentTek.formData.tags, trimmedTag],
          },
        },
      };
    });
  },

  // Remove tag from current tek
  removeTag: (tagToRemove: string) => {
    set((state) => {
      if (!state.currentTek) return state;

      return {
        currentTek: {
          ...state.currentTek,
          formData: {
            ...state.currentTek.formData,
            tags: state.currentTek.formData.tags.filter((tag) => tag !== tagToRemove),
          },
        },
      };
    });
  },

  // Set saving state
  setSaving: (saving: boolean) => {
    set({ isSaving: saving });
  },

  // Like/Unlike a tek with optimistic updates
  likeTek: async (token: string, tekId: string) => {
    const { teks } = get();
    const tek = teks.find(t => t.id.toString() === tekId);
    
    if (!tek) {
      console.error('Tek not found for like action:', tekId);
      return;
    }

    // Store original state for rollback
    const originalUserHasLiked = tek.user_has_liked;
    const originalLikeCount = tek.like_count;

    // Optimistic update
    const newUserHasLiked = !originalUserHasLiked;
    const newLikeCount = originalUserHasLiked 
      ? Math.max(0, originalLikeCount - 1) 
      : originalLikeCount + 1;

    set((state) => ({
      teks: state.teks.map(t => 
        t.id.toString() === tekId
          ? { 
              ...t, 
              user_has_liked: newUserHasLiked,
              like_count: newLikeCount
            }
          : t
      )
    }));

    try {
      await apiClient.likeBulkGrowTek(tekId, token);
      // Success - the optimistic update is kept
      console.log(`[TeksStore] Successfully toggled like for tek ${tekId}`);
    } catch (error) {
      console.error('Error toggling like:', error);
      handleUnauthorizedError(error as Error);
      
      // Rollback optimistic update on error
      set((state) => ({
        teks: state.teks.map(t => 
          t.id.toString() === tekId
            ? { 
                ...t, 
                user_has_liked: originalUserHasLiked,
                like_count: originalLikeCount
              }
            : t
        )
      }));
      
      throw error;
    }
  },

  // Track view for a tek with optimistic updates
  viewTek: async (token: string, tekId: string) => {
    const { teks } = get();
    const tek = teks.find(t => t.id.toString() === tekId);
    
    if (!tek) {
      console.error('Tek not found for view action:', tekId);
      return;
    }

    // Only track if user hasn't viewed already
    if (tek.user_has_viewed) {
      return;
    }

    // Optimistic update
    set((state) => ({
      teks: state.teks.map(t => 
        t.id.toString() === tekId
          ? { 
              ...t, 
              user_has_viewed: true,
              view_count: t.view_count + 1
            }
          : t
      )
    }));

    try {
      await apiClient.trackBulkGrowTekView(tekId, token);
      console.log(`[TeksStore] Successfully tracked view for tek ${tekId}`);
    } catch (error) {
      console.error('Error tracking view:', error);
      handleUnauthorizedError(error as Error);
      
      // Rollback optimistic update on error
      set((state) => ({
        teks: state.teks.map(t => 
          t.id.toString() === tekId
            ? { 
                ...t, 
                user_has_viewed: false,
                view_count: Math.max(0, t.view_count - 1)
              }
            : t
        )
      }));
      
      throw error;
    }
  },

  // Track import for a tek with optimistic updates
  importTek: async (token: string, tekId: string) => {
    const { teks } = get();
    const tek = teks.find(t => t.id.toString() === tekId);
    
    if (!tek) {
      console.error('Tek not found for import action:', tekId);
      return;
    }

    // Store original state for potential rollback
    const originalUserHasImported = tek.user_has_imported;
    const originalImportCount = tek.import_count;

    // Optimistic update - always increment import count, but only set user_has_imported once
    set((state) => ({
      teks: state.teks.map(t => 
        t.id.toString() === tekId
          ? { 
              ...t, 
              user_has_imported: true,
              import_count: t.import_count + 1
            }
          : t
      )
    }));

    try {
      await apiClient.trackBulkGrowTekImport(tekId, token);
      console.log(`[TeksStore] Successfully tracked import for tek ${tekId}`);
    } catch (error) {
      console.error('Error tracking import:', error);
      handleUnauthorizedError(error as Error);
      
      // Rollback optimistic update on error
      set((state) => ({
        teks: state.teks.map(t => 
          t.id.toString() === tekId
            ? { 
                ...t, 
                user_has_imported: originalUserHasImported,
                import_count: originalImportCount
              }
            : t
        )
      }));
      
      throw error;
    }
  },

  // Reset store state
  reset: () => {
    set({
      teks: [],
      loading: false,
      currentTek: null,
      isSaving: false,
      hasInitiallyLoaded: false,
      lastModifiedTekId: null,
      lastAction: null,
    });
  },
  };
});

// Helper selectors for optimized subscriptions
export const useTeks = () => useTeksStore((state) => state.teks);
export const useTekById = (id: string) =>
  useTeksStore((state) => state.teks.find((t) => t.id.toString() === id));
export const useTekLoading = () => useTeksStore((state) => state.loading);
export const useTekSaving = () => useTeksStore((state) => state.isSaving);

// Current tek selectors for performance optimization
export const useCurrentTek = () => useTeksStore((state) => state.currentTek);
export const useCurrentTekFormData = () =>
  useTeksStore((state) => state.currentTek?.formData);
export const useCurrentTekId = () =>
  useTeksStore((state) => state.currentTek?.id);

// Individual action selectors to prevent infinite loops
export const useInitializeCurrentTek = () =>
  useTeksStore((state) => state.initializeCurrentTek);
export const useUpdateCurrentTekField = () =>
  useTeksStore((state) => state.updateCurrentTekField);
export const useClearCurrentTek = () => useTeksStore((state) => state.clearCurrentTek);

// Tag management selectors
export const useAddTag = () => useTeksStore((state) => state.addTag);
export const useRemoveTag = () => useTeksStore((state) => state.removeTag);

// CRUD action selectors
export const useFetchTeks = () => useTeksStore((state) => state.fetchTeks);
export const useCreateTek = () => useTeksStore((state) => state.createTek);
export const useUpdateTek = () => useTeksStore((state) => state.updateTek);
export const useDeleteTek = () => useTeksStore((state) => state.deleteTek);

// Engagement action selectors
export const useLikeTek = () => useTeksStore((state) => state.likeTek);
export const useViewTek = () => useTeksStore((state) => state.viewTek);
export const useImportTek = () => useTeksStore((state) => state.importTek);

// Export the NEW_TEK_ID constant for use in components
export { NEW_TEK_ID };
