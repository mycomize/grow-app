import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { router } from 'expo-router';
import { apiClient, isUnauthorizedError } from '../api/ApiClient';
import {
  BulkGrowComplete,
  BulkGrowCreate,
  BulkGrowUpdate,
  BulkGrowFlush,
} from '../types/growTypes';
import { Task, generateId as generateTekId } from '../types/tekTypes';
import { useCalendarStore } from './calendarStore';

// Helper function to handle unauthorized errors consistently
const handleUnauthorizedError = (error: Error) => {
  if (isUnauthorizedError(error)) {
    router.replace('/login');
    throw error;
  }
};

// Generate unique IDs for flushes
const generateId = () => Math.floor(Math.random() * 1000000);

// Constants for calendar task management
export const NEW_GROW_ID = -1;

// Current grow being edited/created
interface CurrentGrow {
  id?: number; // undefined for new, set for editing
  formData: BulkGrowUpdate; // all form fields
  flushes: BulkGrowFlush[];
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

  // Task management for grows
  addTaskToStage: (stageKey: string, task: Task) => void;
  updateTaskInStage: (stageKey: string, taskId: string, updates: Partial<Task>) => void;
  deleteTaskFromStage: (stageKey: string, taskId: string) => void;
  getTasksForStage: (stageKey: string) => Task[];
  getStageStartDate: (stageKey: string) => string | undefined;

  // Calendar-specific task management
  toggleTaskCompletion: (taskId: string, growId: number, stageKey: string, token: string) => Promise<void>;
  deleteTaskFromGrow: (taskId: string, growId: number, stageKey: string, token: string) => Promise<void>;

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
  harvest_completion_date: '',
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

      const data: BulkGrowComplete[] = await apiClient.getBulkGrowsComplete(token);

