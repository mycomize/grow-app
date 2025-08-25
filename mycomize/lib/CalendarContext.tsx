import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CalendarTask,
  CalendarEvent,
  CalendarState,
  generateCalendarId,
  getTaskDueDate,
  getTaskPriority,
  getDaysUntilDue,
  formatDateForCalendar,
} from './types/calendarTypes';
import { Task } from './types/tekTypes';
import { BulkGrow } from './growTypes';

interface CalendarContextType {
  calendarState: CalendarState;
  addTaskToCalendar: (
    task: Task,
    grow: BulkGrow,
    stageName: string,
    stageStartDate: string,
    nextStageStartDate?: string
  ) => void;
  removeTaskFromCalendar: (taskId: string) => void;
  deleteCalendarTask: (calendarTaskId: string) => void;
  toggleTaskCompletion: (calendarTaskId: string) => void;
  updateTaskDate: (calendarTaskId: string, newDate: string) => void;
  addEventToCalendar: (event: Omit<CalendarEvent, 'id'>) => void;
  removeEventFromCalendar: (eventId: string) => void;
  getTasksForDate: (date: string) => CalendarTask[];
  getEventsForDate: (date: string) => CalendarEvent[];
  getAllTasksSorted: () => CalendarTask[];
  clearCalendar: () => void;
  isTaskInCalendar: (taskId: string, growId: number) => boolean;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

const CALENDAR_STORAGE_KEY = 'grow_calendar_data';

export const CalendarProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [calendarState, setCalendarState] = useState<CalendarState>({
    tasks: [],
    events: [],
  });

  // Load calendar data from storage on mount
  useEffect(() => {
    loadCalendarData();
  }, []);

  // Save calendar data to storage whenever it changes
  useEffect(() => {
    saveCalendarData();
  }, [calendarState]);

  const loadCalendarData = async () => {
    try {
      const storedData = await AsyncStorage.getItem(CALENDAR_STORAGE_KEY);
      if (storedData) {
        const parsed: CalendarState = JSON.parse(storedData);
        setCalendarState(parsed);
      }
    } catch (error) {
      console.error('Error loading calendar data:', error);
    }
  };

