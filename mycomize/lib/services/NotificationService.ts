import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Notification service for managing local notifications with expo-notifications
 * Handles permission requests, scheduling, and cancellation of notifications
 */

export interface NotificationScheduleOptions {
  title: string;
  body: string;
  date: Date;
  identifier?: string;
}

export interface NotificationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: Notifications.PermissionStatus;
}

class NotificationServiceClass {
  private initialized = false;

  /**
   * Initialize notification service with default behavior
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Set notification handler for foreground notifications
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Set up notification channel for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('opentek-task-reminders', {
        name: 'OpenTek Task Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        description: 'Notifications for scheduled tasks in your grows',
      });
    }

    this.initialized = true;
  }

  /**
   * Request notification permissions from user
   */
  async requestPermissions(): Promise<NotificationPermissionStatus> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    
    if (existingStatus !== 'granted') {
      const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
      return {
        granted: status === 'granted',
        canAskAgain,
        status
      };
    }
    
    return {
      granted: true,
      canAskAgain: false,
      status: existingStatus
    };
  }

  /**
   * Check current notification permission status
   */
  async getPermissionStatus(): Promise<NotificationPermissionStatus> {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    
    return {
      granted: status === 'granted',
      canAskAgain,
      status
    };
  }

  /**
   * Schedule a local notification for a specific date/time
   */
  async scheduleNotification(options: NotificationScheduleOptions): Promise<string> {
    await this.initialize();
    
    const { granted } = await this.getPermissionStatus();
    if (!granted) {
      throw new Error('Notification permissions not granted');
    }

    const now = new Date();
    if (options.date <= now) {
      throw new Error('Cannot schedule notification for past date');
    }

    const identifier = await Notifications.scheduleNotificationAsync({
      identifier: options.identifier,
      content: {
        title: options.title,
        body: options.body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
        ...(Platform.OS === 'android' && {
          channelId: 'opentek-task-reminders',
        }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE, 
        date: options.date,
      },
    });

    return identifier;
  }

  /**
   * Cancel a scheduled notification by identifier
   */
  async cancelNotification(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch (error) {
      console.warn(`Failed to cancel notification ${identifier}:`, error);
      // Don't throw error - notification may have already been delivered or cancelled
    }
  }

  /**
   * Cancel multiple notifications by identifiers
   */
  async cancelNotifications(identifiers: string[]): Promise<void> {
    await Promise.all(
      identifiers.map(id => this.cancelNotification(id))
    );
  }

  /**
   * Get all scheduled notifications
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Helper to create notification content for calendar tasks
   */
  createTaskNotificationContent(
    taskAction: string, 
    growName?: string, 
    stageKey?: string
  ): { title: string; body: string } {
    // Format stage key for display (e.g., 'spawn_colonization' -> 'Spawn Colonization')
    const formatStageKey = (stage: string): string => {
      return stage
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    const title = 'OpenTek Task Reminder';
    
    // Build notification body with available context
    let body = `Time for: ${taskAction}`;
    
    if (growName && stageKey) {
      const formattedStage = formatStageKey(stageKey);
      body = `${growName} • ${formattedStage}: ${taskAction}`;
    } else if (growName) {
      body = `${growName}: ${taskAction}`;
    } else if (stageKey) {
      const formattedStage = formatStageKey(stageKey);
      body = `${formattedStage}: ${taskAction}`;
    }
    
    return { title, body };
  }

  /**
   * Parse date and time strings into a Date object
   */
  parseTaskDateTime(dateString: string, timeString: string): Date {
    // dateString format: YYYY-MM-DD
    // timeString format: HH:mm
    const [year, month, day] = dateString.split('-').map(Number);
    const [hours, minutes] = timeString.split(':').map(Number);
    
    return new Date(year, month - 1, day, hours, minutes);
  }

  /**
   * Schedule notification for a calendar task
   */
  async scheduleTaskNotification(
    taskId: number,
    taskAction: string,
    dateString: string,
    timeString: string,
    growName?: string,
    stageKey?: string
  ): Promise<string> {
    const date = this.parseTaskDateTime(dateString, timeString);
    const { title, body } = this.createTaskNotificationContent(taskAction, growName, stageKey);
    
    const notificationId = await this.scheduleNotification({
      title,
      body,
      date,
      identifier: `opentek-task-${taskId}`,
    });
    
    return notificationId;
  }

  /**
   * Reschedule notification for a calendar task (cancel old, schedule new)
   */
  async rescheduleTaskNotification(
    taskId: number,
    oldNotificationId: string,
    taskAction: string,
    newDateString: string,
    newTimeString: string,
    growName?: string,
    stageKey?: string
  ): Promise<string> {
    // Cancel the old notification
    await this.cancelNotification(oldNotificationId);
    
    // Schedule new notification
    return await this.scheduleTaskNotification(taskId, taskAction, newDateString, newTimeString, growName, stageKey);
  }
}

// Export singleton instance
export const NotificationService = new NotificationServiceClass();
export default NotificationService;
