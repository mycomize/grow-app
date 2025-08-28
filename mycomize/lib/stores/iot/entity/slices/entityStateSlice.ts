import type { StateCreator } from 'zustand';
import type { EntityStateState, EntityStore, HAEntityState } from '../types';
import { IoTEntity, IoTGateway } from '../../../../iot/iot';
import { handleUnauthorizedError, createPerformanceTimer } from '../utils';
import { DEFAULT_IOT_DOMAINS } from '../../../../types/iotTypes';

export interface EntityStateActions {
  // Actions - Entity state management
  fetchEntityStates: (gateway: IoTGateway, linkedEntities: IoTEntity[]) => Promise<void>;
}

export type EntityStateSlice = EntityStateState & EntityStateActions;

export const createEntityStateSlice: StateCreator<EntityStore, [], [], EntityStateSlice> = (
  set,
  get
) => ({
  // Initial state
  entityStates: {},
  entityStatesLoading: false,

  // Fetch entity states from Home Assistant API for linked entities
  fetchEntityStates: async (gateway: IoTGateway, linkedEntities: IoTEntity[]) => {
    const timer = createPerformanceTimer('fetchEntityStates');

    console.log(
      `[EntityStore] fetchEntityStates called for gateway ${gateway.id} with ${linkedEntities.length} linked entities`
    );

    // Skip if no linked entities
    if (linkedEntities.length === 0) {
      console.log(`[EntityStore] No linked entities for gateway ${gateway.id}, skipping state fetch`);
      return;
    }

    // Filter entities by allowed domains
    const filteredEntities = linkedEntities.filter((entity) => {
      const domain = entity.entity_name.split('.')[0];
      const isAllowedDomain = DEFAULT_IOT_DOMAINS.includes(domain);

      if (!isAllowedDomain) {
        console.log(`[EntityStore] Skipping entity ${entity.entity_name} - domain ${domain} not in allowed domains`);
      }

      return isAllowedDomain;
    });

    console.log(
      `[EntityStore] Filtered to ${filteredEntities.length} entities in allowed domains: ${DEFAULT_IOT_DOMAINS.join(', ')}`
    );

    if (filteredEntities.length === 0) {
      console.log(`[EntityStore] No entities in allowed domains for gateway ${gateway.id}, skipping state fetch`);
      return;
    }

    try {
      set({ entityStatesLoading: true });

      timer.log('Starting entity states network request');
      const response = await fetch(`${gateway.api_url}/api/states`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${gateway.api_key}`,
          'Content-Type': 'application/json',
        },
      });
      timer.log('Entity states network request completed');

      if (!response.ok) {
        throw new Error(`Failed to fetch entity states: ${response.status} ${response.statusText}`);
      }

      timer.log('Starting entity states JSON parsing');
      const allStates: HAEntityState[] = await response.json();
      timer.log('Entity states JSON parsing completed');
      
      console.log(`[EntityStore] Received ${allStates.length} total entity states from Home Assistant`);

      // Create a set of linked entity names for efficient lookup
      const linkedEntityNames = new Set(filteredEntities.map(entity => entity.entity_name));

      // Filter states to only include linked entities
      const relevantStates = allStates.filter(state => linkedEntityNames.has(state.entity_id));
      
      console.log(`[EntityStore] Filtered to ${relevantStates.length} states for linked entities`);

      // Update entity states in store
      set((state) => {
        const newEntityStates = { ...state.entityStates };
        
        // Add/update states for the relevant entities
        relevantStates.forEach(entityState => {
          newEntityStates[entityState.entity_id] = entityState;
        });

        return { 
          entityStates: newEntityStates,
          entityStatesLoading: false 
        };
      });

      timer.end('Complete entity states fetch');
      console.log(`[EntityStore] Successfully updated states for ${relevantStates.length} entities from gateway ${gateway.id}`);

    } catch (error) {
      console.error(`[EntityStore] Error fetching entity states for gateway ${gateway.id}:`, error);
      set({ entityStatesLoading: false });
      
      timer.end('Entity states fetch failed');
      throw error;
    }
  },
});
