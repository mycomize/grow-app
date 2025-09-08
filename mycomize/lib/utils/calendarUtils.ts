import { BulkGrowComplete, stageLabels } from '../types/growTypes';
import { Task } from '../types/tekTypes';

/**
 * Calendar-specific task interface combining task data with grow context
 */
export interface CalendarTask {
  id: string;
  growId: number;
  growName: string;
  stageKey: string;
  stageName: string;
  action: string;
  status: 'upcoming' | 'completed' | 'overdue';
  date?: string;
  time?: string;
  frequency: string;
}

/**
 * Calendar marked dates interface for react-native-calendars
 */
export interface MarkedDates {
  [date: string]: {
    dots?: { key: string; color: string }[];
    marked?: boolean;
    dotColor?: string;
  };
}

/**
 * Convert stage key to display-friendly name using existing stageLabels
 */
export const getStageDisplayName = (stageKey: string): string => {
  return stageLabels[stageKey as keyof typeof stageLabels] || stageKey;
};

/**
 * Extract all individual tasks from active grows and convert to CalendarTask format
 * Only includes grows that are not completed (status !== 'completed')
 * Now works with individual task instances (no expansion needed)
 */
export const getAllTasksFromGrows = (grows: BulkGrowComplete[]): CalendarTask[] => {
  const calendarTasks: CalendarTask[] = [];

  // Filter to only active grows (not completed)
  const activeGrows = grows.filter(grow => grow.status !== 'completed');

  activeGrows.forEach(grow => {
    if (!grow.stages) return;

    // Process each stage in the grow
    Object.entries(grow.stages).forEach(([stageKey, stageData]) => {
      if (!stageData.tasks || stageData.tasks.length === 0) return;

      // Convert each individual task to CalendarTask format
      // Note: Task objects from teks don't have calendar-specific properties
      // This function might need to be updated to work with actual CalendarTask objects from the backend
      stageData.tasks.forEach((task: Task) => {
        calendarTasks.push({
          id: task.id,
          growId: grow.id,
          growName: grow.name,
          stageKey,
          stageName: getStageDisplayName(stageKey),
          action: task.action,
          status: 'upcoming', // Default status since Task doesn't have this property
          date: undefined, // Task doesn't have calendar dates
          time: undefined, // Task doesn't have calendar times
          frequency: task.frequency
        });
      });
    });
  });

  return calendarTasks;
};

/**
 * Filter tasks to only those scheduled for a specific date
 * Works with individual tasks that have specific dates
 */
export const getTasksForDate = (tasks: CalendarTask[], date: string): CalendarTask[] => {
  return tasks.filter(task => {
    // Individual tasks have specific date
    return task.date === date;
  });
};

/**
 * Generate marked dates for calendar display - ACTIVE TASKS ONLY
 * Creates dots for days that have upcoming or overdue tasks
 * When all tasks are completed for a day, no dot is shown
 */
export const generateMarkedDates = (tasks: CalendarTask[]): MarkedDates => {
  const markedDates: MarkedDates = {};

  // Group tasks by date, include upcoming and overdue tasks
  const activeTasksByDate: Record<string, CalendarTask[]> = {};
  
  tasks.forEach(task => {
    if (!task.date) return;
    
    const effectiveStatus = getTaskEffectiveStatus(task);
    // Only process active tasks (upcoming or overdue)
    if (effectiveStatus === 'completed') return;

    if (!activeTasksByDate[task.date]) {
      activeTasksByDate[task.date] = [];
    }
    activeTasksByDate[task.date].push(task);
  });

  // Create marked dates with dots - different colors for different statuses
  Object.entries(activeTasksByDate).forEach(([date, dateTasks]) => {
    if (dateTasks.length === 0) return;
    
    // Check if any tasks are overdue
    const hasOverdue = dateTasks.some(task => getTaskEffectiveStatus(task) === 'overdue');
    
    markedDates[date] = {
      dots: [{
        key: hasOverdue ? 'overdue' : 'upcoming',
        color: hasOverdue ? '#EF4444' : '#FF6B35' // Red for overdue, Orange for upcoming
      }],
      marked: true
    };
  });

  return markedDates;
};

/**
 * Get tasks scheduled for today
 */
export const getTodaysTasks = (tasks: CalendarTask[]): CalendarTask[] => {
  const today = new Date().toISOString().split('T')[0];
  return getTasksForDate(tasks, today);
};

/**
 * Get count of upcoming tasks for a specific date
 */
