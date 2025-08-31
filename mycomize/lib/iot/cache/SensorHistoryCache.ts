/**
 * SensorHistoryCache - Main cache manager class
 * 
 * Provides high-performance local caching for sensor history data with differential loading.
 * Stores up to 2 months of sensor data per entity, automatically manages data expiration,
 * and seamlessly integrates with Home Assistant API calls.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

import { CACHE_CONSTANTS, CacheOperationResult, CacheHealthStatus } from './constants';
import {
  CachedSensorDataPoint,
  CachedSensorMetadata,
  CacheIndex,
  TimeRange,
  CacheQueryResult,
  CacheStats,
  CacheOperationReport,
  CachedEntityFile,
  CacheValidationResult,
  CacheCleanupResult,
  HAHistoryDataPoint,
} from './types';
import {
  convertHADataToCachedFormat,
  generateCacheFilename,
  validateCachedDataPoint,
  validateCachedMetadata,
  mergeCachedAndFreshData,
  filterDataByTimeRange,
  calculateCacheHitRatio,
  findDataGap,
  createMetadataFromData,
  removeExpiredDataPoints,
  estimateDataSize,
  getCurrentTimestamp,
  formatBytes,
  deepClone,
} from './utils';

/**
 * SensorHistoryCache - Singleton class for managing sensor data cache
 */
