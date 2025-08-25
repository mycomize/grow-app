import { router } from 'expo-router';
import { isUnauthorizedError } from '../../../api/ApiClient';
import { HAEntity, IoTEntity, IoTEntityCreate } from '../../../iot/iot';

// Helper function to handle unauthorized errors consistently
export const handleUnauthorizedError = (error: Error) => {
  if (isUnauthorizedError(error)) {
    router.replace('/login');
    throw error;
  }
};

// Extract domain from entity ID
export const extractDomain = (entityId: string): string => entityId.split('.')[0] || '';

// Extract device class from entity attributes
export const extractDeviceClass = (attributes: Record<string, any>): string =>
  attributes?.device_class || '';

// Create IoT entity from HA entity
export const createIoTEntityFromHAEntity = (
  haEntity: HAEntity,
  gatewayId: number
): IoTEntityCreate => ({
  gateway_id: gatewayId,
  entity_name: haEntity.entity_id,
  entity_type: 'home_assistant',
  friendly_name: haEntity.attributes?.friendly_name || haEntity.entity_id,
  domain: extractDomain(haEntity.entity_id),
  device_class: extractDeviceClass(haEntity.attributes),
});

// Create pseudo IoT entity for optimistic updates
export const createPseudoIoTEntity = (
  haEntity: HAEntity,
  gatewayId: number,
  growId?: number,
  stage?: string
): IoTEntity => ({
  id: -1, // Temporary ID for new entities
  gateway_id: gatewayId,
  entity_name: haEntity.entity_id,
  entity_type: 'home_assistant',
  friendly_name: haEntity.attributes?.friendly_name || haEntity.entity_id,
  domain: extractDomain(haEntity.entity_id),
  device_class: extractDeviceClass(haEntity.attributes),
  linked_grow_id: growId,
  linked_stage: stage,
});

// Performance timing utility for debugging
export const createPerformanceTimer = (operation: string) => {
  const start = performance.now();
  return {
    log: (message: string) => {
      const elapsed = performance.now() - start;
      console.log(`[EntityStore] ${operation}: ${message} (${elapsed.toFixed(2)}ms)`);
    },
    end: (message: string) => {
      const elapsed = performance.now() - start;
      console.log(`[EntityStore] ${operation}: ${message} completed in ${elapsed.toFixed(2)}ms`);
    },
  };
};

// Debug flag for optional logging (set to false for production performance)
export const DEBUG_ENTITY_FILTERING = false;
