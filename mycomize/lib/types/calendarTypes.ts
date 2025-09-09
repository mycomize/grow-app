export interface CalendarTask {
  // Backend fields (required)
  id: number;
  parent_task_id: string; // Reference to parent Task
  action: string; // Copy of parent task action for performance (encrypted)
  grow_id: number; // Foreign key (unencrypted)
  stage_key: string; // e.g., 'inoculation', 'spawn_colonization' (encrypted)
  date: string; // YYYY-MM-DD format (encrypted)
  time: string; // HH:mm format (encrypted)
  status: 'upcoming' | 'completed' | 'overdue'; // (encrypted)
  notification_enabled?: boolean; // Whether notifications are enabled (encrypted)
  notification_id?: string; // Expo notification identifier (encrypted)
  created_at: string;
  updated_at: string;
  
  // Display fields (optional, populated by transformation)
  growName?: string;
  stageName?: string;
  frequency?: string;
}

export interface CalendarTaskCreate {
  parent_task_id: string;
  grow_id: number;
  action: string;
  stage_key: string;
  date: string;
  time: string;
  status?: 'upcoming' | 'completed' | 'overdue';
  notification_enabled?: boolean;
  notification_id?: string;
}

export interface CalendarTaskUpdate {
  action?: string;
  stage_key?: string;
  date?: string;
  time?: string;
  status?: 'upcoming' | 'completed' | 'overdue';
  notification_enabled?: boolean;
  notification_id?: string;
}

// Helper type for frontend state management
export interface CalendarTaskWithParent extends CalendarTask {
  parent_task?: {
    frequency: string;
    repeatCount?: number;
    repeatUnit?: 'day' | 'week' | 'stage';
  };
}

// Helper function to create a CalendarTask from a Task template
export const createCalendarTaskFromTemplate = (
  parentTaskId: string,
  growId: number,
  action: string,
  stageKey: string,
  date: string,
  time: string
): CalendarTaskCreate => ({
  parent_task_id: parentTaskId,
  grow_id: growId,
  action,
  stage_key: stageKey,
  date,
  time,
  status: 'upcoming',
});
