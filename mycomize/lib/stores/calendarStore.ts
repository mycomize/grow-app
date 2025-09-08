import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { router } from 'expo-router';
import { apiClient, isUnauthorizedError } from '../api/ApiClient';
import { CalendarTask, CalendarTaskCreate, CalendarTaskUpdate } from '../types/calendarTypes';
import { Task } from '../types/tekTypes';
import { NEW_GROW_ID } from './growStore';
import { useGrowStore } from './growStore';

// Helper function to handle unauthorized errors consistently
const handleUnauthorizedError = (error: Error) => {
  if (isUnauthorizedError(error)) {
    router.replace('/login');
    throw error;
  }
};

interface CalendarStore {
  // State
  calendarTasks: CalendarTask[];
  loading: boolean;

  // CRUD Actions
  fetchCalendarTasks: (token: string, growId?: number, parentTaskId?: string) => Promise<void>;
  createCalendarTask: (token: string, data: CalendarTaskCreate) => Promise<CalendarTask | null>;
  updateCalendarTask: (token: string, id: string, data: CalendarTaskUpdate) => Promise<boolean>;
  deleteCalendarTask: (token: string, id: string) => Promise<boolean>;
  deleteCalendarTasksByParentTask: (token: string, parentTaskId: string, growId: number) => Promise<boolean>;

  // NEW_GROW_ID helper methods
  createCalendarTaskForNewGrow: (data: Omit<CalendarTaskCreate, 'grow_id'>) => CalendarTask;
  getCalendarTasksForNewGrow: () => CalendarTask[];
  updateCalendarTaskGrowIds: (token: string, newGrowId: number) => Promise<boolean>;

  // Task template to CalendarTask generation
  createCalendarTasksFromTask: (
    token: string,
    task: Task,
    growId: number,
    stageKey: string,
    dates: { date: string; time: string }[]
  ) => Promise<CalendarTask[]>;

  // Calendar task management
  toggleCalendarTaskCompletion: (token: string, taskId: string) => Promise<void>;
  getCalendarTasksForGrow: (growId: number) => CalendarTask[];
  getCalendarTasksForDateRange: (startDate: string, endDate: string) => CalendarTask[];
  getCalendarTasksByParentTask: (parentTaskId: string) => CalendarTask[];

  // Parent task status calculation
  getParentTaskCompletionStatus: (parentTaskId: string) => 'upcoming' | 'completed' | 'partial';

  // Date utilities
  parseDate: (dateString?: string) => Date | null;
  formatDateForAPI: (date: Date | null) => string | undefined;

