import type { StateCreator } from 'zustand';
import type { SyncComputationState, EntityStore, EntitySyncResult } from '../types';
import { HAEntity, IoTEntity, IoTGateway } from '../../../../iot';
import { NEW_GATEWAY_ID } from '../../../../iotTypes';
import {
  handleUnauthorizedError,
  extractDomain,
  extractDeviceClass,
  createIoTEntityFromHAEntity,
  createPerformanceTimer,
} from '../utils';
import { apiClient } from '../../../../ApiClient';

export interface SyncComputationActions {
  // Actions - Entity sync computation
  computeEntityLists: (
    haEntities: HAEntity[],
    iotEntities: IoTEntity[],
    isNewGateway?: boolean
  ) => EntitySyncResult;
  computeAndSetEntityLists: (isNewGateway?: boolean) => void;
  performDbSync: (
    token: string,
    gatewayId: string,
    currentDbEntities: IoTEntity[],
    newEntities: HAEntity[],
    orphanedEntities: IoTEntity[]
  ) => Promise<boolean>;

  // Actions - IoT Entity management
  syncIotEntities: (token: string, gateway: IoTGateway) => Promise<boolean>;
  shouldSkipEntitySync: (gateway: IoTGateway) => boolean;
}

export type SyncComputationSlice = SyncComputationState & SyncComputationActions;