  const saveCalendarData = async () => {
    try {
      await AsyncStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(calendarState));
    } catch (error) {
      console.error('Error saving calendar data:', error);
    }
  };

  const addTaskToCalendar = (
    task: Task,
    grow: BulkGrow,
    stageName: string,
    stageStartDate: string,
    nextStageStartDate?: string
  ) => {
    const startDate = new Date(stageStartDate);
    const taskStartDate = new Date(startDate);
    taskStartDate.setDate(startDate.getDate() + task.days_after_stage_start);

    // Calculate end date for task repetition
    let endDate: Date;
    if (nextStageStartDate) {
      endDate = new Date(nextStageStartDate);
      endDate.setDate(endDate.getDate() - 1); // End one day before next stage
    } else {
      // Cap at 6 weeks (42 days) from task start date
      endDate = new Date(taskStartDate);
      endDate.setDate(taskStartDate.getDate() + 42);
    }

    const calendarTasks: CalendarTask[] = [];
    const repeatCount = task.repeatCount || 1;
    const repeatUnit = task.repeatUnit || 'day';

    // Calculate interval between repetitions
    let intervalDays = 1;
    if (repeatUnit === 'week') {
      intervalDays = 7;
    } else if (repeatUnit === 'stage') {
      // For 'stage' unit, distribute events evenly across the stage duration
      const stageDurationDays = Math.ceil(
        (endDate.getTime() - taskStartDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      intervalDays = Math.max(1, Math.floor(stageDurationDays / repeatCount));
    }

    // Create calendar tasks based on repeat parameters
    for (let i = 0; i < repeatCount; i++) {
      const taskDate = new Date(taskStartDate);

      if (repeatUnit === 'day') {
        // For daily repetition, space events evenly
        const totalDays = Math.ceil(
          (endDate.getTime() - taskStartDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const spacing = Math.max(1, Math.floor(totalDays / repeatCount));
        taskDate.setDate(taskStartDate.getDate() + i * spacing);
      } else if (repeatUnit === 'week') {
        // For weekly repetition, add weeks
        taskDate.setDate(taskStartDate.getDate() + i * 7);
      } else if (repeatUnit === 'stage') {
        // For stage repetition, distribute evenly across stage duration
        taskDate.setDate(taskStartDate.getDate() + i * intervalDays);
      }

      // Only add if within the end date
      if (taskDate <= endDate) {
        const dueDate = formatDateForCalendar(taskDate);
        const daysUntilDue = getDaysUntilDue(dueDate);

        const calendarTask: CalendarTask = {
          id: generateCalendarId(),
          taskId: task.id,
          growId: grow.id,
          growName: grow.name,
          stageName,
          action: task.action,
          frequency: task.frequency,
          date: dueDate,
          completed: false,
          type: 'task',
          priority: getTaskPriority(daysUntilDue),
        };

        calendarTasks.push(calendarTask);
      }
    }

    setCalendarState((prev) => ({
      ...prev,
      tasks: [...prev.tasks, ...calendarTasks],
    }));
  };

  const removeTaskFromCalendar = (taskId: string) => {
    setCalendarState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((task) => task.taskId !== taskId),
    }));
  };

  const deleteCalendarTask = (calendarTaskId: string) => {
    setCalendarState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((task) => task.id !== calendarTaskId),
    }));
  };

  const toggleTaskCompletion = (calendarTaskId: string) => {
    setCalendarState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) =>
        task.id === calendarTaskId
          ? {
              ...task,
              completed: !task.completed,
              completedDate: !task.completed ? new Date().toISOString() : undefined,
            }
          : task
      ),
    }));
  };

  const updateTaskDate = (calendarTaskId: string, newDate: string) => {
    setCalendarState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((task) =>
        task.id === calendarTaskId
          ? {
              ...task,
              date: newDate,
              priority: getTaskPriority(getDaysUntilDue(newDate)),
            }
          : task
      ),
    }));
  };

  const addEventToCalendar = (event: Omit<CalendarEvent, 'id'>) => {
    const calendarEvent: CalendarEvent = {
      ...event,
      id: generateCalendarId(),
    };

    setCalendarState((prev) => ({
      ...prev,
      events: [...prev.events, calendarEvent],
    }));
  };

  const removeEventFromCalendar = (eventId: string) => {
    setCalendarState((prev) => ({
      ...prev,
      events: prev.events.filter((event) => event.id !== eventId),
    }));
  };

  const getTasksForDate = (date: string): CalendarTask[] => {
    return calendarState.tasks.filter((task) => task.date === date);
  };

  const getEventsForDate = (date: string): CalendarEvent[] => {
    return calendarState.events.filter((event) => event.date === date);
  };

  const getAllTasksSorted = (): CalendarTask[] => {
    return [...calendarState.tasks].sort((a, b) => {
      // First sort by completion status (incomplete first)
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      // Then sort by date
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  };

  const clearCalendar = () => {
    setCalendarState({
      tasks: [],
      events: [],
    });
  };

  const isTaskInCalendar = (taskId: string, growId: number): boolean => {
    return calendarState.tasks.some((task) => task.taskId === taskId && task.growId === growId);
  };

  const value: CalendarContextType = {
    calendarState,
    addTaskToCalendar,
    removeTaskFromCalendar,
    deleteCalendarTask,
    toggleTaskCompletion,
    updateTaskDate,
    addEventToCalendar,
    removeEventFromCalendar,
    getTasksForDate,
    getEventsForDate,
    getAllTasksSorted,
    clearCalendar,
    isTaskInCalendar,
  };

  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>;
};

export const useCalendar = (): CalendarContextType => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
};