export class SensorHistoryCache {
  private static instance: SensorHistoryCache;
  private cacheIndex: CacheIndex = {};
  private initialized: boolean = false;
  private cacheDirectory: string;

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    this.cacheDirectory = `${FileSystem.documentDirectory}${CACHE_CONSTANTS.CACHE_DIRECTORY}`;
  }

  /**
   * Get singleton instance of cache
   */
  public static getInstance(): SensorHistoryCache {
    if (!SensorHistoryCache.instance) {
      SensorHistoryCache.instance = new SensorHistoryCache();
    }
    return SensorHistoryCache.instance;
  }

  /**
   * Initialize cache system - sets up directories and loads index
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('[SensorCache] Initializing cache system...');
      
      // Create cache directory if it doesn't exist
      await this.ensureCacheDirectoryExists();
      
      // Load cache index from AsyncStorage
      await this.loadCacheIndex();
      
      this.initialized = true;
      console.log('[SensorCache] Cache system initialized successfully');
    } catch (error) {
      console.error('[SensorCache] Failed to initialize cache system:', error);
      throw error;
    }
  }

  /**
   * Query cached data for an entity within a time range
   * Returns cached data and indicates if additional API fetch is needed
   */
  public async getCachedData(
    entityId: string,
    timeRange: TimeRange
  ): Promise<CacheQueryResult> {
    await this.ensureInitialized();

    const metadata = this.cacheIndex[entityId];
    const startTime = Date.now();

    // Default result for cache miss
    let result: CacheQueryResult = {
      cachedData: [],
      needsFetch: true,
      fetchRange: timeRange,
      cacheHitRatio: 0,
    };

    try {
      if (!metadata) {
        return result;
      }

      // Load cached data from file
      const cachedData = await this.loadEntityData(entityId);
      if (!cachedData || cachedData.length === 0) {
        return result;
      }

      // Filter data by requested time range
      const filteredData = filterDataByTimeRange(cachedData, timeRange);
      
      // Calculate cache hit ratio
      const cachedRange = {
        start: metadata.first_cached_timestamp,
        end: metadata.last_cached_timestamp,
      };
      const hitRatio = calculateCacheHitRatio(timeRange, cachedRange);

      // Determine if additional data needs to be fetched
      const dataGap = findDataGap(timeRange, metadata);
      
      result = {
        cachedData: filteredData,
        needsFetch: dataGap !== null,
        fetchRange: dataGap || undefined,
        lastCachedTimestamp: metadata.last_cached_timestamp,
        firstCachedTimestamp: metadata.first_cached_timestamp,
        cacheHitRatio: hitRatio,
      };

      const duration = Date.now() - startTime;
      console.log(
        `[SensorCache] Cache query for ${entityId}: ${filteredData.length} points, ` +
        `hit ratio: ${(hitRatio * 100).toFixed(1)}%, took ${duration}ms`
      );

      return result;
    } catch (error) {
      console.error(`[SensorCache] Error querying cache for ${entityId}:`, error);
      return result; // Return cache miss result on error
    }
  }

  /**
   * Cache new sensor data for an entity
   * Merges with existing data and updates metadata
   */
  public async cacheData(
    entityId: string,
    gatewayId: number,
    newData: CachedSensorDataPoint[],
    entityInfo?: {
      unit_of_measurement?: string;
      device_class?: string;
      friendly_name?: string;
    }
  ): Promise<CacheOperationReport> {
    await this.ensureInitialized();

    const startTime = Date.now();
    let report: CacheOperationReport = {
      result: CacheOperationResult.FAILURE,
      message: 'Unknown error',
      entitiesAffected: 0,
      dataPointsProcessed: 0,
      durationMs: 0,
      errors: [],
    };

    try {
      if (!Array.isArray(newData) || newData.length === 0) {
        report.result = CacheOperationResult.SUCCESS;
        report.message = 'No new data to cache';
        report.durationMs = Date.now() - startTime;
        return report;
      }

      // Validate new data points
      const validData = newData.filter(validateCachedDataPoint);
      if (validData.length !== newData.length) {
        report.errors?.push(`Filtered out ${newData.length - validData.length} invalid data points`);
      }

      // Load existing cached data
      const existingData = await this.loadEntityData(entityId) || [];
      
      // Merge with existing data, removing duplicates
      const mergedData = mergeCachedAndFreshData(existingData, validData);
      
      // Remove expired data points
      const cleanedData = removeExpiredDataPoints(mergedData);
      
      // Limit data points to prevent excessive storage
      const finalData = this.limitDataPoints(cleanedData);
      
      // Create updated metadata
      const metadata = createMetadataFromData(entityId, gatewayId, finalData, entityInfo);
      
      // Save to file and update index
      await this.saveEntityData(entityId, finalData, metadata);
      this.cacheIndex[entityId] = metadata;
      await this.saveCacheIndex();

      report = {
        result: CacheOperationResult.SUCCESS,
        message: `Successfully cached ${validData.length} new data points for ${entityId}`,
        entitiesAffected: 1,
        dataPointsProcessed: validData.length,
        durationMs: Date.now() - startTime,
        errors: report.errors?.length ? report.errors : undefined,
      };

      console.log(`[SensorCache] ${report.message} (${report.durationMs}ms)`);
      return report;
    } catch (error) {
      report.result = CacheOperationResult.FAILURE;
      report.message = `Failed to cache data for ${entityId}: ${error}`;
      report.durationMs = Date.now() - startTime;
      report.errors = [String(error)];
      
      console.error(`[SensorCache] ${report.message}`);
      return report;
    }
  }

  /**
   * Merge cached data with fresh Home Assistant API data
   * Converts HA format to cached format and merges intelligently
   */
  public async mergeCachedAndFreshData(
    entityId: string,
    cachedData: CachedSensorDataPoint[],
    freshHAData: HAHistoryDataPoint[]
  ): Promise<CachedSensorDataPoint[]> {
    try {
      // Convert HA data to cached format
      const freshCachedData = convertHADataToCachedFormat(freshHAData);
      
      // Merge with cached data
      return mergeCachedAndFreshData(cachedData, freshCachedData);
    } catch (error) {
      console.error(`[SensorCache] Error merging data for ${entityId}:`, error);
      return cachedData; // Return cached data on error
    }
  }

  /**
   * Purge old data for a specific entity
   * Removes data older than the configured expiration period
   */
  public async purgeOldData(entityId: string): Promise<CacheOperationReport> {
    await this.ensureInitialized();

    const startTime = Date.now();
    let report: CacheOperationReport = {
      result: CacheOperationResult.FAILURE,
      message: 'Unknown error',
      entitiesAffected: 0,
      dataPointsProcessed: 0,
      durationMs: 0,
    };

    try {
      const metadata = this.cacheIndex[entityId];
      if (!metadata) {
        report.result = CacheOperationResult.NOT_FOUND;
        report.message = `No cache entry found for entity: ${entityId}`;
        report.durationMs = Date.now() - startTime;
        return report;
      }

      // Load current data
      const currentData = await this.loadEntityData(entityId) || [];
      const originalCount = currentData.length;
      
      // Remove expired data
      const cleanedData = removeExpiredDataPoints(currentData);
      const removedCount = originalCount - cleanedData.length;

      if (removedCount > 0) {
        // Update metadata and save
        const updatedMetadata = createMetadataFromData(
          entityId, 
          metadata.gateway_id, 
          cleanedData,
          {
            unit_of_measurement: metadata.unit_of_measurement,
            device_class: metadata.device_class,
            friendly_name: metadata.friendly_name,
          }
        );
        
        await this.saveEntityData(entityId, cleanedData, updatedMetadata);
        this.cacheIndex[entityId] = updatedMetadata;
        await this.saveCacheIndex();

        report = {
          result: CacheOperationResult.SUCCESS,
          message: `Purged ${removedCount} expired data points from ${entityId}`,
          entitiesAffected: 1,
          dataPointsProcessed: removedCount,
          durationMs: Date.now() - startTime,
        };
      } else {
        report = {
          result: CacheOperationResult.SUCCESS,
          message: `No expired data found for ${entityId}`,
          entitiesAffected: 1,
          dataPointsProcessed: 0,
          durationMs: Date.now() - startTime,
        };
      }

      console.log(`[SensorCache] ${report.message} (${report.durationMs}ms)`);
      return report;
    } catch (error) {
      report.result = CacheOperationResult.FAILURE;
      report.message = `Failed to purge old data for ${entityId}: ${error}`;
      report.durationMs = Date.now() - startTime;
      
      console.error(`[SensorCache] ${report.message}`);
      return report;
    }
  }

  /**
   * Delete all cached data for a specific gateway
   * Used when gateway is deleted from the system
   */
  public async deleteGatewayCache(gatewayId: number): Promise<CacheCleanupResult> {
    await this.ensureInitialized();

    const result: CacheCleanupResult = {
      entitiesCleaned: 0,
      dataPointsRemoved: 0,
      bytesFreed: 0,
      errors: [],
    };

    try {
      const entitiesToDelete = Object.entries(this.cacheIndex)
        .filter(([_, metadata]) => metadata.gateway_id === gatewayId)
        .map(([entityId]) => entityId);

      console.log(`[SensorCache] Deleting cache for ${entitiesToDelete.length} entities from gateway ${gatewayId}`);

      for (const entityId of entitiesToDelete) {
        try {
          const metadata = this.cacheIndex[entityId];
          
          // Delete entity file
          const filename = generateCacheFilename(gatewayId, entityId);
          const filePath = `${this.cacheDirectory}${filename}`;
          await FileSystem.deleteAsync(filePath, { idempotent: true });
          
          // Update totals
          result.dataPointsRemoved += metadata.data_points_count;
          result.bytesFreed += metadata.file_size_bytes;
          result.entitiesCleaned++;
          
          // Remove from index
          delete this.cacheIndex[entityId];
        } catch (error) {
          result.errors.push({
            entity_id: entityId,
            error: String(error),
          });
        }
      }

      // Save updated index
      await this.saveCacheIndex();

      console.log(
        `[SensorCache] Gateway ${gatewayId} cache cleanup complete: ` +
        `${result.entitiesCleaned} entities, ${result.dataPointsRemoved} data points, ` +
        `${formatBytes(result.bytesFreed)} freed`
      );

      return result;
    } catch (error) {
      console.error(`[SensorCache] Error during gateway cache cleanup for gateway ${gatewayId}:`, error);
      result.errors.push({
        entity_id: `gateway_${gatewayId}`,
        error: String(error),
      });
      return result;
    }
  }

  /**
   * Get cache statistics and health information
   */
  public async getCacheStats(): Promise<CacheStats> {
    await this.ensureInitialized();

    try {
      const entities = Object.values(this.cacheIndex);
      let totalDataPoints = 0;
      let totalFileSize = 0;
      let oldestTimestamp: string | undefined;
      let newestTimestamp: string | undefined;
      let expiredEntities = 0;

      for (const metadata of entities) {
        totalDataPoints += metadata.data_points_count;
        totalFileSize += metadata.file_size_bytes;

        // Track oldest and newest timestamps
        if (!oldestTimestamp || metadata.first_cached_timestamp < oldestTimestamp) {
          oldestTimestamp = metadata.first_cached_timestamp;
        }
        if (!newestTimestamp || metadata.last_cached_timestamp > newestTimestamp) {
          newestTimestamp = metadata.last_cached_timestamp;
        }

        // Check for expired entities
        if (metadata.first_cached_timestamp && 
            new Date(metadata.first_cached_timestamp) < 
            new Date(Date.now() - CACHE_CONSTANTS.EXPIRATION.MAX_AGE_MONTHS * 30 * 24 * 60 * 60 * 1000)) {
          expiredEntities++;
        }
      }

      // Determine health status
      let healthStatus = CacheHealthStatus.HEALTHY;
      if (totalFileSize > CACHE_CONSTANTS.LIMITS.MAX_TOTAL_CACHE_SIZE * 0.8) {
        healthStatus = CacheHealthStatus.WARNING;
      }
      if (totalFileSize > CACHE_CONSTANTS.LIMITS.MAX_TOTAL_CACHE_SIZE) {
        healthStatus = CacheHealthStatus.CRITICAL;
      }

      return {
        totalEntities: entities.length,
        totalDataPoints,
        totalFileSizeBytes: totalFileSize,
        oldestData: oldestTimestamp,
        newestData: newestTimestamp,
        healthStatus,
        lastValidation: getCurrentTimestamp(),
        expiredEntities,
      };
    } catch (error) {
      console.error('[SensorCache] Error getting cache stats:', error);
      return {
        totalEntities: 0,
        totalDataPoints: 0,
        totalFileSizeBytes: 0,
        healthStatus: CacheHealthStatus.UNKNOWN,
        expiredEntities: 0,
      };
    }
  }

  // =====================
  // PRIVATE METHODS
  // =====================

  /**
   * Ensure cache is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Ensure cache directory exists
   */
  private async ensureCacheDirectoryExists(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(this.cacheDirectory);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.cacheDirectory, { intermediates: true });
      console.log(`[SensorCache] Created cache directory: ${this.cacheDirectory}`);
    }
  }

  /**
   * Load cache index from AsyncStorage
   */
  private async loadCacheIndex(): Promise<void> {
    try {
      const indexJson = await AsyncStorage.getItem(CACHE_CONSTANTS.CACHE_INDEX_KEY);
      if (indexJson) {
        const parsedIndex = JSON.parse(indexJson);
        
        // Validate loaded index
        this.cacheIndex = {};
        for (const [entityId, metadata] of Object.entries(parsedIndex)) {
          if (validateCachedMetadata(metadata)) {
            this.cacheIndex[entityId] = metadata as CachedSensorMetadata;
          } else {
            console.warn(`[SensorCache] Invalid metadata for entity ${entityId}, skipping`);
          }
        }
        
        console.log(`[SensorCache] Loaded cache index with ${Object.keys(this.cacheIndex).length} entities`);
      } else {
        console.log('[SensorCache] No existing cache index found, starting fresh');
      }
    } catch (error) {
      console.error('[SensorCache] Error loading cache index:', error);
      this.cacheIndex = {}; // Start with empty index on error
    }
  }

  /**
   * Save cache index to AsyncStorage
   */
  private async saveCacheIndex(): Promise<void> {
    try {
      const indexJson = JSON.stringify(this.cacheIndex);
      await AsyncStorage.setItem(CACHE_CONSTANTS.CACHE_INDEX_KEY, indexJson);
    } catch (error) {
      console.error('[SensorCache] Error saving cache index:', error);
      throw error;
    }
  }

  /**
   * Load entity data from file
   */
  private async loadEntityData(entityId: string): Promise<CachedSensorDataPoint[] | null> {
    try {
      const metadata = this.cacheIndex[entityId];
      if (!metadata) {
        return null;
      }

      const filename = generateCacheFilename(metadata.gateway_id, entityId);
      const filePath = `${this.cacheDirectory}${filename}`;
      
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (!fileInfo.exists) {
        console.warn(`[SensorCache] Cache file missing for ${entityId}: ${filePath}`);
        return null;
      }

      const fileContent = await FileSystem.readAsStringAsync(filePath);
      const entityFile: CachedEntityFile = JSON.parse(fileContent);
      
      // Validate data points
      const validData = entityFile.data.filter(validateCachedDataPoint);
      if (validData.length !== entityFile.data.length) {
        console.warn(`[SensorCache] Found ${entityFile.data.length - validData.length} invalid data points in ${entityId}`);
      }

      return validData;
    } catch (error) {
      console.error(`[SensorCache] Error loading entity data for ${entityId}:`, error);
      return null;
    }
  }

  /**
   * Save entity data to file
   */
  private async saveEntityData(
    entityId: string, 
    data: CachedSensorDataPoint[],
    metadata: CachedSensorMetadata
  ): Promise<void> {
    try {
      const filename = generateCacheFilename(metadata.gateway_id, entityId);
      const filePath = `${this.cacheDirectory}${filename}`;
      
      const entityFile: CachedEntityFile = {
        metadata: deepClone(metadata),
        data: deepClone(data),
        version: CACHE_CONSTANTS.VALIDATION.CACHE_FORMAT_VERSION,
        lastModified: getCurrentTimestamp(),
      };

      const fileContent = JSON.stringify(entityFile);
      await FileSystem.writeAsStringAsync(filePath, fileContent);
    } catch (error) {
      console.error(`[SensorCache] Error saving entity data for ${entityId}:`, error);
      throw error;
    }
  }

  /**
   * Limit data points to prevent excessive storage
   * Keeps most recent data within limits
   */
  private limitDataPoints(data: CachedSensorDataPoint[]): CachedSensorDataPoint[] {
    if (data.length <= CACHE_CONSTANTS.LIMITS.MAX_DATA_POINTS_PER_ENTITY) {
      return data;
    }

    // Sort by timestamp and keep most recent data
    const sorted = [...data].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    
    const limited = sorted.slice(0, CACHE_CONSTANTS.LIMITS.MAX_DATA_POINTS_PER_ENTITY);
    
    console.warn(
      `[SensorCache] Limited data points from ${data.length} to ${limited.length} ` +
      `(max: ${CACHE_CONSTANTS.LIMITS.MAX_DATA_POINTS_PER_ENTITY})`
    );
    
    return limited.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }
}

// Export singleton instance
export const sensorHistoryCache = SensorHistoryCache.getInstance();