export const createSyncComputationSlice: StateCreator<EntityStore, [], [], SyncComputationSlice> = (
  set,
  get
) => ({
  // Initial state
  linkableEntities: [],
  linkedEntities: [],

  // Explicit method to compute and set entity lists
  computeAndSetEntityLists: (isNewGateway: boolean = false) => {
    const timer = createPerformanceTimer('computeAndSetEntityLists');
    console.log(`[EntityStore] computeAndSetEntityLists called, isNewGateway: ${isNewGateway}`);

    const { haEntities, iotEntities } = get();

    if (haEntities.length === 0) {
      // No HA entities, clear computed lists
      console.log(`[EntityStore] No HA entities, clearing computed lists`);
      set({ linkableEntities: [], linkedEntities: [] });
      return;
    }

    const syncResult = get().computeEntityLists(haEntities, iotEntities, isNewGateway);
    set({
      linkableEntities: syncResult.linkableEntities,
      linkedEntities: syncResult.linkedEntities,
    });

    timer.end('computeAndSetEntityLists');
  },

  // Compute entity sync lists - core synchronization logic
  computeEntityLists: (
    haEntities: HAEntity[],
    iotEntities: IoTEntity[],
    isNewGateway: boolean = false
  ) => {
    console.log(
      `[EntityStore] computeEntityLists called with ${haEntities.length} HA entities, ${iotEntities.length} IoT entities, isNewGateway: ${isNewGateway}`
    );

    if (isNewGateway || iotEntities.length === 0) {
      // For new gateways, check if any IoT entities exist (including pseudo entities from optimistic updates)
      if (iotEntities.length > 0) {
        // Some IoT entities exist (likely pseudo entities from optimistic updates)
        // Separate them into linked and linkable based on their grow assignment
        const existingLinkedEntities = iotEntities.filter((entity) => entity.linked_grow_id);
        const existingEntityIds = new Set(iotEntities.map((entity) => entity.entity_name));

        // Create pseudo entities for HA entities that don't have IoT counterparts yet
        const newLinkableEntities = haEntities
          .filter((haEntity) => !existingEntityIds.has(haEntity.entity_id))
          .map((haEntity) => ({
            id: -1, // Temporary ID for new entities
            gateway_id: -1, // Will be set when gateway is saved
            entity_name: haEntity.entity_id,
            entity_type: 'home_assistant',
            friendly_name: haEntity.attributes?.friendly_name || haEntity.entity_id,
            domain: extractDomain(haEntity.entity_id),
            device_class: extractDeviceClass(haEntity.attributes),
            linked_grow_id: undefined,
            linked_stage: undefined,
          }));

        // Add unlinked existing entities to linkable list
        const existingLinkableEntities = iotEntities.filter((entity) => !entity.linked_grow_id);
        const allLinkableEntities = [...newLinkableEntities, ...existingLinkableEntities];

        console.log(
          `[EntityStore] New gateway with optimistic updates: ${allLinkableEntities.length} linkable entities, ${existingLinkedEntities.length} linked entities`
        );

        return {
          newEntities: haEntities.filter((haEntity) => !existingEntityIds.has(haEntity.entity_id)),
          orphanedEntities: [],
          linkableEntities: allLinkableEntities,
          linkedEntities: existingLinkedEntities,
        };
      } else {
        // No IoT entities exist, all HA entities are linkable
        const newLinkableEntities = haEntities.map((haEntity) => ({
          id: -1, // Temporary ID for new entities
          gateway_id: -1, // Will be set when gateway is saved
          entity_name: haEntity.entity_id,
          entity_type: 'home_assistant',
          friendly_name: haEntity.attributes?.friendly_name || haEntity.entity_id,
          domain: extractDomain(haEntity.entity_id),
          device_class: extractDeviceClass(haEntity.attributes),
          linked_grow_id: undefined,
          linked_stage: undefined,
        }));

        console.log(
          `[EntityStore] New/empty gateway: ${newLinkableEntities.length} linkable entities, 0 linked entities`
        );

        return {
          newEntities: haEntities,
          orphanedEntities: [],
          linkableEntities: newLinkableEntities,
          linkedEntities: [],
        };
      }
    }

    // Create lookup maps for efficient comparison
    const haEntityMap = new Map(haEntities.map((entity) => [entity.entity_id, entity]));
    const iotEntityMap = new Map(iotEntities.map((entity) => [entity.entity_name, entity]));

    // Find new entities (in HA but not in IoT DB)
    const newEntities = haEntities.filter((haEntity) => !iotEntityMap.has(haEntity.entity_id));
    console.log(`[EntityStore] Found ${newEntities.length} new entities (in HA but not in DB)`);

    // Find orphaned entities (in IoT DB but not in HA)
    const orphanedEntities = iotEntities.filter(
      (iotEntity) => !haEntityMap.has(iotEntity.entity_name)
    );

    console.log(
      `[EntityStore] Found ${orphanedEntities.length} orphaned entities (in DB but not in HA)`
    );

    // Existing entities (in both HA and IoT DB)
    const existingEntities = iotEntities.filter((iotEntity) =>
      haEntityMap.has(iotEntity.entity_name)
    );

    console.log(
      `[EntityStore] Found ${existingEntities.length} existing entities (in both HA and DB)`
    );

    // Compute linkable entities: new entities (as pseudo-entities) + existing entities with no grow assignment
    const newEntityPseudos = newEntities.map((haEntity) => ({
      id: -1, // Temporary ID for new entities
      gateway_id: iotEntities[0]?.gateway_id || -1,
      entity_name: haEntity.entity_id,
      entity_type: 'home_assistant',
      friendly_name: haEntity.attributes?.friendly_name || haEntity.entity_id,
      domain: extractDomain(haEntity.entity_id),
      device_class: extractDeviceClass(haEntity.attributes),
      linked_grow_id: undefined,
      linked_stage: undefined,
    }));

    const existingLinkableEntities = existingEntities.filter((entity) => !entity.linked_grow_id);
    console.log(
      `[EntityStore] Found ${existingLinkableEntities.length} existing linkable entities (no grow assignment)`
    );

    const computedLinkableEntities = [...newEntityPseudos, ...existingLinkableEntities];
    console.log(
      `[EntityStore] Total linkable entities: ${newEntityPseudos.length} new + ${existingLinkableEntities.length} existing = ${computedLinkableEntities.length}`
    );

    // Compute linked entities: existing entities with grow assignment
    const computedLinkedEntities = existingEntities.filter((entity) => entity.linked_grow_id);
    console.log(
      `[EntityStore] Found ${computedLinkedEntities.length} linked entities (with grow assignment)`
    );

    return {
      newEntities,
      orphanedEntities,
      linkableEntities: computedLinkableEntities,
      linkedEntities: computedLinkedEntities,
    };
  },

  // Perform database sync operations
  performDbSync: async (
    token: string,
    gatewayId: string,
    currentDbEntities: IoTEntity[],
    newEntities: HAEntity[],
    orphanedEntities: IoTEntity[]
  ) => {
    try {
      let updatedDbEntities = [...currentDbEntities];

      // Bulk create new entities in DB
      if (newEntities.length > 0) {
        try {
          const entitiesToCreate = newEntities.map((haEntity) =>
            createIoTEntityFromHAEntity(haEntity, parseInt(gatewayId))
          );
          console.log(`[EntityStore] Bulk creating ${entitiesToCreate.length} new entities in DB`);

          const createdEntities = await apiClient.bulkCreateIoTEntities(
            gatewayId,
            entitiesToCreate,
            token
          );

          // Add created entities to local state
          if (createdEntities && Array.isArray(createdEntities)) {
            updatedDbEntities = [...updatedDbEntities, ...createdEntities];
          }
        } catch (error) {
          console.error('Failed to bulk create entities:', error);
          handleUnauthorizedError(error as Error);
          return false;
        }
      }

      // Bulk delete orphaned entities from DB
      if (orphanedEntities.length > 0) {
        try {
          const entityIdsToDelete = orphanedEntities.map((entity) => entity.id);
          await apiClient.bulkDeleteIoTEntities(gatewayId, entityIdsToDelete, token);

          // Remove deleted entities from local state
          updatedDbEntities = updatedDbEntities.filter(
            (entity) => !entityIdsToDelete.includes(entity.id)
          );
        } catch (error) {
          console.error('Failed to bulk delete orphaned entities:', error);
          handleUnauthorizedError(error as Error);
          return false;
        }
      }

      // Update local state directly instead of refetching
      if (newEntities.length > 0 || orphanedEntities.length > 0) {
        set({ iotEntities: updatedDbEntities });
        console.log(
          `[EntityStore] Updated local IoT entities: ${updatedDbEntities.length} entities`
        );
      }

      return true;
    } catch (error) {
      console.error('Failed to sync DB entities:', error);
      handleUnauthorizedError(error as Error);
      return false;
    }
  },

  // Determine if entity sync should be skipped (optimization for existing gateways)
  shouldSkipEntitySync: (gateway: IoTGateway) => {
    const { haEntities, iotEntities, lastCredentials, fetchedGateways } = get();

    console.log(`[EntityStore] shouldSkipEntitySync check for gateway ${gateway.id}`);

    // Always sync for new gateways (not saved yet)
    if (gateway.id === NEW_GATEWAY_ID) {
      console.log(`[EntityStore] New gateway detected - sync required`);
      return false;
    }

    // If no HA entities fetched, we can't determine sync status
    if (haEntities.length === 0) {
      console.log(`[EntityStore] No HA entities loaded - sync required`);
      return false;
    }

    // Check if credentials have changed (would require entity refetch)
    const storedCredentials = lastCredentials.get(gateway.id);
    if (!storedCredentials) {
      console.log(`[EntityStore] No cached credentials - sync required`);
      return false;
    }

    const credentialsChanged =
      storedCredentials.apiUrl !== gateway.api_url || storedCredentials.apiKey !== gateway.api_key;

    if (credentialsChanged) {
      console.log(`[EntityStore] Credentials changed - sync required`);
      return false;
    }

    // Check if we have IoT entities cached for this gateway
    if (!fetchedGateways.has(gateway.id)) {
      console.log(`[EntityStore] IoT entities not cached - sync required`);
      return false;
    }

    // If we have HA entities, cached credentials are unchanged, and IoT entities are cached,
    // the WebSocket should be maintaining sync, so we can skip expensive sync
    console.log(`[EntityStore] All conditions met - sync can be skipped for optimization`);
    return true;
  },

  // Sync IoT entities after gateway save - comprehensive sync logic
  syncIotEntities: async (token: string, gateway: IoTGateway) => {
    console.log(`[EntityStore] syncIotEntities called for gateway ${gateway.id}`);

    // Check if sync can be skipped using smart detection (optimization for existing gateways)
    if (get().shouldSkipEntitySync(gateway)) {
      console.log(
        `[EntityStore] Smart sync detection: skipping unnecessary entity sync for gateway ${gateway.id}`
      );

      // Update computed entity lists with current state (no API calls needed)
      const { haEntities, iotEntities } = get();
      const syncResult = get().computeEntityLists(haEntities, iotEntities, false);

      set({
        linkableEntities: syncResult.linkableEntities,
        linkedEntities: syncResult.linkedEntities,
      });

      console.log(`[EntityStore] Optimized sync completed - WebSocket maintains current state`);
      return true;
    }

    try {
      const { haEntities } = get();

      // First, fetch the current DB entities to compare with HA entities
      const currentDbEntities = await apiClient.getIoTEntities(gateway.id.toString(), token);

      console.log(
        `[EntityStore] Syncing entities after gateway save: ${haEntities.length} HA entities, ${currentDbEntities.length} current DB entities`
      );

      // Compute what needs to be synced
      const syncResult = get().computeEntityLists(
        haEntities,
        currentDbEntities,
        currentDbEntities.length === 0
      );
      const { newEntities, orphanedEntities, linkableEntities, linkedEntities } = syncResult;

      // Perform the actual sync using the proper sync logic
      if (newEntities.length > 0 || orphanedEntities.length > 0) {
        console.log(
          `[EntityStore] Syncing: ${newEntities.length} new entities to create, ${orphanedEntities.length} orphaned entities to delete`
        );

        const syncSuccess = await get().performDbSync(
          token,
          gateway.id.toString(),
          currentDbEntities,
          newEntities,
          orphanedEntities
        );

        if (!syncSuccess) {
          return false;
        }
      } else {
        console.log('[EntityStore] No sync needed - entities are already in sync');
        // Still update local state with current entities
        set({ iotEntities: currentDbEntities });
      }

      // Update computed entity lists
      set({
        linkableEntities,
        linkedEntities,
      });

      // Refetch DB entities to get the final state and ensure UI is updated
      await get().fetchIotEntities(token, gateway.id.toString());

      // Update gateway with entity counts (encrypted)
      try {
        const linkedCount = linkedEntities.length;
        const linkableCount = linkableEntities.length;

        console.log(
          `[EntityStore] Updating gateway with entity counts: ${linkedCount} linked, ${linkableCount} linkable`
        );

        // Use the gateway store to update the gateway
        // This would ideally be coordinated between stores, but for now we'll use the API directly
        await apiClient.updateIoTGateway(
          gateway.id.toString(),
          {
            linked_entities_count: linkedCount.toString(),
            linkable_entities_count: linkableCount.toString(),
          },
          token
        );
      } catch (error) {
        console.error('Failed to update gateway entity counts:', error);
      }

      return true;
    } catch (error) {
      console.error('Failed to sync entities after gateway save:', error);
      handleUnauthorizedError(error as Error);
      return false;
    }
  },
});
