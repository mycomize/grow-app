/**
 * Frequency Calculator Utilities
 * Generates calendar task schedules based on frequency patterns
 */

export interface TaskScheduleParams {
  repeatCount: number;
  repeatUnit: 'day' | 'week' | 'stage';
  startDate: string; // YYYY-MM-DD format
  endDate: string;   // YYYY-MM-DD format
  startTime: string; // HH:MM format
}

export interface TaskScheduleItem {
  date: string; // YYYY-MM-DD format
  time: string; // HH:MM format
}

/**
 * Parse date string to Date object in local timezone
 */
const parseDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
};

/**
 * Format Date object to YYYY-MM-DD string in local timezone
 */
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Calculate number of days between two dates (inclusive)
 */
const calculateDaysBetween = (startDate: string, endDate: string): number => {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const timeDiff = end.getTime() - start.getTime();
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
};

/**
 * Calculate number of weeks between two dates
 */
const calculateWeeksBetween = (startDate: string, endDate: string): number => {
  const days = calculateDaysBetween(startDate, endDate);
  return Math.ceil(days / 7);
};

/**
 * Generate time slots evenly distributed within waking hours for a single day
 * Default waking hours: 7:00 AM to 9:00 PM (14-hour window)
 * Respects the provided base time and distributes other tasks around it
 */
