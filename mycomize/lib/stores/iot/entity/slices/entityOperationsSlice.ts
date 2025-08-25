import type { StateCreator } from 'zustand';
import type { EntityOperationsState, EntityStore } from '../types';
import { HAEntity, IoTEntity, IoTGateway } from '../../../../iot/iot';
import { EntityOperation } from '../../../../types/iotTypes';
import { handleUnauthorizedError, createPseudoIoTEntity, createPerformanceTimer } from '../utils';
import { apiClient } from '../../../../api/ApiClient';
import { haWebSocketManager } from '../../../../iot/haWebSocketManager';

export interface EntityOperationsActions {
  // Actions - Optimistic updates for immediate UI response
  optimisticUpdateEntityLink: (
    entityId: string,
    gatewayId: number,
    growId?: number,
    stage?: string
  ) => void;

  // Actions - Pending links for new gateways
  updatePendingLinks: (entityId: string, growId?: number, stage?: string) => void;
  commitPendingLinks: (token: string, gatewayId: number) => Promise<boolean>;
  clearPendingLinks: () => void;

  // Actions - Entity operations (linking/unlinking)
  linkEntity: (
    token: string,
    gatewayId: string,
    entityId: string,
    growId: number,
    stage: string
  ) => Promise<boolean>;
  unlinkEntity: (token: string, gatewayId: string, entityId: string) => Promise<boolean>;
  bulkLinkEntities: (
    token: string,
    gatewayId: string,
    entityIds: string[],
    growId: number,
    stage: string
  ) => Promise<boolean>;
  bulkUnlinkEntities: (token: string, gatewayId: string, entityIds: string[]) => Promise<boolean>;

  // Actions - Utility
  handleGatewayDeletion: (gatewayId: number) => void;
  reset: () => void;
}

export type EntityOperationsSlice = EntityOperationsState & EntityOperationsActions;

export const createEntityOperationsSlice: StateCreator<
  EntityStore,
  [],
  [],
  EntityOperationsSlice
