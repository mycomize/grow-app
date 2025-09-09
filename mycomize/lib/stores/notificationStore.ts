import { create } from 'zustand';
import { NotificationService, NotificationPermissionStatus } from '../services/NotificationService';

interface NotificationState {
  // Permission status
  permissionStatus: NotificationPermissionStatus | null;
  isCheckingPermissions: boolean;
  
  // Actions
  checkPermissions: () => Promise<void>;
  requestPermissions: () => Promise<boolean>;
  
  // Notification management
  scheduleTaskNotification: (
    taskId: number,
    taskAction: string,
    dateString: string,
    timeString: string,
    growName?: string,
    stageKey?: string
  ) => Promise<string | null>;
  
  cancelTaskNotification: (notificationId: string) => Promise<void>;
  
  rescheduleTaskNotification: (
    taskId: number,
    oldNotificationId: string,
    taskAction: string,
    newDateString: string,
    newTimeString: string,
    growName?: string,
    stageKey?: string
  ) => Promise<string | null>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  permissionStatus: null,
  isCheckingPermissions: false,

  checkPermissions: async () => {
    set({ isCheckingPermissions: true });
    try {
      const status = await NotificationService.getPermissionStatus();
      set({ permissionStatus: status });
    } catch (error) {
      console.error('Failed to check notification permissions:', error);

      set({ 
        permissionStatus: { 
          granted: false, 
          canAskAgain: true, 
          status: 'undetermined' as any 
        } 
      });
    } finally {
      set({ isCheckingPermissions: false });
    }
  },

  requestPermissions: async (): Promise<boolean> => {
    set({ isCheckingPermissions: true });
    try {
      const status = await NotificationService.requestPermissions();
      set({ permissionStatus: status });
      return status.granted;
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      set({ 
        permissionStatus: { 
          granted: false, 
          canAskAgain: true, 
          status: 'denied' as any 
        } 
      });
      return false;
    } finally {
      set({ isCheckingPermissions: false });
    }
  },

  scheduleTaskNotification: async (
    taskId: number,
    taskAction: string,
    dateString: string,
    timeString: string,
    growName?: string,
    stageKey?: string
  ): Promise<string | null> => {
    try {
      // Check permissions first
      const { permissionStatus } = get();
      if (!permissionStatus?.granted) {
        const granted = await get().requestPermissions();

        if (!granted) {
          console.warn('Cannot schedule notification - permissions not granted');
          return null;
        }
      }

      // Check if date/time is in the past before attempting to schedule
      const taskDateTime = NotificationService.parseTaskDateTime(dateString, timeString);
      const now = new Date();
      
      if (taskDateTime <= now) {
        return null;
      }

      const notificationId = await NotificationService.scheduleTaskNotification(
        taskId,
        taskAction,
        dateString,
        timeString,
        growName,
        stageKey
      );
      
      
      return notificationId;
    } catch (error) {
        console.error('Failed to schedule task notification:', error);
      return null;
    }
  },

  cancelTaskNotification: async (notificationId: string): Promise<void> => {
    try {
      await NotificationService.cancelNotification(notificationId);
    } catch (error) {
      console.error(`Failed to cancel notification ${notificationId}:`, error);
      // Don't throw - cancellation should be resilient
    }
  },

  rescheduleTaskNotification: async (
    taskId: number,
    oldNotificationId: string,
    taskAction: string,
    newDateString: string,
    newTimeString: string,
    growName?: string,
    stageKey?: string
  ): Promise<string | null> => {
    try {
      // Check permissions first
      const { permissionStatus } = get();
      if (!permissionStatus?.granted) {
        const granted = await get().requestPermissions();

        if (!granted) {
          console.warn('Cannot reschedule notification - permissions not granted');
          // Still cancel the old notification
          await get().cancelTaskNotification(oldNotificationId);
          return null;
        }
      }

      // Check if new date/time is in the past before attempting to reschedule
      const newTaskDateTime = NotificationService.parseTaskDateTime(newDateString, newTimeString);
      const now = new Date();
      
      if (newTaskDateTime <= now) {
        // Cancel the old notification since we can't reschedule to a past date
        await get().cancelTaskNotification(oldNotificationId);
        return null;
      }

      const newNotificationId = await NotificationService.rescheduleTaskNotification(
        taskId,
        oldNotificationId,
        taskAction,
        newDateString,
        newTimeString,
        growName,
        stageKey
      );
      
      
      return newNotificationId;
    } catch (error) {
      console.error('Failed to reschedule task notification:', error);
      // Try to cancel the old notification even if rescheduling fails
      await get().cancelTaskNotification(oldNotificationId);
      return null;
    }
  },
}));

// Initialize permissions check when the store is first used
let permissionsInitialized = false;

export const initializeNotificationPermissions = async () => {
  if (permissionsInitialized) return;
  
  try {
    await useNotificationStore.getState().checkPermissions();
    permissionsInitialized = true;
  } catch (error) {
    console.error('Failed to initialize notification permissions:', error);
  }
};
