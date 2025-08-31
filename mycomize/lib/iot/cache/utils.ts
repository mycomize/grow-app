/**
 * Cache Utility Functions
 * 
 * Data transformation, validation, and helper functions for the sensor history
 * caching system. Provides conversion between Home Assistant API format and
 * cached data format, along with time range calculations and validation.
 */

import { CACHE_CONSTANTS, TIME_SCALE_HOURS } from './constants';
import {
  CachedSensorDataPoint,
  HAHistoryDataPoint,
  TimeRange,
  TimeScale,
  CachedSensorMetadata,
} from './types';

/**
 * Convert Home Assistant API data to cached format
 * Transforms HA history data points to our standardized cache format
 */
export const convertHADataToCachedFormat = (haData: HAHistoryDataPoint[]): CachedSensorDataPoint[] => {
  if (!Array.isArray(haData)) {
    console.warn('[CacheUtils] Invalid HA data format - expected array');
    return [];
  }

  return haData
    .filter(point => point && point.last_changed && point.state !== undefined)
    .map(point => {
      // Convert state to number, fallback to 0 for non-numeric states
      let numericValue = 0;
      if (typeof point.state === 'string') {
        const parsed = parseFloat(point.state);
        if (!isNaN(parsed)) {
          numericValue = parsed;
        }
      } else if (typeof point.state === 'number') {
        numericValue = point.state;
      }

      return {
        timestamp: new Date(point.last_changed).toISOString(),
        value: numericValue,
        state: String(point.state),
      };
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

/**
 * Calculate time range based on time scale and optional grow context
 * Returns consistent time ranges for cache queries and API calls
 */
export const calculateTimeRange = (
  timeScale: TimeScale,
  referenceDate: Date = new Date(),
  growStartDate?: string,
  stageStartDate?: string
): TimeRange => {
  const end = new Date(referenceDate);
  let start: Date;

  switch (timeScale) {
    case '1D':
      start = new Date(end.getTime() - (TIME_SCALE_HOURS['1D'] * 60 * 60 * 1000));
      break;
    case '1W':
      start = new Date(end.getTime() - (TIME_SCALE_HOURS['1W'] * 60 * 60 * 1000));
      break;
    case '1M':
      start = new Date(end.getTime() - (TIME_SCALE_HOURS['1M'] * 60 * 60 * 1000));
      break;
    case 'STAGE':
      // STAGE option only appears when stageStartDate exists, so this should always be available
      start = new Date(stageStartDate!);
      break;
    default:
      // Default to 1D if unknown scale
      start = new Date(end.getTime() - (TIME_SCALE_HOURS['1D'] * 60 * 60 * 1000));
      break;
  }

  return { start, end };
};

/**
 * Check if data point is expired based on cache expiration policy
 * Uses rolling window approach - data older than MAX_AGE_MONTHS is considered expired
 */
export const isDataExpired = (timestamp: string, maxAgeMonths: number = CACHE_CONSTANTS.EXPIRATION.MAX_AGE_MONTHS): boolean => {
  try {
    const dataDate = new Date(timestamp);
    const expirationDate = new Date();
    expirationDate.setMonth(expirationDate.getMonth() - maxAgeMonths);
    
    return dataDate < expirationDate;
  } catch (error) {
    console.warn('[CacheUtils] Invalid timestamp for expiration check:', timestamp);
    return true; // Treat invalid timestamps as expired
  }
};

/**
 * Sanitize entity ID for safe filename usage
 * Converts HA entity IDs to filesystem-safe strings
 */
export const sanitizeEntityIdForFilename = (entityId: string): string => {
  if (!entityId || typeof entityId !== 'string') {
    return 'unknown_entity';
  }
  
  return entityId
    .replace(/\./g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .toLowerCase();
};

/**
 * Generate cache filename for an entity
 * Creates consistent filename pattern for cache files
 */
export const generateCacheFilename = (gatewayId: number, entityId: string): string => {
  const sanitizedEntityId = sanitizeEntityIdForFilename(entityId);
  return CACHE_CONSTANTS.FILE_NAME_PATTERN(gatewayId, sanitizedEntityId);
};

/**
 * Merge cached data with fresh API data, removing duplicates
 * Combines cached and fresh data while maintaining chronological order
 */
export const mergeCachedAndFreshData = (
  cachedData: CachedSensorDataPoint[],
  freshData: CachedSensorDataPoint[]
): CachedSensorDataPoint[] => {
  // Create a Set of cached timestamps for duplicate detection
  const cachedTimestamps = new Set(cachedData.map(point => point.timestamp));
  
  // Filter out fresh data that already exists in cache
  const uniqueFreshData = freshData.filter(point => !cachedTimestamps.has(point.timestamp));
  
  // Combine and sort by timestamp
  const combined = [...cachedData, ...uniqueFreshData];
  return combined.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

/**
 * Filter data points within a specific time range
 * Returns only data points that fall within the specified time range
 */
export const filterDataByTimeRange = (
  data: CachedSensorDataPoint[],
  timeRange: TimeRange
): CachedSensorDataPoint[] => {
  const startTime = timeRange.start.getTime();
  const endTime = timeRange.end.getTime();
  
  return data.filter(point => {
    const pointTime = new Date(point.timestamp).getTime();
    return pointTime >= startTime && pointTime <= endTime;
  });
};

/**
 * Calculate cache hit ratio for a query result
 * Determines what percentage of requested data was served from cache
 */
export const calculateCacheHitRatio = (
  requestedRange: TimeRange,
  cachedRange?: { start: string; end: string }
): number => {
  if (!cachedRange) {
    return 0;
  }
  
  try {
    const requestedStart = requestedRange.start.getTime();
    const requestedEnd = requestedRange.end.getTime();
    const requestedDuration = requestedEnd - requestedStart;
    
    const cachedStartTime = new Date(cachedRange.start).getTime();
    const cachedEndTime = new Date(cachedRange.end).getTime();
    
    const cachedStart = Math.max(cachedStartTime, requestedStart);
    const cachedEnd = Math.min(cachedEndTime, requestedEnd);
    
    if (cachedEnd <= cachedStart) {
      return 0;
    }
    
    const cachedDuration = cachedEnd - cachedStart;
    const hitRatio = Math.min(1, cachedDuration / requestedDuration);
    
    return hitRatio;
  } catch (error) {
    console.warn('[CacheUtils] Error calculating cache hit ratio:', error);
    return 0;
  }
};

/**
 * Validate cached data point structure
 * Ensures data point has all required fields and valid values
 */
export const validateCachedDataPoint = (point: any): point is CachedSensorDataPoint => {
  if (!point || typeof point !== 'object') {
    return false;
  }
  
  // Check required fields
  if (typeof point.timestamp !== 'string' || !point.timestamp) {
    return false;
  }
  
  if (typeof point.value !== 'number' || isNaN(point.value)) {
    return false;
  }
  
  if (typeof point.state !== 'string') {
    return false;
  }
  
  // Validate timestamp format
  try {
    const date = new Date(point.timestamp);
    if (isNaN(date.getTime())) {
      return false;
    }
  } catch (error) {
    return false;
  }
  
  return true;
};

/**
 * Validate cached metadata structure
 * Ensures metadata has all required fields and valid values
 */
export const validateCachedMetadata = (metadata: any): metadata is CachedSensorMetadata => {
  if (!metadata || typeof metadata !== 'object') {
    return false;
  }
  
  const requiredFields = CACHE_CONSTANTS.VALIDATION.REQUIRED_METADATA_FIELDS;
  
  for (const field of requiredFields) {
    if (!(field in metadata)) {
      return false;
    }
  }
  
  // Validate specific field types
  if (typeof metadata.entity_id !== 'string' || !metadata.entity_id) {
    return false;
  }
  
  if (typeof metadata.gateway_id !== 'number') {
    return false;
  }
  
  if (typeof metadata.data_points_count !== 'number' || metadata.data_points_count < 0) {
    return false;
  }
  
  if (typeof metadata.file_size_bytes !== 'number' || metadata.file_size_bytes < 0) {
    return false;
  }
  
  // Validate timestamps
  try {
    new Date(metadata.first_cached_timestamp);
    new Date(metadata.last_cached_timestamp);
    new Date(metadata.last_updated);
  } catch (error) {
    return false;
  }
  
  return true;
};

/**
 * Calculate estimated file size for data points
 * Provides rough estimation of cache file size for storage planning
 */
export const estimateDataSize = (dataPoints: CachedSensorDataPoint[]): number => {
  if (!Array.isArray(dataPoints) || dataPoints.length === 0) {
    return 0;
  }
  
  // Rough estimation: JSON overhead + data size
  // Average: ~60 bytes per data point (timestamp, value, state + JSON structure)
  const avgBytesPerPoint = 60;
  return dataPoints.length * avgBytesPerPoint;
};

/**
 * Chunk large arrays for batch processing
 * Splits large data arrays into smaller chunks for memory-efficient processing
 */
export const chunkArray = <T>(array: T[], chunkSize: number = CACHE_CONSTANTS.LIMITS.BATCH_SIZE): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

/**
 * Get current timestamp in ISO format
 * Provides consistent timestamp formatting across the cache system
 */
export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};

/**
 * Remove expired data points from an array
 * Filters out data points older than the specified age
 */
export const removeExpiredDataPoints = (
  dataPoints: CachedSensorDataPoint[],
  maxAgeMonths: number = CACHE_CONSTANTS.EXPIRATION.MAX_AGE_MONTHS
): CachedSensorDataPoint[] => {
  return dataPoints.filter(point => !isDataExpired(point.timestamp, maxAgeMonths));
};

/**
 * Find the gap between cached data and requested time range
 * Determines what time range needs to be fetched from API
 * Uses intelligent boundary detection to avoid unnecessary API calls
 */
export const findDataGap = (
  requestedRange: TimeRange,
  cachedMetadata?: CachedSensorMetadata
): TimeRange | null => {
  if (!cachedMetadata) {
    console.log('[CacheUtils] No cached metadata, returning full requested range');
    return requestedRange;
  }
  
  try {
    const cachedStart = new Date(cachedMetadata.first_cached_timestamp);
    const cachedEnd = new Date(cachedMetadata.last_cached_timestamp);
    
    const requestedDuration = requestedRange.end.getTime() - requestedRange.start.getTime();
    
    console.log(`[CacheUtils] findDataGap analysis:`);
    console.log(`  Requested: ${requestedRange.start.toISOString()} to ${requestedRange.end.toISOString()}`);
    console.log(`  Cached: ${cachedStart.toISOString()} to ${cachedEnd.toISOString()}`);
    console.log(`  Requested duration: ${(requestedDuration / (1000 * 60 * 60)).toFixed(1)}h`);
    
    // Define base tolerance for "close enough" boundaries (5 minutes)
    const BASE_BOUNDARY_TOLERANCE_MS = 5 * 60 * 1000;
    
    // Calculate adaptive tolerance based on requested duration
    // For longer time ranges, allow larger gaps to avoid fetching tiny amounts
    // Use 0.5% of requested duration, but cap it at reasonable limits
    const adaptiveTolerance = Math.min(
      requestedDuration * 0.005, // 0.5% of requested duration
      60 * 60 * 1000 // Max 1 hour
    );
    const BOUNDARY_TOLERANCE_MS = Math.max(BASE_BOUNDARY_TOLERANCE_MS, adaptiveTolerance);
    
    console.log(`  Boundary tolerance: ${(BOUNDARY_TOLERANCE_MS / (1000 * 60)).toFixed(1)}min (${(BOUNDARY_TOLERANCE_MS / requestedDuration * 100).toFixed(2)}% of duration)`);
    
    // Calculate how much of the requested range is actually covered by cache
    const coverageStart = Math.max(cachedStart.getTime(), requestedRange.start.getTime());
    const coverageEnd = Math.min(cachedEnd.getTime(), requestedRange.end.getTime());
    const coveredDuration = Math.max(0, coverageEnd - coverageStart);
    
    const coverageRatio = requestedDuration > 0 ? coveredDuration / requestedDuration : 0;
    
    console.log(`  Coverage: ${(coverageRatio * 100).toFixed(1)}% (${(coveredDuration / (1000 * 60 * 60)).toFixed(1)}h covered)`);
    
    // Check for gaps that justify an API call
    const startGap = requestedRange.start.getTime() - cachedStart.getTime();
    const endGap = requestedRange.end.getTime() - cachedEnd.getTime();
    
    console.log(`  Start gap: ${(startGap / (1000 * 60 * 60)).toFixed(1)}h, End gap: ${(endGap / (1000 * 60 * 60)).toFixed(1)}h`);
    
    // Smart gap analysis considering Home Assistant retention limits
    
    // Case 1: Check if we need newer data (gap at the end)
    if (endGap > BOUNDARY_TOLERANCE_MS) {
      const gapDuration = endGap;
      const gapPercentage = (gapDuration / requestedDuration) * 100;
      
      // Only fetch if the gap is significant enough relative to the request
      // AND we're not dealing with a tiny gap in a large time range
      if (gapPercentage >= 1.0) { // Gap must be at least 1% of requested duration
        const gapRange = {
          start: new Date(Math.max(cachedEnd.getTime(), requestedRange.start.getTime())),
          end: requestedRange.end
        };
        console.log(`  Returning newer data gap: ${gapRange.start.toISOString()} to ${gapRange.end.toISOString()} (${gapPercentage.toFixed(1)}% of request)`);
        return gapRange;
      } else {
        console.log(`  End gap too small (${gapPercentage.toFixed(2)}% < 1.0%), skipping fetch`);
      }
    }
    
    // Case 2: Check if we need older data (gap at the start)  
    if (startGap < -BOUNDARY_TOLERANCE_MS) {
      const gapDuration = Math.abs(startGap);
      const gapPercentage = (gapDuration / requestedDuration) * 100;
      
      // For older data, be more lenient since HA may not have it due to retention limits
      // Only fetch if gap is significant (>10% of request) to avoid wasting API calls
      // on data that doesn't exist due to HA retention policies
      if (gapPercentage >= 10.0) { // Higher threshold for historical data
        const gapRange = {
          start: requestedRange.start,
          end: new Date(Math.min(cachedStart.getTime(), requestedRange.end.getTime()))
        };
        console.log(`  Returning older data gap: ${gapRange.start.toISOString()} to ${gapRange.end.toISOString()} (${gapPercentage.toFixed(1)}% of request)`);
        return gapRange;
      } else {
        console.log(`  Start gap likely due to HA retention limits (${gapPercentage.toFixed(1)}% < 10.0%), skipping fetch`);
      }
    }
    
    // Case 3: High coverage ratio indicates we have most available data
    if (coverageRatio >= 0.95) {
      console.log(`  High coverage ratio (${(coverageRatio * 100).toFixed(1)}% >= 95%), no gap needed`);
      return null;
    }
    
    // Case 4: Even with low coverage, if gaps are small, don't fetch
    const totalGapDuration = Math.abs(startGap) + Math.abs(endGap);
    const totalGapPercentage = (totalGapDuration / requestedDuration) * 100;
    
    if (totalGapPercentage < 2.0) { // Combined gaps < 2% of total request
      console.log(`  Total gaps too small (${totalGapPercentage.toFixed(2)}% < 2.0%), no fetch needed`);
      return null;
    }
    
    console.log(`  No significant gaps found after smart analysis, no fetch needed`);
    return null;
  } catch (error) {
    console.warn('[CacheUtils] Error finding data gap:', error);
    return requestedRange; // Fallback: fetch entire range
  }
};

/**
 * Create metadata object from data points and entity info
 * Generates cache metadata based on data points and entity details
 */
export const createMetadataFromData = (
  entityId: string,
  gatewayId: number,
  dataPoints: CachedSensorDataPoint[],
  entityInfo?: {
    unit_of_measurement?: string;
    device_class?: string;
    friendly_name?: string;
  }
): CachedSensorMetadata => {
  const now = getCurrentTimestamp();
  const sortedData = [...dataPoints].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  return {
    entity_id: entityId,
    gateway_id: gatewayId,
    unit_of_measurement: entityInfo?.unit_of_measurement,
    device_class: entityInfo?.device_class || 'sensor',
    friendly_name: entityInfo?.friendly_name || entityId,
    first_cached_timestamp: sortedData[0]?.timestamp || now,
    last_cached_timestamp: sortedData[sortedData.length - 1]?.timestamp || now,
    data_points_count: sortedData.length,
    file_size_bytes: estimateDataSize(sortedData),
    last_updated: now,
    cache_version: CACHE_CONSTANTS.VALIDATION.CACHE_FORMAT_VERSION,
  };
};

/**
 * Format bytes to human-readable string
 * Converts byte values to readable format for logging and debugging
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Deep clone an object (for avoiding mutations)
 * Creates deep copies of cache objects to prevent unintended modifications
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  
  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  
  return cloned;
};