> = (set, get) => ({
  // Initial state
  operationLoading: false,
  pendingOperations: new Map<string, EntityOperation>(),
  pendingLinks: new Map<string, { growId?: number; stage?: string }>(),

  // Optimistic update for immediate UI response
  optimisticUpdateEntityLink: (
    entityId: string,
    gatewayId: number,
    growId?: number,
    stage?: string
  ) => {
    console.log(
      `[EntityStore] Optimistic update for entity ${entityId}: growId=${growId}, stage=${stage}`
    );

    set((state) => {
      let updatedIotEntities = [...state.iotEntities];

      // Find existing entity to update
      const existingEntityIndex = updatedIotEntities.findIndex(
        (entity) => entity.entity_name === entityId && entity.gateway_id === gatewayId
      );

      if (existingEntityIndex >= 0) {
        // Update existing entity
        updatedIotEntities[existingEntityIndex] = {
          ...updatedIotEntities[existingEntityIndex],
          linked_grow_id: growId,
          linked_stage: stage,
        };
      } else {
        // For new gateways, create a pseudo IoT entity from the corresponding HA entity
        const { haEntities } = state;
        const haEntity = haEntities.find((ha) => ha.entity_id === entityId);

        if (haEntity) {
          const pseudoIotEntity = createPseudoIoTEntity(haEntity, gatewayId, growId, stage);
          updatedIotEntities.push(pseudoIotEntity);
          console.log(`[EntityStore] Created pseudo IoT entity for optimistic update: ${entityId}`);
        }
      }

      // Recompute entity lists after the optimistic update
      const { haEntities } = state;
      const isNewGateway = gatewayId === -1;
      const syncResult = get().computeEntityLists(haEntities, updatedIotEntities, isNewGateway);

      return {
        iotEntities: updatedIotEntities,
        linkableEntities: syncResult.linkableEntities,
        linkedEntities: syncResult.linkedEntities,
      };
    });

    console.log(
      `[EntityStore] Optimistic update completed for entity ${entityId}, recomputed entity lists`
    );
  },

  // Update pending links for new gateways (in-memory storage)
  updatePendingLinks: (entityId: string, growId?: number, stage?: string) => {
    console.log(
      `[EntityStore] Updating pending links for entity ${entityId}: growId=${growId}, stage=${stage}`
    );

    set((state) => {
      const newPendingLinks = new Map(state.pendingLinks);

      if (growId !== undefined && stage !== undefined) {
        // Set or update pending link
        newPendingLinks.set(entityId, { growId, stage });
      } else {
        // Remove pending link (unlink)
        newPendingLinks.delete(entityId);
      }

      return { pendingLinks: newPendingLinks };
    });

    console.log(`[EntityStore] Pending links updated for entity ${entityId}`);
  },

  // Commit all pending links to database after gateway save
  commitPendingLinks: async (token: string, gatewayId: number): Promise<boolean> => {
    const { pendingLinks, iotEntities } = get();

    console.log(
      `[EntityStore] commitPendingLinks called - pendingLinks size: ${pendingLinks.size}, iotEntities count: ${iotEntities.length}`
    );

    // Enhanced debugging - log all pending links and available entities
    if (pendingLinks.size > 0) {
      console.log('[EntityStore] Pending links details:');
      pendingLinks.forEach((linkData, entityId) => {
        console.log(`  - ${entityId}: growId=${linkData.growId}, stage=${linkData.stage}`);
      });
    }

    if (iotEntities.length > 0) {
      console.log(`[EntityStore] Available IoT entities for gateway ${gatewayId}:`);
      iotEntities
        .filter((entity) => entity.gateway_id === gatewayId)
        .forEach((entity) => {
          console.log(
            `  - ${entity.entity_name} (ID: ${entity.id}, gateway: ${entity.gateway_id})`
          );
        });
    }

    if (pendingLinks.size === 0) {
      console.log('[EntityStore] No pending links to commit');
      return true;
    }

    console.log(
      `[EntityStore] Committing ${pendingLinks.size} pending links for gateway ${gatewayId}`
    );

    try {
      // Group pending links by operation type
      const linksToCreate: Array<{ entityId: string; growId: number; stage: string }> = [];
      const linksToRemove: string[] = [];

      pendingLinks.forEach((linkData, entityId) => {
        if (linkData.growId && linkData.stage) {
          linksToCreate.push({
            entityId,
            growId: linkData.growId,
            stage: linkData.stage,
          });
        } else {
          linksToRemove.push(entityId);
        }
      });

      // Find corresponding database entities with enhanced debugging
      console.log(
        `[EntityStore] Looking for database entities to link: ${linksToCreate.length} entities`
      );
      const entitiesToLink = linksToCreate
        .map(({ entityId, growId, stage }) => {
          const dbEntity = iotEntities.find(
            (entity) => entity.entity_name === entityId && entity.gateway_id === gatewayId
          );
          if (!dbEntity) {
            console.log(
              `[EntityStore] WARNING: Could not find database entity for ${entityId} on gateway ${gatewayId}`
            );
            console.log(
              `[EntityStore] Available entities for this gateway:`,
              iotEntities.filter((e) => e.gateway_id === gatewayId).map((e) => e.entity_name)
            );
          } else {
            console.log(`[EntityStore] Found database entity for ${entityId}: ID ${dbEntity.id}`);
          }
          return dbEntity ? { dbEntity, growId, stage } : null;
        })
        .filter(Boolean) as Array<{ dbEntity: IoTEntity; growId: number; stage: string }>;

      console.log(
        `[EntityStore] Looking for database entities to unlink: ${linksToRemove.length} entities`
      );
      const entitiesToUnlink = linksToRemove
        .map((entityId) => {
          const dbEntity = iotEntities.find(
            (entity) => entity.entity_name === entityId && entity.gateway_id === gatewayId
          );
          if (!dbEntity) {
            console.log(
              `[EntityStore] WARNING: Could not find database entity for unlinking ${entityId} on gateway ${gatewayId}`
            );
          }
          return dbEntity;
        })
        .filter(Boolean) as IoTEntity[];

      console.log(
        `[EntityStore] Entity mapping results: ${entitiesToLink.length}/${linksToCreate.length} found for linking, ${entitiesToUnlink.length}/${linksToRemove.length} found for unlinking`
      );

      // Perform bulk operations
      if (entitiesToLink.length > 0) {
        // Group by growId and stage for bulk operations
        const linkGroups = new Map<
          string,
          { growId: number; stage: string; entityIds: number[] }
        >();

        entitiesToLink.forEach(({ dbEntity, growId, stage }) => {
          const key = `${growId}-${stage}`;
          if (!linkGroups.has(key)) {
            linkGroups.set(key, { growId, stage, entityIds: [] });
          }
          linkGroups.get(key)!.entityIds.push(dbEntity.id);
        });

        // Execute bulk link operations
        for (const { growId, stage, entityIds } of linkGroups.values()) {
          await apiClient.bulkLinkIoTEntities(
            gatewayId.toString(),
            entityIds,
            growId,
            stage,
            token
          );
        }

        console.log(`[EntityStore] Bulk linked ${entitiesToLink.length} entities`);
      }

      if (entitiesToUnlink.length > 0) {
        const entityIdsToUnlink = entitiesToUnlink.map((entity) => entity.id);
        await apiClient.bulkUnlinkIoTEntities(gatewayId.toString(), entityIdsToUnlink, token);
        console.log(`[EntityStore] Bulk unlinked ${entitiesToUnlink.length} entities`);
      }

      // Clear pending links after successful commit
      get().clearPendingLinks();

      console.log(
        `[EntityStore] Successfully committed all pending links for gateway ${gatewayId}`
      );
      return true;
    } catch (error) {
      console.error('Error committing pending links:', error);
      handleUnauthorizedError(error as Error);
      return false;
    }
  },

  // Clear all pending links (for cancel/cleanup operations)
  clearPendingLinks: () => {
    console.log('[EntityStore] Clearing all pending links');
    set({ pendingLinks: new Map() });
  },

  // Link entity to grow/stage with optimistic updates
  linkEntity: async (
    token: string,
    gatewayId: string,
    entityId: string,
    growId: number,
    stage: string
  ) => {
    const gatewayIdNum = parseInt(gatewayId, 10);
    const timer = createPerformanceTimer('linkEntity');

    console.log(
      `[EntityStore] Linking entity ${entityId} to grow ${growId}, stage ${stage} with optimistic update`
    );

    // Check if this is a new gateway (not saved yet)
    const isNewGateway = gatewayIdNum === -1;

    if (isNewGateway) {
      console.log(
        `[EntityStore] New gateway detected - storing link in pending links instead of API call`
      );

      try {
        set({ operationLoading: true });

        // Store in pending links for later commitment
        get().updatePendingLinks(entityId, growId, stage);

        // Perform optimistic update immediately for UI responsiveness
        get().optimisticUpdateEntityLink(entityId, gatewayIdNum, growId, stage);
        console.log(`[EntityStore] Pending link stored and optimistic update applied`);

        set({ operationLoading: false });
        timer.end('Link operation completed successfully (pending)');
        return true;
      } catch (error) {
        console.error('Error storing pending link:', error);
        set({ operationLoading: false });
        timer.end('Link operation failed');
        return false;
      }
    }

    // Find the database entity to get the correct ID for API calls
    const { iotEntities } = get();
    const entityToLink = iotEntities.find(
      (entity) => entity.entity_name === entityId && entity.gateway_id === gatewayIdNum
    );

    if (!entityToLink) {
      console.log(`[EntityStore] Entity ${entityId} not found for linking`);
      timer.end('Link operation failed - entity not found');
      return false;
    }

    try {
      set({ operationLoading: true });

      // Perform optimistic update immediately for UI responsiveness
      get().optimisticUpdateEntityLink(entityId, gatewayIdNum, growId, stage);
      console.log(`[EntityStore] Optimistic update applied, UI should show immediate change`);

      // Perform background API call using the database ID, not the entity name
      timer.log('Starting background API call');
      console.log(
        `[EntityStore] Calling linkIoTEntity with database ID ${entityToLink.id} for entity ${entityId}`
      );
      await apiClient.linkIoTEntity(gatewayId, entityToLink.id.toString(), growId, stage, token);
      timer.log('Background API call completed');

      set({ operationLoading: false });
      timer.end('Link operation completed successfully');
      return true;
    } catch (error) {
      console.error('Error linking entity:', error);

      // Rollback optimistic update on error
      console.log(`[EntityStore] Rolling back optimistic update for entity ${entityId}`);
      get().optimisticUpdateEntityLink(entityId, gatewayIdNum, undefined, undefined);

      set({ operationLoading: false });
      handleUnauthorizedError(error as Error);
      timer.end('Link operation failed');
      return false;
    }
  },

  // Unlink entity from grow with optimistic updates
  unlinkEntity: async (token: string, gatewayId: string, entityId: string) => {
    const gatewayIdNum = parseInt(gatewayId, 10);
    const timer = createPerformanceTimer('unlinkEntity');

    console.log(`[EntityStore] Unlinking entity ${entityId} with optimistic update`);

    // Check if this is a new gateway (not saved yet)
    const isNewGateway = gatewayIdNum === -1;

    if (isNewGateway) {
      console.log(
        `[EntityStore] New gateway detected - storing unlink in pending links instead of API call`
      );

      try {
        set({ operationLoading: true });

        // Store in pending links for later commitment (clear the link)
        get().updatePendingLinks(entityId, undefined, undefined);

        // Perform optimistic update immediately for UI responsiveness
        get().optimisticUpdateEntityLink(entityId, gatewayIdNum, undefined, undefined);
        console.log(`[EntityStore] Pending unlink stored and optimistic update applied`);

        set({ operationLoading: false });
        timer.end('Unlink operation completed successfully (pending)');
        return true;
      } catch (error) {
        console.error('Error storing pending unlink:', error);
        set({ operationLoading: false });
        timer.end('Unlink operation failed');
        return false;
      }
    }

    // Store the current state for rollback if needed
    const { iotEntities } = get();
    const entityToUnlink = iotEntities.find(
      (entity) => entity.entity_name === entityId && entity.gateway_id === gatewayIdNum
    );

    if (!entityToUnlink) {
      console.log(`[EntityStore] Entity ${entityId} not found for unlinking`);
      timer.end('Unlink operation failed - entity not found');
      return false;
    }

    const previousGrowId = entityToUnlink.linked_grow_id;
    const previousStage = entityToUnlink.linked_stage;

    try {
      set({ operationLoading: true });

      // Perform optimistic update immediately for UI responsiveness
      get().optimisticUpdateEntityLink(entityId, gatewayIdNum, undefined, undefined);
      console.log(
        `[EntityStore] Optimistic unlink update applied, UI should show immediate change`
      );

      // Perform background API call using the database ID, not the entity name
      timer.log('Starting background API call');
      console.log(
        `[EntityStore] Calling unlinkIoTEntity with database ID ${entityToUnlink.id} for entity ${entityId}`
      );
      await apiClient.unlinkIoTEntity(gatewayId, entityToUnlink.id.toString(), token);
      timer.log('Background unlink API call completed');

      set({ operationLoading: false });
      timer.end('Unlink operation completed successfully');
      return true;
    } catch (error) {
      console.error('Error unlinking entity:', error);

      // Rollback optimistic update on error
      console.log(`[EntityStore] Rolling back optimistic unlink update for entity ${entityId}`);
      get().optimisticUpdateEntityLink(entityId, gatewayIdNum, previousGrowId, previousStage);

      set({ operationLoading: false });
      handleUnauthorizedError(error as Error);
      timer.end('Unlink operation failed');
      return false;
    }
  },

  // Bulk link entities with optimistic updates
  bulkLinkEntities: async (
    token: string,
    gatewayId: string,
    entityIds: string[],
    growId: number,
    stage: string
  ) => {
    const gatewayIdNum = parseInt(gatewayId, 10);
    const timer = createPerformanceTimer('bulkLinkEntities');

    console.log(
      `[EntityStore] Bulk linking ${entityIds.length} entities to grow ${growId}, stage ${stage} with optimistic update`
    );

    // Check if this is a new gateway (not saved yet)
    const isNewGateway = gatewayIdNum === -1;

    if (isNewGateway) {
      console.log(
        `[EntityStore] New gateway detected - storing bulk links in pending links instead of API call`
      );

      try {
        set({ operationLoading: true });

        // Store all entities in pending links for later commitment
        entityIds.forEach((entityId) => {
          get().updatePendingLinks(entityId, growId, stage);
        });

        // Apply optimistic updates immediately for all entities
        entityIds.forEach((entityId) => {
          get().optimisticUpdateEntityLink(entityId, gatewayIdNum, growId, stage);
        });
        console.log(
          `[EntityStore] Pending bulk links stored and optimistic updates applied for ${entityIds.length} entities`
        );

        set({ operationLoading: false });
        timer.end(
          `Bulk link operation completed successfully for ${entityIds.length} entities (pending)`
        );
        return true;
      } catch (error) {
        console.error('Error storing pending bulk links:', error);
        set({ operationLoading: false });
        timer.end('Bulk link operation failed');
        return false;
      }
    }

    // Find database entities to get correct IDs for API calls
    const { iotEntities } = get();
    const entitiesToLink = entityIds
      .map((entityId) => {
        return iotEntities.find(
          (entity) => entity.entity_name === entityId && entity.gateway_id === gatewayIdNum
        );
      })
      .filter(Boolean) as IoTEntity[];

    if (entitiesToLink.length !== entityIds.length) {
      console.log(
        `[EntityStore] Some entities not found for bulk linking. Found ${entitiesToLink.length} of ${entityIds.length}`
      );
      timer.end('Bulk link operation failed - some entities not found');
      return false;
    }

    try {
      set({ operationLoading: true });

      // Apply optimistic updates immediately for all entities
      entityIds.forEach((entityId) => {
        get().optimisticUpdateEntityLink(entityId, gatewayIdNum, growId, stage);
      });
      console.log(
        `[EntityStore] Optimistic bulk link updates applied for ${entityIds.length} entities, UI should show immediate changes`
      );

      // Perform background API call using database IDs, not entity names
      timer.log('Starting background bulk API call');
      const databaseEntityIds = entitiesToLink.map((entity) => entity.id);
      console.log(
        `[EntityStore] Calling bulkLinkIoTEntities with database IDs: [${databaseEntityIds.join(', ')}] for entities: [${entityIds.join(', ')}]`
      );
      await apiClient.bulkLinkIoTEntities(gatewayId, databaseEntityIds, growId, stage, token);
      timer.log('Background bulk link API call completed');

      set({ operationLoading: false });
      timer.end(`Bulk link operation completed successfully for ${entityIds.length} entities`);
      return true;
    } catch (error) {
      console.error('Error bulk linking entities:', error);

      // Rollback all optimistic updates on error
      console.log(`[EntityStore] Rolling back optimistic updates for ${entityIds.length} entities`);
      entityIds.forEach((entityId) => {
        get().optimisticUpdateEntityLink(entityId, gatewayIdNum, undefined, undefined);
      });

      set({ operationLoading: false });
      handleUnauthorizedError(error as Error);
      timer.end('Bulk link operation failed');
      return false;
    }
  },

  // Bulk unlink entities with optimistic updates
  bulkUnlinkEntities: async (token: string, gatewayId: string, entityIds: string[]) => {
    const gatewayIdNum = parseInt(gatewayId, 10);
    const timer = createPerformanceTimer('bulkUnlinkEntities');

    console.log(`[EntityStore] Bulk unlinking ${entityIds.length} entities with optimistic update`);

    // Check if this is a new gateway (not saved yet)
    const isNewGateway = gatewayIdNum === -1;

    if (isNewGateway) {
      console.log(
        `[EntityStore] New gateway detected - storing bulk unlinks in pending links instead of API call`
      );

      try {
        set({ operationLoading: true });

        // Store all entities in pending links for later commitment (clear the links)
        entityIds.forEach((entityId) => {
          get().updatePendingLinks(entityId, undefined, undefined);
        });

        // Apply optimistic updates immediately for all entities
        entityIds.forEach((entityId) => {
          get().optimisticUpdateEntityLink(entityId, gatewayIdNum, undefined, undefined);
        });
        console.log(
          `[EntityStore] Pending bulk unlinks stored and optimistic updates applied for ${entityIds.length} entities`
        );

        set({ operationLoading: false });
        timer.end(
          `Bulk unlink operation completed successfully for ${entityIds.length} entities (pending)`
        );
        return true;
      } catch (error) {
        console.error('Error storing pending bulk unlinks:', error);
        set({ operationLoading: false });
        timer.end('Bulk unlink operation failed');
        return false;
      }
    }

    // Find database entities to get correct IDs for API calls and store previous states for rollback
    const { iotEntities } = get();
    const entitesToUnlink = entityIds
      .map((entityId) => {
        return iotEntities.find(
          (entity) => entity.entity_name === entityId && entity.gateway_id === gatewayIdNum
        );
      })
      .filter(Boolean) as IoTEntity[];

    if (entitesToUnlink.length !== entityIds.length) {
      console.log(
        `[EntityStore] Some entities not found for bulk unlinking. Found ${entitesToUnlink.length} of ${entityIds.length}`
      );
      timer.end('Bulk unlink operation failed - some entities not found');
      return false;
    }

    // Store previous states for rollback if needed
    const previousStates = new Map<string, { growId?: number; stage?: string }>();
    entitesToUnlink.forEach((entity) => {
      previousStates.set(entity.entity_name, {
        growId: entity.linked_grow_id,
        stage: entity.linked_stage,
      });
    });

    try {
      set({ operationLoading: true });

      // Apply optimistic updates immediately for all entities
      entityIds.forEach((entityId) => {
        get().optimisticUpdateEntityLink(entityId, gatewayIdNum, undefined, undefined);
      });
      console.log(
        `[EntityStore] Optimistic bulk unlink updates applied for ${entityIds.length} entities, UI should show immediate changes`
      );

      // Perform background API call using database IDs, not entity names
      timer.log('Starting background bulk API call');
      const databaseEntityIds = entitesToUnlink.map((entity) => entity.id);
      console.log(
        `[EntityStore] Calling bulkUnlinkIoTEntities with database IDs: [${databaseEntityIds.join(', ')}] for entities: [${entityIds.join(', ')}]`
      );
      await apiClient.bulkUnlinkIoTEntities(gatewayId, databaseEntityIds, token);
      timer.log('Background bulk unlink API call completed');

      set({ operationLoading: false });
      timer.end(`Bulk unlink operation completed successfully for ${entityIds.length} entities`);
      return true;
    } catch (error) {
      console.error('Error bulk unlinking entities:', error);

      // Rollback all optimistic updates on error
      console.log(
        `[EntityStore] Rolling back optimistic unlink updates for ${entityIds.length} entities`
      );
      entityIds.forEach((entityId) => {
        const previousState = previousStates.get(entityId);
        if (previousState) {
          get().optimisticUpdateEntityLink(
            entityId,
            gatewayIdNum,
            previousState.growId,
            previousState.stage
          );
        }
      });

      set({ operationLoading: false });
      handleUnauthorizedError(error as Error);
      timer.end('Bulk unlink operation failed');
      return false;
    }
  },

  // Handle gateway deletion - clean up all related state
  handleGatewayDeletion: (gatewayId: number) => {
    console.log(`[EntityStore] Handling gateway deletion for gateway ${gatewayId}`);

    set((state) => {
      // Remove all entities for this gateway
      const updatedHaEntities = state.haEntities.filter((entity) => {
        // Note: HA entities don't have gateway_id, but we can infer from current context
        // For now, we'll clear all HA entities as they're typically gateway-specific
        return false; // Clear all HA entities since we don't know which gateway they belong to
      });

      const updatedIotEntities = state.iotEntities.filter(
        (entity) => entity.gateway_id !== gatewayId
      );

      // Remove credentials cache for this gateway
      const updatedCredentials = new Map(state.lastCredentials);
      updatedCredentials.delete(gatewayId);

      // Remove from fetched gateways set
      const updatedFetchedGateways = new Set(state.fetchedGateways);
      updatedFetchedGateways.delete(gatewayId);

      // Clear pending links for this gateway
      const updatedPendingLinks = new Map<string, { growId?: number; stage?: string }>();
      state.pendingLinks.forEach((linkData, entityId) => {
        // Check if this entity belongs to the deleted gateway by looking at HA entities
        const belongsToDeletedGateway = state.haEntities.some(
          (haEntity) => haEntity.entity_id === entityId
        );
        if (!belongsToDeletedGateway) {
          updatedPendingLinks.set(entityId, linkData);
        }
      });

      // Recompute entity lists with updated entities
      const syncResult = get().computeEntityLists(updatedHaEntities, updatedIotEntities, false);

      console.log(
        `[EntityStore] Gateway ${gatewayId} deletion cleanup complete: removed ${
          state.iotEntities.length - updatedIotEntities.length
        } IoT entities, ${state.haEntities.length - updatedHaEntities.length} HA entities`
      );

      return {
        haEntities: updatedHaEntities,
        iotEntities: updatedIotEntities,
        linkableEntities: syncResult.linkableEntities,
        linkedEntities: syncResult.linkedEntities,
        lastCredentials: updatedCredentials,
        fetchedGateways: updatedFetchedGateways,
        pendingLinks: updatedPendingLinks,
        // Clear selection if any selected entities belonged to this gateway
        selectedEntityIds: new Set<string>(),
        bulkSelectionMode: false,
      };
    });

    // Clean up WebSocket connection for this gateway
    try {
      haWebSocketManager.disconnectGateway(gatewayId);
      console.log(`[EntityStore] WebSocket connection cleaned up for gateway ${gatewayId}`);
    } catch (error) {
      console.error(`[EntityStore] Error cleaning up WebSocket for gateway ${gatewayId}:`, error);
    }

    console.log(`[EntityStore] Gateway ${gatewayId} deletion handling completed`);
  },

  // Reset store state
  reset: () => {
    set({
      operationLoading: false,
      pendingOperations: new Map<string, EntityOperation>(),
      pendingLinks: new Map<string, { growId?: number; stage?: string }>(),
    });
  },
});