  reset: () => void;
}

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  // Initial state
  calendarTasks: [],
  loading: false,

  // Fetch calendar tasks with optional filtering
  fetchCalendarTasks: async (token: string, growId?: number, parentTaskId?: string) => {
    try {
      set({ loading: true });

      const data: CalendarTask[] = await apiClient.getCalendarTasks(token, growId, parentTaskId);

      set({
        calendarTasks: data,
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      handleUnauthorizedError(error as Error);
      throw error;
    }
  },

  // Create a new calendar task
  createCalendarTask: async (token: string, data: CalendarTaskCreate) => {
    try {
      const newTask: CalendarTask = await apiClient.createCalendarTask(data, token);

      set((state) => ({
        calendarTasks: [...state.calendarTasks, newTask],
      }));

      return newTask;
    } catch (error) {
      console.error('Error creating calendar task:', error);
      handleUnauthorizedError(error as Error);
      return null;
    }
  },

  // Update an existing calendar task
  updateCalendarTask: async (token: string, id: string, data: CalendarTaskUpdate) => {
    try {
      const updatedTask: CalendarTask = await apiClient.updateCalendarTask(id, data, token);

      set((state) => ({
        calendarTasks: state.calendarTasks.map((task) =>
          task.id.toString() === id ? updatedTask : task
        ),
      }));

      return true;
    } catch (error) {
      console.error('Error updating calendar task:', error);
      handleUnauthorizedError(error as Error);
      return false;
    }
  },

  // Delete a calendar task
  deleteCalendarTask: async (token: string, id: string) => {
    try {
      await apiClient.deleteCalendarTask(id, token);

      set((state) => ({
        calendarTasks: state.calendarTasks.filter((task) => task.id.toString() !== id),
      }));

      return true;
    } catch (error) {
      console.error('Error deleting calendar task:', error);
      handleUnauthorizedError(error as Error);
      return false;
    }
  },

  // Delete all calendar tasks for a parent task
  deleteCalendarTasksByParentTask: async (token: string, parentTaskId: string, growId: number) => {
    try {
      console.log(`[CalendarStore] Deleting calendar tasks for parent task ${parentTaskId} in grow ${growId}`);
      await apiClient.deleteCalendarTasksByParentTask(parentTaskId, growId, token);

      const removedCount = get().calendarTasks.filter(
        (task) => task.parent_task_id === parentTaskId && task.grow_id === growId
      ).length;

    set((state) => ({
      calendarTasks: state.calendarTasks.filter(
        (task) => !(task.parent_task_id === parentTaskId && task.grow_id === growId)
      ),
    }));

      console.log(`[CalendarStore] Successfully deleted ${removedCount} calendar tasks for parent task ${parentTaskId}`);
      return true;
    } catch (error) {
      console.error('Error deleting calendar tasks by parent:', error);
      handleUnauthorizedError(error as Error);
      return false;
    }
  },

  // NEW_GROW_ID helper methods
  createCalendarTaskForNewGrow: (data: Omit<CalendarTaskCreate, 'grow_id'>) => {
    // Generate a temporary negative ID for the task
    const tempId = -Math.floor(Math.random() * 10000000);
    
    const newTask: CalendarTask = {
      id: tempId,
      grow_id: NEW_GROW_ID,
      parent_task_id: data.parent_task_id,
      action: data.action,
      stage_key: data.stage_key,
      date: data.date,
      time: data.time,
      status: data.status || 'upcoming',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    set((state) => ({
      calendarTasks: [...state.calendarTasks, newTask],
    }));

    return newTask;
  },

  getCalendarTasksForNewGrow: () => {
    const { calendarTasks } = get();
    const newGrowTasks = calendarTasks.filter((task) => task.grow_id === NEW_GROW_ID);
    console.log(`[CalendarStore] Found ${newGrowTasks.length} calendar tasks for new grow`);
    return newGrowTasks;
  },

  updateCalendarTaskGrowIds: async (token: string, newGrowId: number) => {
    const newGrowTasks = get().getCalendarTasksForNewGrow();
    
    if (newGrowTasks.length === 0) {
      console.log(`[CalendarStore] No calendar tasks found for new grow, skipping ID updates`);
      return true;
    }

    console.log(`[CalendarStore] Updating ${newGrowTasks.length} calendar tasks from NEW_GROW_ID to grow ${newGrowId}`);

    try {
      // Get the current grow store to access updated task IDs
      const growStore = useGrowStore.getState();
      const currentGrow = growStore.currentGrow;
      
      if (!currentGrow?.formData?.stages) {
        console.error('[CalendarStore] No current grow stages found for calendar task updates');
        return false;
      }
      
      // Prepare all tasks for bulk creation with real grow ID and current task IDs
      const tasksToCreate: CalendarTaskCreate[] = [];
      
      for (const task of newGrowTasks) {
        // Find the current task in the grow store by matching action and stage
        const stage = currentGrow.formData.stages[task.stage_key as keyof typeof currentGrow.formData.stages];
        const currentTask = stage?.tasks.find(t => t.action === task.action);
        
        if (!currentTask) {
          console.warn(`[CalendarStore] Could not find current task for calendar task ${task.id}, skipping`);
          continue;
        }

        tasksToCreate.push({
          parent_task_id: currentTask.id, // Use current task ID from grow store
          grow_id: newGrowId,
          action: task.action,
          stage_key: task.stage_key,
          date: task.date,
          time: task.time,
          status: task.status,
        });
      }

      if (tasksToCreate.length === 0) {
        console.log(`[CalendarStore] No valid tasks to create after task ID resolution`);
        return true;
      }

      console.log(`[CalendarStore] Creating ${tasksToCreate.length} calendar tasks via bulk API for grow ID update`);
      
      // Use bulk creation API for better performance
      const createdTasks: CalendarTask[] = await apiClient.createCalendarTasksBulk(tasksToCreate, token);

      // Remove the temporary NEW_GROW_ID tasks from state and add the new ones
      set((state) => ({
        calendarTasks: [
          ...state.calendarTasks.filter((task) => task.grow_id !== NEW_GROW_ID),
          ...createdTasks,
        ],
      }));

      console.log(`[CalendarStore] Successfully updated ${createdTasks.length} calendar tasks to grow ${newGrowId} via bulk API`);
      return true;
    } catch (error) {
      console.error('Error updating calendar task grow IDs:', error);
      handleUnauthorizedError(error as Error);
      return false;
    }
  },

  // Generate CalendarTasks from Task template using bulk API
  createCalendarTasksFromTask: async (
    token: string,
    task: Task,
    growId: number,
    stageKey: string,
    dates: { date: string; time: string }[]
  ) => {
    try {
      if (dates.length === 0) {
        console.log('[CalendarStore] No dates provided for calendar task creation');
        return [];
      }

      // Prepare all task data for bulk creation
      const tasksToCreate: CalendarTaskCreate[] = dates.map(({ date, time }) => ({
        parent_task_id: task.id,
        grow_id: growId,
        action: task.action,
        stage_key: stageKey,
        date,
        time,
        status: 'upcoming',
      }));

      console.log(`[CalendarStore] Creating ${tasksToCreate.length} calendar tasks via bulk API for task ${task.id}`);

      // Use bulk creation API
      const createdTasks: CalendarTask[] = await apiClient.createCalendarTasksBulk(tasksToCreate, token);

      // Update zustand state with all created tasks
      set((state) => ({
        calendarTasks: [...state.calendarTasks, ...createdTasks],
      }));

      console.log(`[CalendarStore] Successfully created ${createdTasks.length} calendar tasks via bulk API`);
      return createdTasks;
    } catch (error) {
      console.error('Error creating calendar tasks from template:', error);
      handleUnauthorizedError(error as Error);
      return [];
    }
  },

  // Toggle calendar task completion status
  toggleCalendarTaskCompletion: async (token: string, taskId: string) => {
    try {
      const { calendarTasks } = get();
      const task = calendarTasks.find((t) => t.id.toString() === taskId);

      if (!task) {
        console.error('Calendar task not found for completion toggle');
        return;
      }

      const newStatus = task.status === 'upcoming' ? 'completed' : 'upcoming';

      // Optimistic update
      set((state) => ({
        calendarTasks: state.calendarTasks.map((t) =>
          t.id.toString() === taskId ? { ...t, status: newStatus } : t
        ),
      }));

      // Update backend
      const success = await get().updateCalendarTask(token, taskId, { status: newStatus });

      if (!success) {
        // Revert on failure
        set((state) => ({
          calendarTasks: state.calendarTasks.map((t) =>
            t.id.toString() === taskId ? { ...t, status: task.status } : t
          ),
        }));
        throw new Error('Failed to update task completion status');
      }
    } catch (error) {
      console.error('Error toggling calendar task completion:', error);
      throw error;
    }
  },

  // Get calendar tasks for a specific grow
  getCalendarTasksForGrow: (growId: number) => {
    const { calendarTasks } = get();
    return calendarTasks.filter((task) => task.grow_id === growId);
  },

  // Get calendar tasks within a date range
  getCalendarTasksForDateRange: (startDate: string, endDate: string) => {
    const { calendarTasks } = get();
    return calendarTasks.filter((task) => {
      return task.date >= startDate && task.date <= endDate;
    });
  },

  // Get calendar tasks by parent task ID
  getCalendarTasksByParentTask: (parentTaskId: string) => {
    const { calendarTasks } = get();
    return calendarTasks.filter((task) => task.parent_task_id === parentTaskId);
  },

  // Calculate parent task completion status based on associated calendar tasks
  getParentTaskCompletionStatus: (parentTaskId: string) => {
    const { calendarTasks } = get();
    const childTasks = calendarTasks.filter((task) => task.parent_task_id === parentTaskId);

    if (childTasks.length === 0) {
      return 'upcoming';
    }

    const completedTasks = childTasks.filter((task) => task.status === 'completed');

    if (completedTasks.length === 0) {
      return 'upcoming';
    } else if (completedTasks.length === childTasks.length) {
      return 'completed';
    } else {
      return 'partial';
    }
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

  // Reset store state
  reset: () => {
    set({
      calendarTasks: [],
      loading: false,
    });
  },
}));

// Helper selectors for optimized subscriptions
export const useCalendarTasks = () => useCalendarStore((state) => state.calendarTasks);
export const useCalendarTasksLoading = () => useCalendarStore((state) => state.loading);

// Efficient selectors for specific data queries
export const useCalendarTasksForGrow = (growId: number) =>
  useCalendarStore(
    useShallow((state) => state.calendarTasks.filter((task) => task.grow_id === growId))
  );

export const useCalendarTasksByParentTask = (parentTaskId: string) =>
  useCalendarStore(
    useShallow((state) => state.calendarTasks.filter((task) => task.parent_task_id === parentTaskId))
  );

export const useCalendarTasksForDateRange = (startDate: string, endDate: string) =>
  useCalendarStore(
    useShallow((state) =>
      state.calendarTasks.filter((task) => task.date >= startDate && task.date <= endDate)
    )
  );

// Parent task completion status selector
export const useParentTaskCompletionStatus = (parentTaskId: string) =>
  useCalendarStore((state) => state.getParentTaskCompletionStatus(parentTaskId));

// Action selectors
export const useFetchCalendarTasks = () => useCalendarStore((state) => state.fetchCalendarTasks);
export const useCreateCalendarTask = () => useCalendarStore((state) => state.createCalendarTask);
export const useUpdateCalendarTask = () => useCalendarStore((state) => state.updateCalendarTask);
export const useDeleteCalendarTask = () => useCalendarStore((state) => state.deleteCalendarTask);
export const useToggleCalendarTaskCompletion = () =>
  useCalendarStore((state) => state.toggleCalendarTaskCompletion);
export const useCreateCalendarTasksFromTask = () =>
  useCalendarStore((state) => state.createCalendarTasksFromTask);
export const useDeleteCalendarTasksByParentTask = () =>
  useCalendarStore((state) => state.deleteCalendarTasksByParentTask);

// Date utility selectors
export const useParseDateUtility = () => useCalendarStore((state) => state.parseDate);
export const useFormatDateForAPIUtility = () => useCalendarStore((state) => state.formatDateForAPI);
