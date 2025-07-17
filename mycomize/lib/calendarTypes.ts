export interface CalendarTask {
  id: string;
  taskId: string; // Reference to the original task
  growId: number;
  growName: string;
  stageName: string;
  action: string;
  frequency: string;
  date: string; // ISO date string
  completed: boolean;
  completedDate?: string; // ISO date string
  type: 'task' | 'milestone';
  priority: 'low' | 'medium' | 'high';
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO date string
  type: 'task' | 'milestone' | 'harvest' | 'maintenance';
  growId?: number;
  growName?: string;
  stageName?: string;
  completed?: boolean;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface CalendarState {
  tasks: CalendarTask[];
  events: CalendarEvent[];
}

// Helper functions
export const generateCalendarId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const formatDateForCalendar = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const parseDateFromCalendar = (dateString: string): Date => {
  return new Date(dateString + 'T00:00:00.000Z');
};

export const getTaskDueDate = (stageStartDate: string, daysAfterStageStart: number): string => {
  const startDate = new Date(stageStartDate);
  const dueDate = new Date(startDate);
  dueDate.setDate(startDate.getDate() + daysAfterStageStart);
  return formatDateForCalendar(dueDate);
};

export const getTaskPriority = (daysUntilDue: number): 'low' | 'medium' | 'high' => {
  if (daysUntilDue < 0) return 'high'; // Overdue
  if (daysUntilDue === 0) return 'high'; // Due today
  if (daysUntilDue <= 2) return 'medium'; // Due within 2 days
  return 'low'; // Due later
};

export const getDaysUntilDue = (dueDate: string): number => {
  const today = new Date();
  const due = new Date(dueDate);
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

export const getTaskStatus = (
  task: CalendarTask
): 'completed' | 'overdue' | 'today' | 'upcoming' => {
  if (task.completed) return 'completed';

  const daysUntil = getDaysUntilDue(task.date);
  if (daysUntil < 0) return 'overdue';
  if (daysUntil === 0) return 'today';
  return 'upcoming';
};

export const sortTasksByDate = (tasks: CalendarTask[]): CalendarTask[] => {
  return [...tasks].sort((a, b) => {
    // First sort by completion status (incomplete first)
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    // Then sort by date
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
};
