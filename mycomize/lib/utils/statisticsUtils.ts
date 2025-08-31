/**
 * Statistics utility functions for calculating descriptive statistics
 * from sensor data arrays
 */

/**
 * Calculates the arithmetic mean (average) of an array of numbers
 * @param values Array of numeric values
 * @returns Mean value or 0 if array is empty
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * Calculates the median (middle value) of an array of numbers
 * @param values Array of numeric values
 * @returns Median value or 0 if array is empty
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    // Even number of values - average the two middle values
    return (sorted[middle - 1] + sorted[middle]) / 2;
  } else {
    // Odd number of values - return middle value
    return sorted[middle];
  }
}

/**
 * Finds the minimum value in an array of numbers
 * @param values Array of numeric values
 * @returns Minimum value or 0 if array is empty
 */
export function calculateMin(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.min(...values);
}

/**
 * Finds the maximum value in an array of numbers
 * @param values Array of numeric values
 * @returns Maximum value or 0 if array is empty
 */
export function calculateMax(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values);
}

/**
 * Formats a statistic value to 1 decimal place with optional unit
 * @param value Numeric value to format
 * @param unit Optional unit of measurement
 * @returns Formatted string with 1 decimal place
 */
export function formatStatisticValue(value: number, unit?: string): string {
  const formatted = value.toFixed(1);
  return unit ? `${formatted}${unit}` : formatted;
}

// TypeScript interfaces for sensor statistics
export interface SensorStatistics {
  mean: number;
  median: number;
  min: number;
  max: number;
  count: number;
  unitOfMeasurement?: string;
}

export interface StatisticItem {
  label: string;
  value: string;
  rawValue: number;
  unit?: string;
}

/**
 * Calculates complete sensor statistics from data array
 * @param data Array of data points with numeric values
 * @param unitOfMeasurement Optional unit of measurement
 * @returns Complete sensor statistics object
 */
export function calculateSensorStatistics(
  data: Array<{ value: number }>,
  unitOfMeasurement?: string
): SensorStatistics {
  const values = data.map(point => point.value);
  
  return {
    mean: calculateMean(values),
    median: calculateMedian(values),
    min: calculateMin(values),
    max: calculateMax(values),
    count: values.length,
    unitOfMeasurement,
  };
}

/**
 * Converts sensor statistics to array of display items for UI rendering
 * @param statistics Sensor statistics object
 * @returns Array of statistic items formatted for display
 */
export function formatStatisticsForDisplay(statistics: SensorStatistics): StatisticItem[] {
  const { mean, median, min, max, unitOfMeasurement } = statistics;
  
  return [
    {
      label: 'Mean',
      value: formatStatisticValue(mean, unitOfMeasurement),
      rawValue: mean,
      unit: unitOfMeasurement,
    },
    {
      label: 'Median',
      value: formatStatisticValue(median, unitOfMeasurement),
      rawValue: median,
      unit: unitOfMeasurement,
    },
    {
      label: 'Min',
      value: formatStatisticValue(min, unitOfMeasurement),
      rawValue: min,
      unit: unitOfMeasurement,
    },
    {
      label: 'Max',
      value: formatStatisticValue(max, unitOfMeasurement),
      rawValue: max,
      unit: unitOfMeasurement,
    },
  ];
}
