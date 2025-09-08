export interface CalendarTask {
  id: number;
  parent_task_id: string; // Reference to parent Task
  action: string; // Copy of parent task action for performance (encrypted)
  grow_id: number; // Foreign key (unencrypted)
  stage_key: string; // e.g., 'inoculation', 'spawn_colonization' (encrypted)
  date: string; // YYYY-MM-DD format (encrypted)
  time: string; // HH:mm format (encrypted)
  status: 'upcoming' | 'completed' | 'overdue'; // (encrypted)
  created_at: string;
  updated_at: string;
}

export interface CalendarTaskCreate {
  parent_task_id: string;
  grow_id: number;
  action: string;
  stage_key: string;
  date: string;
  time: string;
  status?: 'upcoming' | 'completed' | 'overdue';
}

export interface CalendarTaskUpdate {
  action?: string;
  stage_key?: string;
  date?: string;
  time?: string;
  status?: 'upcoming' | 'completed' | 'overdue';
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