export const getUpcomingTaskCount = (tasks: CalendarTask[], date: string): number => {
  const dateTasks = getTasksForDate(tasks, date);
  return dateTasks.filter(task => task.status === 'upcoming').length;
};

/**
 * Get count of completed tasks for a specific date
 */
export const getCompletedTaskCount = (tasks: CalendarTask[], date: string): number => {
  const dateTasks = getTasksForDate(tasks, date);
  return dateTasks.filter(task => task.status === 'completed').length;
};

/**
 * Sort tasks by stage order, then by time, then by action name
 */
export const sortTasksByStage = (tasks: CalendarTask[]): CalendarTask[] => {
  const stageOrder = ['inoculation', 'spawn_colonization', 'bulk_colonization', 'fruiting', 'harvest'];
  
  return [...tasks].sort((a, b) => {
    // First sort by stage order
    const aStageIndex = stageOrder.indexOf(a.stageKey);
    const bStageIndex = stageOrder.indexOf(b.stageKey);
    
    if (aStageIndex !== bStageIndex) {
      return aStageIndex - bStageIndex;
    }
    
    // Then sort by grow name
    if (a.growName !== b.growName) {
      return a.growName.localeCompare(b.growName);
    }

    // Then sort by time (if available)
    if (a.time && b.time) {
      return a.time.localeCompare(b.time);
    } else if (a.time && !b.time) {
      return -1; // Tasks with time come first
    } else if (!a.time && b.time) {
      return 1; // Tasks without time come last
    }
    
    // Finally sort by action name
    return a.action.localeCompare(b.action);
  });
};

/**
 * Sort tasks by time, then by stage order
 * Useful for displaying tasks for a specific day in chronological order
 */
export const sortTasksByTime = (tasks: CalendarTask[]): CalendarTask[] => {
  return [...tasks].sort((a, b) => {
    // First sort by time (if available)
    if (a.time && b.time) {
      return a.time.localeCompare(b.time);
    } else if (a.time && !b.time) {
      return -1; // Tasks with time come first
    } else if (!a.time && b.time) {
      return 1; // Tasks without time come last
    }

    // Then by stage order
    const stageOrder = ['inoculation', 'spawn_colonization', 'bulk_colonization', 'fruiting', 'harvest'];
    const aStageIndex = stageOrder.indexOf(a.stageKey);
    const bStageIndex = stageOrder.indexOf(b.stageKey);
    
    if (aStageIndex !== bStageIndex) {
      return aStageIndex - bStageIndex;
    }
    
    // Then by grow name
    if (a.growName !== b.growName) {
      return a.growName.localeCompare(b.growName);
    }
    
    // Finally by action name
    return a.action.localeCompare(b.action);
  });
};

/**
 * Group tasks by date for display purposes
 */
export const groupTasksByDate = (tasks: CalendarTask[]): Record<string, CalendarTask[]> => {
  const grouped: Record<string, CalendarTask[]> = {};
  
  tasks.forEach(task => {
    if (!task.date) return;
    
    if (!grouped[task.date]) {
      grouped[task.date] = [];
    }
    
    grouped[task.date].push(task);
  });

  // Sort tasks within each date group
  Object.keys(grouped).forEach(date => {
    grouped[date] = sortTasksByTime(grouped[date]);
  });

  return grouped;
};

/**
 * Format time for display (e.g., "14:30" -> "2:30 PM")
 */
export const formatTimeForDisplay = (timeString?: string): string => {
  if (!timeString) return '';
  
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes);
  
  return date.toLocaleTimeString([], { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};

/**
 * Check if a task is overdue based on its date and status
 */
export const isTaskOverdue = (task: CalendarTask): boolean => {
  if (!task.date || task.status === 'completed') {
    return false;
  }
  
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = task.date < today && task.status === 'upcoming';
  
  return isOverdue;
};

/**
 * Get the effective status of a task, taking into account overdue state
 */
export const getTaskEffectiveStatus = (task: CalendarTask): 'upcoming' | 'completed' | 'overdue' => {
  if (task.status === 'completed') {
    return 'completed';
  }
  
  return isTaskOverdue(task) ? 'overdue' : 'upcoming';
};

/**
 * Format date for display (e.g., "2024-01-15" -> "Today", "Tomorrow", or "Jan 15")
 */
export const formatDateForDisplay = (dateString: string): string => {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowString = tomorrow.toISOString().split('T')[0];
  
  if (dateString === today) {
    return 'Today';
  } else if (dateString === tomorrowString) {
    return 'Tomorrow';
  } else {
    // Parse date manually to avoid timezone conversion issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric'
    });
  }
};