      set({
        grows: data,
        loading: false,
        hasInitiallyLoaded: true,
      });
    } catch (error) {
      set({ loading: false });
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

      // Update local state optimistically, preserving flushes since PUT response doesn't include them
      set((state) => ({
        grows: state.grows.map((grow) => {
          if (grow.id.toString() === id) {
            // Merge PUT response with preserved flushes from current state and data
            return {
              ...updatedGrow,
              flushes: data.flushes || grow.flushes || [], // Use flushes from update data or keep existing
            };
          }
          return grow;
        }),
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

      // Clean up calendar tasks from zustand store (backend cascade delete handles database)
      const calendarStore = useCalendarStore.getState();
      const tasksToRemove = calendarStore.calendarTasks.filter(task => task.grow_id === growIdNum);
      
      if (tasksToRemove.length > 0) {
        console.log(`[GrowStore] Removing ${tasksToRemove.length} calendar tasks from zustand store for deleted grow ${id}`);
        calendarStore.calendarTasks = calendarStore.calendarTasks.filter(task => task.grow_id !== growIdNum);
      }

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
              harvest_completion_date: grow.harvest_completion_date || '',
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

      // Update the field first
      const updatedFormData = {
        ...state.currentGrow.formData,
        [field]: value,
      };


      return {
        currentGrow: {
          ...state.currentGrow,
          formData: updatedFormData,
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

  // Task management for grows
  addTaskToStage: (stageKey: string, task: Task) => {
    set((state) => {
      if (!state.currentGrow?.formData?.stages) return state;
      
      const stages = state.currentGrow.formData.stages;
      const currentStageData = stages[stageKey as keyof typeof stages];
      
      if (!currentStageData) return state;

      // Get the stage start date if it exists
      const stageDateFields = {
        'inoculation': 'inoculation_date',
        'spawn_colonization': 'spawn_start_date', 
        'bulk_colonization': 'bulk_start_date',
        'fruiting': 'fruiting_start_date'
      };
      
      const dateField = stageDateFields[stageKey as keyof typeof stageDateFields];
      const stageStartDate = dateField ? state.currentGrow.formData[dateField as keyof BulkGrowUpdate] : undefined;

      const newTask = { 
        ...task, 
        id: task.id || generateTekId() // Only generate new ID if task doesn't have one
      };

      return {
        ...state,
        currentGrow: {
          ...state.currentGrow,
          formData: {
            ...state.currentGrow.formData,
            stages: {
              ...stages,
              [stageKey]: {
                ...currentStageData,
                tasks: [...currentStageData.tasks, newTask]
              }
            }
          }
        }
      };
    });
  },

  updateTaskInStage: (stageKey: string, taskId: string, updates: Partial<Task>) => {
    set((state) => {
      if (!state.currentGrow?.formData?.stages) return state;

      const stages = state.currentGrow.formData.stages;
      const currentStageData = stages[stageKey as keyof typeof stages];
      
      if (!currentStageData) return state;

      const updatedTasks = currentStageData.tasks.map((task: Task) =>
        task.id === taskId ? { ...task, ...updates } : task
      );

      return {
        ...state,
        currentGrow: {
          ...state.currentGrow,
          formData: {
            ...state.currentGrow.formData,
            stages: {
              ...stages,
              [stageKey]: {
                ...currentStageData,
                tasks: updatedTasks
              }
            }
          }
        }
      };
    });
  },

  deleteTaskFromStage: (stageKey: string, taskId: string) => {
    set((state) => {
      if (!state.currentGrow?.formData?.stages) return state;

      const stages = state.currentGrow.formData.stages;
      const currentStageData = stages[stageKey as keyof typeof stages];
      
      if (!currentStageData) return state;

      const updatedTasks = currentStageData.tasks.filter((task: Task) => task.id !== taskId);

      return {
        ...state,
        currentGrow: {
          ...state.currentGrow,
          formData: {
            ...state.currentGrow.formData,
            stages: {
              ...stages,
              [stageKey]: {
                ...currentStageData,
                tasks: updatedTasks
              }
            }
          }
        }
      };
    });

    // Clean up any CalendarTasks from local state (backend cleanup happens on save)
    const calendarStore = useCalendarStore.getState();
    const currentGrowId = get().currentGrow?.id;
    if (currentGrowId) {
      // Remove from local state only - backend cleanup happens when grow is saved
      calendarStore.calendarTasks = calendarStore.calendarTasks.filter(
        task => !(task.parent_task_id === taskId && task.grow_id === currentGrowId)
      );
    }
  },

  getTasksForStage: (stageKey: string): Task[] => {
    const { currentGrow } = get();
    if (!currentGrow?.formData?.stages) return [];
    
    const stages = currentGrow.formData.stages;
    const stage = stages[stageKey as keyof typeof stages];
    return stage ? stage.tasks : [];
  },

  getStageStartDate: (stageKey: string): string | undefined => {
    const { currentGrow } = get();
    if (!currentGrow?.formData) return undefined;

    // Map stage keys to their corresponding date fields
    const stageDateMap: Record<string, string | undefined> = {
      inoculation: currentGrow.formData.inoculation_date,
      spawn_colonization: currentGrow.formData.spawn_start_date,
      bulk_colonization: currentGrow.formData.bulk_start_date,
      fruiting: currentGrow.formData.fruiting_start_date,
      harvest: currentGrow.formData.harvest_completion_date
    };

    return stageDateMap[stageKey];
  },

  // Calendar-specific task completion toggle
  toggleTaskCompletion: async (taskId: string, growId: number, stageKey: string, token: string) => {
    try {
      const { grows } = get();
      const grow = grows.find(g => g.id === growId);
      
      if (!grow || !grow.stages) {
        console.error('Grow or stages not found for task completion toggle');
        return;
      }

      const stage = grow.stages[stageKey as keyof typeof grow.stages];
      if (!stage) {
        console.error(`Stage ${stageKey} not found in grow ${growId}`);
        return;
      }

      const task = stage.tasks.find(t => t.id === taskId);
      if (!task) {
        console.error(`Task ${taskId} not found in stage ${stageKey} of grow ${growId}`);
        return;
      }

      // Task template toggle is no longer supported - this method is deprecated
      console.warn(`[GrowStore] toggleTaskCompletion is deprecated - task templates don't have completion status`);
    } catch (error) {
      console.error('Error in deprecated toggleTaskCompletion:', error);
      handleUnauthorizedError(error as Error);
    }
  },

  // Delete task from grow with API synchronization
  deleteTaskFromGrow: async (taskId: string, growId: number, stageKey: string, token: string) => {
    try {
      const { grows, currentGrow } = get();
      const grow = grows.find(g => g.id === growId);
      
      if (!grow || !grow.stages) {
        console.error('Grow or stages not found for task deletion');
        return;
      }

      const stage = grow.stages[stageKey as keyof typeof grow.stages];
      if (!stage) {
        console.error(`Stage ${stageKey} not found in grow ${growId}`);
        return;
      }

      const task = stage.tasks.find(t => t.id === taskId);
      if (!task) {
        console.error(`Task ${taskId} not found in stage ${stageKey} of grow ${growId}`);
        return;
      }

      // Store the original tasks for potential revert
      const originalTasks = stage.tasks;

      // Update local state immediately (optimistic update)
      set((state) => {
        const updatedState: any = {
          grows: state.grows.map((existingGrow) => {
            if (existingGrow.id === growId && existingGrow.stages) {
              const updatedStages = {
                ...existingGrow.stages,
                [stageKey]: {
                  ...stage,
                  tasks: stage.tasks.filter(t => t.id !== taskId)
                }
              };
              return { ...existingGrow, stages: updatedStages };
            }
            return existingGrow;
          })
        };

        // Also update currentGrow if it matches the grow being edited
        if (state.currentGrow && state.currentGrow.id === growId && state.currentGrow.formData.stages) {
          const currentStageData = state.currentGrow.formData.stages[stageKey as keyof typeof state.currentGrow.formData.stages];
          if (currentStageData) {
            updatedState.currentGrow = {
              ...state.currentGrow,
              formData: {
                ...state.currentGrow.formData,
                stages: {
                  ...state.currentGrow.formData.stages,
                  [stageKey]: {
                    ...currentStageData,
                    tasks: currentStageData.tasks.filter((t: Task) => t.id !== taskId)
                  }
                }
              }
            };
          }
        }

        return updatedState;
      });

      // Update backend - use full grow update
      const updatedStages = {
        ...grow.stages,
        [stageKey]: {
          ...stage,
          tasks: stage.tasks.filter(t => t.id !== taskId)
        }
      };

      await apiClient.updateBulkGrow(growId.toString(), { stages: updatedStages }, token);
      
      // Clean up any CalendarTasks that were created from this task template
      const calendarStore = useCalendarStore.getState();
      try {
        await calendarStore.deleteCalendarTasksByParentTask(token, taskId, growId);
      } catch (calendarError) {
        console.error('Error cleaning up CalendarTasks:', calendarError);
        // Don't fail the task deletion if CalendarTask cleanup fails
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      handleUnauthorizedError(error as Error);
      
      // Revert optimistic update on failure
      const { grows, currentGrow } = get();
      const grow = grows.find(g => g.id === growId);
      if (grow && grow.stages) {
        const stage = grow.stages[stageKey as keyof typeof grow.stages];
        if (stage) {
          set((state) => {
            const revertedState: any = {
              grows: state.grows.map((existingGrow) => {
                if (existingGrow.id === growId && existingGrow.stages) {
                  const revertedStages = {
                    ...existingGrow.stages,
                    [stageKey]: {
                      ...stage,
                      tasks: [...stage.tasks] // Revert to original state
                    }
                  };
                  return { ...existingGrow, stages: revertedStages };
                }
                return existingGrow;
              })
            };

            // Also revert currentGrow if it matches
            if (state.currentGrow && state.currentGrow.id === growId && state.currentGrow.formData.stages) {
              const currentStageData = state.currentGrow.formData.stages[stageKey as keyof typeof state.currentGrow.formData.stages];
              if (currentStageData) {
                revertedState.currentGrow = {
                  ...state.currentGrow,
                  formData: {
                    ...state.currentGrow.formData,
                    stages: {
                      ...state.currentGrow.formData.stages,
                      [stageKey]: {
                        ...currentStageData,
                        tasks: [...currentStageData.tasks] // Revert to original
                      }
                    }
                  }
                };
              }
            }

            return revertedState;
          });
        }
      }
      throw error;
    }
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

// Efficient memoized selectors for completion date and duration calculations
export const useGrowCompletionDate = (grow: BulkGrowComplete) =>
  useGrowStore(
    useShallow((state) => {
      // If grow status is completed, determine completion date in priority order
      if (grow.status === 'completed' || grow.current_stage === 'completed') {
        // First priority: harvest completion date if explicitly set
        if (grow.harvest_completion_date) {
          return state.parseDate(grow.harvest_completion_date);
        }
        
        // Second priority: most recent flush harvest date
        const flushDates = grow.flushes
          ?.map(flush => flush.harvest_date)
          .filter(Boolean)
          .map(date => new Date(date!))
          .sort((a, b) => b.getTime() - a.getTime());
        
        if (flushDates && flushDates.length > 0) {
          return flushDates[0];
        }
        
        // Fallback to fruiting start date if no flush dates
        if (grow.fruiting_start_date) {
          return state.parseDate(grow.fruiting_start_date);
        }
      }
      
      return null;
    })
  );

export const useGrowDuration = (grow: BulkGrowComplete) =>
  useGrowStore(
    useShallow((state) => {
      if (!grow.inoculation_date) return 0;
      
      const inoculationDate = state.parseDate(grow.inoculation_date);
      if (!inoculationDate) return 0;
      
      // Use completion date for completed grows, otherwise use today
      let endDate = new Date();
      if (grow.status === 'completed' || grow.current_stage === 'completed') {
        // First priority: harvest completion date if explicitly set
        if (grow.harvest_completion_date) {
          endDate = state.parseDate(grow.harvest_completion_date) || new Date();
        } else {
          // Second priority: most recent flush harvest date
          const flushDates = grow.flushes
            ?.map(flush => flush.harvest_date)
            .filter(Boolean)
            .map(date => new Date(date!))
            .sort((a, b) => b.getTime() - a.getTime());
          
          if (flushDates && flushDates.length > 0) {
            endDate = flushDates[0];
          } else if (grow.fruiting_start_date) {
            endDate = state.parseDate(grow.fruiting_start_date) || new Date();
          }
        }
      }
      
      const diffTime = Math.abs(endDate.getTime() - inoculationDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    })
  );

// Total dry yield calculation selector
export const useGrowTotalDryYield = (grow: BulkGrowComplete) =>
  useGrowStore(
    useShallow(() => {
      return grow.flushes?.reduce((sum, flush) => sum + (parseFloat(flush.dry_yield_grams || '0') || 0), 0) || 0;
    })
  );
