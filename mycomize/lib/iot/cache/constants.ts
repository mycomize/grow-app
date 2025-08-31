/**
 * Cache Constants and Configuration
 * 
 * Configuration values for the sensor history caching system.
 * Defines cache directory structure, expiration policies, and file naming conventions.
 */

// Cache directory and file structure
export const CACHE_CONSTANTS = {
  // Directory for cache files
  CACHE_DIRECTORY: 'sensor_cache/',
  
  // AsyncStorage key for cache metadata index
  CACHE_INDEX_KEY: 'sensor_cache_index',
  
  // File naming pattern for individual sensor data files
  // Format: sensor_{gateway_id}_{sanitized_entity_id}.json
  FILE_NAME_PATTERN: (gatewayId: number, entityId: string) => 
    `sensor_${gatewayId}_${entityId.replace(/\./g, '_').replace(/[^a-zA-Z0-9_]/g, '_')}.json`,
  
  // Cache expiration and cleanup settings
  EXPIRATION: {
    // Maximum age of cached data in months (rolling window)
    MAX_AGE_MONTHS: 2,
    
    // How often to check for expired data (in milliseconds)
    // Check every 24 hours
    CLEANUP_CHECK_INTERVAL: 24 * 60 * 60 * 1000,
    
    // Minimum time between cache purge operations (in milliseconds)
    // Prevent too frequent purging - minimum 1 hour between purges
    MIN_PURGE_INTERVAL: 60 * 60 * 1000,
  },
  
  // Performance and storage limits
  LIMITS: {
    // Maximum data points per entity file
    MAX_DATA_POINTS_PER_ENTITY: 100000, // ~2 months of 1-minute data
    
    // Maximum file size in bytes (approximate)
    MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB per entity
    
    // Maximum total cache size in bytes
    MAX_TOTAL_CACHE_SIZE: 500 * 1024 * 1024, // 500MB total
    
    // Batch size for processing large datasets
    BATCH_SIZE: 1000,
  },
  
  // Cache validation and integrity
  VALIDATION: {
    // Current cache format version (for future migrations)
    CACHE_FORMAT_VERSION: '1.0.0',
    
    // Minimum required fields for cached data points
    REQUIRED_DATA_FIELDS: ['timestamp', 'value', 'state'] as const,
    
    // Minimum required fields for cached metadata
    REQUIRED_METADATA_FIELDS: ['entity_id', 'gateway_id', 'device_class', 'friendly_name', 
                              'first_cached_timestamp', 'last_cached_timestamp', 
                              'data_points_count', 'file_size_bytes', 'last_updated'] as const,
  }
} as const;

// Time scale constants for cache queries
export const TIME_SCALE_HOURS = {
  '1D': 24,
  '1W': 24 * 7,
  '1M': 24 * 30, // 1 month
  'STAGE': 0, // Dynamic - calculated based on stage start date
} as const;

// Cache operation result codes
export enum CacheOperationResult {
  SUCCESS = 'success',
  PARTIAL_SUCCESS = 'partial_success',
  FAILURE = 'failure',
  NOT_FOUND = 'not_found',
  EXPIRED = 'expired',
  INVALID_DATA = 'invalid_data',
}

// Cache health status indicators
export enum CacheHealthStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
  UNKNOWN = 'unknown',
}
