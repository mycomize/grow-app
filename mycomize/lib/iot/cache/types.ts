/**
 * TypeScript Types and Interfaces for Sensor History Cache
 * 
 * Comprehensive type definitions for the caching system to ensure type safety
 * across all cache operations, data structures, and API interactions.
 */

import { CacheOperationResult, CacheHealthStatus } from './constants';

// Core data structures
export interface CachedSensorDataPoint {
  /** ISO 8601 timestamp string */
  timestamp: string;
  /** Numeric sensor value */
  value: number;
  /** Raw state string from Home Assistant */
  state: string;
}

export interface CachedSensorMetadata {
  /** Home Assistant entity ID (e.g., 'sensor.temperature') */
  entity_id: string;
  /** Gateway ID that owns this entity */
  gateway_id: number;
  /** Unit of measurement from HA (e.g., '°C', '%', 'lux') */
  unit_of_measurement?: string;
  /** Device class from HA (e.g., 'temperature', 'humidity') */
  device_class: string;
  /** Human-readable name from HA */
  friendly_name: string;
  /** ISO timestamp of first cached data point */
  first_cached_timestamp: string;
  /** ISO timestamp of last cached data point */
  last_cached_timestamp: string;
  /** Total number of data points in cache */
  data_points_count: number;
  /** Size of cache file in bytes */
  file_size_bytes: number;
  /** ISO timestamp when cache was last updated */
  last_updated: string;
  /** Cache format version for future migrations */
  cache_version?: string;
}

export interface CacheIndex {
  /** Map of entity_id to metadata */
  [entity_id: string]: CachedSensorMetadata;
}

export interface TimeRange {
  /** Start time for data query */
  start: Date;
  /** End time for data query */
  end: Date;
}

export interface CacheQueryResult {
  /** Cached data points found for the requested time range */
  cachedData: CachedSensorDataPoint[];
  /** Whether additional data needs to be fetched from API */
  needsFetch: boolean;
  /** Time range that needs to be fetched from API */
  fetchRange?: TimeRange;
  /** Last timestamp in cached data for differential loading */
  lastCachedTimestamp?: string;
  /** First timestamp in cached data */
  firstCachedTimestamp?: string;
  /** Cache hit ratio for this query */
  cacheHitRatio: number;
}

export interface CacheStats {
  /** Total number of entities in cache */
  totalEntities: number;
  /** Total number of data points across all entities */
  totalDataPoints: number;
  /** Total size of all cache files in bytes */
  totalFileSizeBytes: number;
  /** ISO timestamp of oldest cached data across all entities */
  oldestData?: string;
  /** ISO timestamp of newest cached data across all entities */
  newestData?: string;
  /** Cache health status */
  healthStatus: CacheHealthStatus;
  /** Last time cache was validated */
  lastValidation?: string;
  /** Number of entities with data older than max age */
  expiredEntities: number;
}

export interface CacheOperationReport {
  /** Result of the cache operation */
  result: CacheOperationResult;
  /** Human-readable message about the operation */
  message: string;
  /** Number of entities affected */
  entitiesAffected: number;
  /** Number of data points processed */
  dataPointsProcessed: number;
  /** Time taken for the operation in milliseconds */
  durationMs: number;
  /** Any errors encountered during operation */
  errors?: string[];
}

// Home Assistant API data types (for transformation)
export interface HAHistoryDataPoint {
  /** HA timestamp format */
  last_changed: string;
  /** String representation of sensor value */
  state: string;
  /** Additional attributes from HA */
  attributes?: {
    unit_of_measurement?: string;
    device_class?: string;
    friendly_name?: string;
    [key: string]: any;
  };
}

// Time scale type for SensorGraph integration
export type TimeScale = '1D' | '1W' | '1M' | 'STAGE';

// Cache configuration options
export interface CacheConfig {
  /** Enable/disable caching system */
  enabled: boolean;
  /** Maximum age of cached data in months */
  maxAgeMonths: number;
  /** Maximum total cache size in bytes */
  maxTotalSizeBytes: number;
  /** Enable automatic cache cleanup */
  autoCleanup: boolean;
  /** Debug logging enabled */
  debugMode: boolean;
}

// Cache file structure for JSON storage
export interface CachedEntityFile {
  /** Metadata about the cached entity */
  metadata: CachedSensorMetadata;
  /** Array of data points */
  data: CachedSensorDataPoint[];
  /** File format version */
  version: string;
  /** Last modification timestamp */
  lastModified: string;
}

// Cache validation result
export interface CacheValidationResult {
  /** Whether cache is valid */
  isValid: boolean;
  /** Issues found during validation */
  issues: string[];
  /** Entities that need repair */
  entitiesNeedingRepair: string[];
  /** Entities that should be purged */
  entitiesNeedingPurge: string[];
  /** Cache health score (0-100) */
  healthScore: number;
}

// Utility type for cache query options
export interface CacheQueryOptions {
  /** Time range to query */
  timeRange: TimeRange;
  /** Whether to include expired data */
  includeExpired?: boolean;
  /** Maximum number of data points to return */
  maxDataPoints?: number;
  /** Whether to skip API fetch if cache is insufficient */
  cacheOnly?: boolean;
}

// Type for cache cleanup result
export interface CacheCleanupResult {
  /** Number of entities cleaned */
  entitiesCleaned: number;
  /** Number of data points removed */
  dataPointsRemoved: number;
  /** Bytes freed */
  bytesFreed: number;
  /** Entities that had errors during cleanup */
  errors: Array<{
    entity_id: string;
    error: string;
  }>;
}

// Utility type guards
export const isCachedSensorDataPoint = (obj: any): obj is CachedSensorDataPoint => {
  return typeof obj === 'object' &&
         typeof obj.timestamp === 'string' &&
         typeof obj.value === 'number' &&
         typeof obj.state === 'string';
};

export const isCachedSensorMetadata = (obj: any): obj is CachedSensorMetadata => {
  return typeof obj === 'object' &&
         typeof obj.entity_id === 'string' &&
         typeof obj.gateway_id === 'number' &&
         typeof obj.device_class === 'string' &&
         typeof obj.friendly_name === 'string' &&
         typeof obj.first_cached_timestamp === 'string' &&
         typeof obj.last_cached_timestamp === 'string' &&
         typeof obj.data_points_count === 'number' &&
         typeof obj.file_size_bytes === 'number' &&
         typeof obj.last_updated === 'string';
};