const generateDailyTimeSlots = (count: number, baseTime?: string): string[] => {
  // TODO: Make waking hours configurable via user profile NOTIFICATIONS section
  const wakingStart = 7 * 60; // 7:00 AM in minutes
  const wakingEnd = 21 * 60;   // 9:00 PM in minutes
  const wakingWindow = wakingEnd - wakingStart; // 14 hours = 840 minutes

  if (count === 1) {
    // If only one task, use the provided base time if available, otherwise use middle of waking hours
    if (baseTime) {
      const [hours, minutes] = baseTime.split(':').map(Number);
      const timeInMinutes = hours * 60 + minutes;
      // Ensure it's within waking hours
      if (timeInMinutes >= wakingStart && timeInMinutes <= wakingEnd) {
        return [baseTime];
      }
    }
    // Default to middle of waking hours
    const middleTime = wakingStart + Math.floor(wakingWindow / 2);
    const hours = Math.floor(middleTime / 60);
    const minutes = middleTime % 60;
    return [`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`];
  }

  // For multiple tasks, respect the base time and distribute others around it
  const times: string[] = [];
  
  if (baseTime) {
    const [hours, minutes] = baseTime.split(':').map(Number);
    const baseTimeInMinutes = hours * 60 + minutes;
    
    // If base time is within waking hours, use it as the first task
    if (baseTimeInMinutes >= wakingStart && baseTimeInMinutes <= wakingEnd) {
      times.push(baseTime);
      
      // Distribute remaining tasks evenly in the remaining time slots
      if (count > 1) {
        const interval = wakingWindow / count;
        
        for (let i = 1; i < count; i++) {
          const timeInMinutes = wakingStart + Math.floor(interval * i);
          
          // Skip if too close to base time (within 30 minutes)
          if (Math.abs(timeInMinutes - baseTimeInMinutes) >= 30) {
            const timeHours = Math.floor(timeInMinutes / 60);
            const timeMinutes = timeInMinutes % 60;
            times.push(`${String(timeHours).padStart(2, '0')}:${String(timeMinutes).padStart(2, '0')}`);
          }
        }
        
        // If we don't have enough times due to conflicts, fill with evenly distributed times
        while (times.length < count) {
          const interval = wakingWindow / (count + 1);
          const timeInMinutes = wakingStart + Math.floor(interval * times.length);
          const timeHours = Math.floor(timeInMinutes / 60);
          const timeMinutes = timeInMinutes % 60;
          const timeString = `${String(timeHours).padStart(2, '0')}:${String(timeMinutes).padStart(2, '0')}`;
          
          // Only add if not already in the list
          if (!times.includes(timeString)) {
            times.push(timeString);
          } else {
            // If we have a conflict, just add a time with a small offset
            const offsetTime = timeInMinutes + 15; // 15 minute offset
            if (offsetTime <= wakingEnd) {
              const offsetHours = Math.floor(offsetTime / 60);
              const offsetMinutes = offsetTime % 60;
              times.push(`${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`);
            }
          }
        }
      }
      
      // Sort times chronologically
      return times.sort();
    }
  }
  
  // Fallback: distribute evenly across waking hours if no valid base time
  const interval = wakingWindow / (count + 1);
  for (let i = 1; i <= count; i++) {
    const timeInMinutes = wakingStart + Math.floor(interval * i);
    const hours = Math.floor(timeInMinutes / 60);
    const minutes = timeInMinutes % 60;
    times.push(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
  }

  return times;
};

/**
 * Generate calendar task schedule for daily frequency
 */
const generateDailySchedule = (params: TaskScheduleParams): TaskScheduleItem[] => {
  const { repeatCount, startDate, endDate, startTime } = params;
  const schedule: TaskScheduleItem[] = [];
  const days = calculateDaysBetween(startDate, endDate);
  
  // Generate time slots for each day
  const dailyTimeSlots = generateDailyTimeSlots(repeatCount, startTime);
  
  // Create tasks for each day
  for (let dayOffset = 0; dayOffset < days; dayOffset++) {
    const currentDate = parseDate(startDate);
    currentDate.setDate(currentDate.getDate() + dayOffset);
    const dateString = formatDate(currentDate);
    
    // Add all time slots for this day
    for (const time of dailyTimeSlots) {
      schedule.push({
        date: dateString,
        time: time,
      });
    }
  }
  
  return schedule;
};

/**
 * Generate calendar task schedule for weekly frequency
 */
const generateWeeklySchedule = (params: TaskScheduleParams): TaskScheduleItem[] => {
  const { repeatCount, startDate, endDate, startTime } = params;
  const schedule: TaskScheduleItem[] = [];
  const weeks = calculateWeeksBetween(startDate, endDate);
  
  // Generate time slots distributed across the week
  const weeklyTimeSlots = generateDailyTimeSlots(repeatCount, startTime);
  
  // Calculate day intervals for distributing across the week
  const dayInterval = Math.floor(7 / repeatCount);
  
  for (let week = 0; week < weeks; week++) {
    const weekStartDate = parseDate(startDate);
    weekStartDate.setDate(weekStartDate.getDate() + (week * 7));
    
    // Distribute tasks across the week
    for (let taskIndex = 0; taskIndex < repeatCount; taskIndex++) {
      const dayOffset = taskIndex * dayInterval;
      const taskDate = new Date(weekStartDate);
      taskDate.setDate(taskDate.getDate() + dayOffset);
      
      // Ensure we don't exceed the end date
      const taskDateString = formatDate(taskDate);
      if (taskDateString <= endDate) {
        schedule.push({
          date: taskDateString,
          time: weeklyTimeSlots[taskIndex] || weeklyTimeSlots[0],
        });
      }
    }
  }
  
  return schedule;
};

/**
 * Generate calendar task schedule for stage frequency
 */
const generateStageSchedule = (params: TaskScheduleParams): TaskScheduleItem[] => {
  const { repeatCount, startDate, endDate, startTime } = params;
  const schedule: TaskScheduleItem[] = [];
  const totalDays = calculateDaysBetween(startDate, endDate);
  
  if (repeatCount === 1) {
    // Single task - use provided start time and date
    return [{
      date: startDate,
      time: startTime,
    }];
  }
  
  // Multiple tasks - distribute evenly across the stage duration
  const dayInterval = Math.floor(totalDays / repeatCount);
  const timeSlots = generateDailyTimeSlots(repeatCount, startTime);
  
  for (let taskIndex = 0; taskIndex < repeatCount; taskIndex++) {
    const dayOffset = taskIndex * dayInterval;
    const taskDate = parseDate(startDate);
    taskDate.setDate(taskDate.getDate() + dayOffset);
    
    // Ensure we don't exceed the end date
    const taskDateString = formatDate(taskDate);
    if (taskDateString <= endDate) {
      schedule.push({
        date: taskDateString,
        time: timeSlots[taskIndex] || timeSlots[0],
      });
    }
  }
  
  return schedule;
};

/**
 * Main function to generate task schedule based on frequency parameters
 */
export const generateTaskSchedule = (params: TaskScheduleParams): TaskScheduleItem[] => {
  const { repeatUnit } = params;
  
  // Validate parameters
  if (!params.startDate || !params.endDate || !params.startTime) {
    throw new Error('Start date, end date, and start time are required for calendar task generation');
  }
  
  if (params.repeatCount < 1 || params.repeatCount > 7) {
    throw new Error('Repeat count must be between 1 and 7');
  }
  
  // Validate date range
  if (parseDate(params.startDate) > parseDate(params.endDate)) {
    throw new Error('Start date must be before or equal to end date');
  }
  
  switch (repeatUnit) {
    case 'day':
      return generateDailySchedule(params);
    case 'week':
      return generateWeeklySchedule(params);
    case 'stage':
      return generateStageSchedule(params);
    default:
      throw new Error(`Unsupported repeat unit: ${repeatUnit}`);
  }
};

/**
 * Calculate total number of calendar tasks that will be generated
 */
export const calculateTotalTasks = (params: TaskScheduleParams): number => {
  const { repeatCount, repeatUnit, startDate, endDate } = params;
  
  switch (repeatUnit) {
    case 'day':
      const days = calculateDaysBetween(startDate, endDate);
      return repeatCount * days;
    case 'week':
      const weeks = calculateWeeksBetween(startDate, endDate);
      return repeatCount * weeks;
    case 'stage':
      return repeatCount;
    default:
      return 0;
  }
};

/**
 * Generate a human-readable description of the task schedule
 */
export const generateScheduleDescription = (params: TaskScheduleParams): string => {
  const totalTasks = calculateTotalTasks(params);
  const { repeatCount, repeatUnit, startDate, endDate } = params;
  
  const startDateObj = parseDate(startDate);
  const endDateObj = parseDate(endDate);
  const dateRange = `${startDateObj.toLocaleDateString()} - ${endDateObj.toLocaleDateString()}`;
  
  switch (repeatUnit) {
    case 'day':
      const days = calculateDaysBetween(startDate, endDate);
      return `${totalTasks} tasks: ${repeatCount} time${repeatCount > 1 ? 's' : ''} per day for ${days} day${days > 1 ? 's' : ''} (${dateRange})`;
    case 'week':
      const weeks = calculateWeeksBetween(startDate, endDate);
      return `${totalTasks} tasks: ${repeatCount} time${repeatCount > 1 ? 's' : ''} per week for ${weeks} week${weeks > 1 ? 's' : ''} (${dateRange})`;
    case 'stage':
      return `${totalTasks} tasks: ${repeatCount} time${repeatCount > 1 ? 's' : ''} over stage duration (${dateRange})`;
    default:
      return `${totalTasks} tasks (${dateRange})`;
  }
};
