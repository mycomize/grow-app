import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useUnifiedToast } from '~/components/ui/unified-toast';
import { apiClient, isUnauthorizedError } from '~/lib/ApiClient';
import { IoTGateway, IoTGatewayUpdate, IoTEntity, IoTEntityCreate, HAEntity } from '~/lib/iot';

export function useHAEntityManager(appAuthToken: string | null) {
  const router = useRouter();
  const { showError, showSuccess } = useUnifiedToast();

  const [haEntities, setHaEntities] = useState<HAEntity[]>([]);
  const [dbEntities, setDbEntities] = useState<IoTEntity[]>([]);
  const [linkableEntities, setLinkableEntities] = useState<IoTEntity[]>([]);
  const [linkedEntities, setLinkedEntities] = useState<IoTEntity[]>([]);

  /**
   * Extract domain from Home Assistant entity_id
   * @param entityId - HA entity ID (e.g., "switch.living_room_light")
   * @returns domain (e.g., "switch")
   */
  const extractDomain = (entityId: string): string => {
    return entityId.split('.')[0] || '';
  };

  /**
   * Extract device class from Home Assistant entity attributes
   * @param attributes - HA entity attributes object
   * @returns device_class or empty string if not present
   */
  const extractDeviceClass = (attributes: Record<string, any>): string => {
    return attributes?.device_class || '';
  };

  /**
   * Create IoTEntity from HAEntity with proper field extraction
   * @param haEntity - Home Assistant entity
   * @param gatewayId - Gateway ID for the entity
   * @returns IoTEntityCreate object
   */
  const createIoTEntityFromHAEntity = (haEntity: HAEntity, gatewayId: number): IoTEntityCreate => {
    return {
      gateway_id: gatewayId,
      entity_name: haEntity.entity_id,
      entity_type: 'home_assistant',
      friendly_name: haEntity.attributes?.friendly_name || haEntity.entity_id,
      domain: extractDomain(haEntity.entity_id),
      device_class: extractDeviceClass(haEntity.attributes),
    };
  };

  /**
   * Compute derived entity lists based on HA and DB entities
   * This function implements the core synchronization logic:
   *   linkableEntities: new HA entities + existing DB entities with no linked_grow_id
   *   linkedEntities: existing DB entities with linked_grow_id
   *   newEntities: HA entities not in DB (need to be created)
   *   orphanedEntities: DB entities not in HA (need to be deleted)
   */
  const computeEntityLists = useCallback(
    (haEntities: HAEntity[], dbEntities: IoTEntity[], isNewGateway: boolean = false) => {
      console.log(
        `[useHAEntityManager] computeEntityLists called with ${haEntities.length} HA entities, ${dbEntities.length} DB entities, isNewGateway: ${isNewGateway}`
      );

      if (isNewGateway || dbEntities.length === 0) {
        // For new gateways or when no DB entities exist, all HA entities are linkable
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

        setLinkableEntities(newLinkableEntities);
        setLinkedEntities([]);
        console.log(
          `[useHAEntityManager] New/empty gateway: ${newLinkableEntities.length} linkable entities, 0 linked entities`
        );
        return {
          newEntities: haEntities,
          orphanedEntities: [],
          linkableEntities: newLinkableEntities,
          linkedEntities: [],
        };
      }

      // Create lookup maps for efficient comparison
      const haEntityMap = new Map(haEntities.map((entity) => [entity.entity_id, entity]));
      const dbEntityMap = new Map(dbEntities.map((entity) => [entity.entity_name, entity]));

      // Find new entities (in HA but not in DB)
      const newEntities = haEntities.filter((haEntity) => !dbEntityMap.has(haEntity.entity_id));
      console.log(
        `[useHAEntityManager] Found ${newEntities.length} new entities (in HA but not in DB)`
      );

      // Find orphaned entities (in DB but not in HA)
      const orphanedEntities = dbEntities.filter(
        (dbEntity) => !haEntityMap.has(dbEntity.entity_name)
      );
      console.log(
        `[useHAEntityManager] Found ${orphanedEntities.length} orphaned entities (in DB but not in HA)`
      );

      // Existing entities (in both HA and DB)
      const existingEntities = dbEntities.filter((dbEntity) =>
        haEntityMap.has(dbEntity.entity_name)
      );
      console.log(
        `[useHAEntityManager] Found ${existingEntities.length} existing entities (in both HA and DB)`
      );

      // Compute linkable entities: new entities (as pseudo-entities) + existing entities with no grow assignment
      const newEntityPseudos = newEntities.map((haEntity) => ({
        id: -1, // Temporary ID for new entities
        gateway_id: dbEntities[0]?.gateway_id || -1,
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
        `[useHAEntityManager] Found ${existingLinkableEntities.length} existing linkable entities (no grow assignment)`
      );

      const computedLinkableEntities = [...newEntityPseudos, ...existingLinkableEntities];
      console.log(
        `[useHAEntityManager] Total linkable entities: ${newEntityPseudos.length} new + ${existingLinkableEntities.length} existing = ${computedLinkableEntities.length}`
      );

      // Compute linked entities: existing entities with grow assignment
      const computedLinkedEntities = existingEntities.filter((entity) => entity.linked_grow_id);
      console.log(
        `[useHAEntityManager] Found ${computedLinkedEntities.length} linked entities (with grow assignment)`
      );

      setLinkableEntities(computedLinkableEntities);
      setLinkedEntities(computedLinkedEntities);
      console.log(
        `[useHAEntityManager] Existing gateway: ${computedLinkableEntities.length} linkable entities, ${computedLinkedEntities.length} linked entities`
      );

      return {
        newEntities,
        orphanedEntities,
        linkableEntities: computedLinkableEntities,
        linkedEntities: computedLinkedEntities,
      };
    },
    [] // No dependencies - stable function that takes parameters
  );

  /**
   * Synchronize DB entities with HA entities
   * Updates both the database and local state without refetching
   */
  const performDbSync = useCallback(
    async (
      gatewayId: string,
      currentDbEntities: IoTEntity[],
      newEntities: HAEntity[],
      orphanedEntities: IoTEntity[]
    ) => {
      if (!appAuthToken) return false;

      try {
        let updatedDbEntities = [...currentDbEntities];

        // Bulk create new entities in DB
        if (newEntities.length > 0) {
          try {
            const entitiesToCreate = newEntities.map((haEntity) =>
              createIoTEntityFromHAEntity(haEntity, parseInt(gatewayId))
            );
            console.log(
              `[useHAEntityManager] Bulk creating ${entitiesToCreate.length} new entities in DB`
            );
            const createdEntities = await apiClient.bulkCreateIoTEntities(
              gatewayId,
              entitiesToCreate,
              appAuthToken
            );
            // Add created entities to local state
            if (createdEntities && Array.isArray(createdEntities)) {
              updatedDbEntities = [...updatedDbEntities, ...createdEntities];
            }
          } catch (error) {
            console.error('Failed to bulk create entities:', error);
            return false;
          }
        }

        // Bulk delete orphaned entities from DB
        if (orphanedEntities.length > 0) {
          try {
            const entityIdsToDelete = orphanedEntities.map((entity) => entity.id);
            await apiClient.bulkDeleteIoTEntities(gatewayId, entityIdsToDelete, appAuthToken);
            // Remove deleted entities from local state
            updatedDbEntities = updatedDbEntities.filter(
              (entity) => !entityIdsToDelete.includes(entity.id)
            );
          } catch (error) {
            console.error('Failed to bulk delete orphaned entities:', error);
            return false;
          }
        }

        // Update local state directly instead of refetching
        if (newEntities.length > 0 || orphanedEntities.length > 0) {
          setDbEntities(updatedDbEntities);
          console.log(
            `[useHAEntityManager] Updated local DB entities: ${updatedDbEntities.length} entities`
          );
        }

        return true;
      } catch (error) {
        console.error('Failed to sync DB entities:', error);
        return false;
      }
    },
    [appAuthToken]
  );

  /**
   * Fetch entities from Home Assistant API
   * Computation and sync will be handled by useEffect and separate sync function
   */
  const fetchHaEntities = async (gatewayOrFormData: IoTGateway | IoTGatewayUpdate) => {
    try {
      const response = await fetch(`${gatewayOrFormData.api_url}/api/states`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${gatewayOrFormData.api_key}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const fetchedHaEntities: HAEntity[] = await response.json();
        setHaEntities(fetchedHaEntities);
        console.log(`[useHAEntityManager] Fetched ${fetchedHaEntities.length} HA entities`);

        // Computation will be handled by useEffect
        // Sync will be handled by separate sync logic if needed
      } else {
        if (response.status === 401) {
          showError('Invalid Home Assistant API token');
        } else {
          showError('Failed to fetch entities from Home Assistant');
        }
      }
    } catch (err) {
      console.error('Failed to fetch HA entities:', err);
      showError('Failed to connect to Home Assistant');
    }
  };

  /**
   * Fetch entities from backend database using app's auth token
   * Computation will be handled by separate useEffect
   */
  const fetchDbEntities = useCallback(
    async (gatewayId: string) => {
      if (!gatewayId || !appAuthToken || gatewayId === 'new') return;

      try {
        const entities: IoTEntity[] = await apiClient.getIoTEntities(gatewayId, appAuthToken);
        setDbEntities(entities);
        console.log(`[useHAEntityManager] Fetched ${entities.length} DB entities`);
      } catch (err) {
        if (isUnauthorizedError(err as Error)) {
          router.replace('/login');
          return;
        }
        console.error('Failed to fetch db entities:', err);
      }
    },
    [appAuthToken, router]
  );

  /**
   * Sync DB entities after gateway save
   * This is called from saveGateway to ensure only new entities are created and orphaned ones are deleted
   * Also updates the gateway with entity count information
   */
  const syncDbEntities = async (savedGateway: IoTGateway) => {
    if (!appAuthToken) return;

    try {
      // First, fetch the current DB entities to compare with HA entities
      const currentDbEntities = await apiClient.getIoTEntities(
        savedGateway.id.toString(),
        appAuthToken
      );

      console.log(
        `[useHAEntityManager] Syncing entities after gateway save: ${haEntities.length} HA entities, ${currentDbEntities.length} current DB entities`
      );

      // Compute what needs to be synced
      const { newEntities, orphanedEntities, linkableEntities, linkedEntities } =
        computeEntityLists(haEntities, currentDbEntities, currentDbEntities.length === 0);

      // Perform the actual sync using the proper sync logic
      if (newEntities.length > 0 || orphanedEntities.length > 0) {
        console.log(
          `[useHAEntityManager] Syncing: ${newEntities.length} new entities to create, ${orphanedEntities.length} orphaned entities to delete`
        );
        await performDbSync(
          savedGateway.id.toString(),
          currentDbEntities,
          newEntities,
          orphanedEntities
        );
      } else {
        console.log('[useHAEntityManager] No sync needed - entities are already in sync');
        // Still update local state with current entities
        setDbEntities(currentDbEntities);
      }

      // Refetch DB entities to get the final state and ensure UI is updated
      await fetchDbEntities(savedGateway.id.toString());

      // Update gateway with entity counts (encrypted)
      try {
        const linkedCount = linkedEntities.length;
        const linkableCount = linkableEntities.length;

        console.log(
          `[useHAEntityManager] Updating gateway with entity counts: ${linkedCount} linked, ${linkableCount} linkable`
        );

        await apiClient.updateIoTGateway(
          savedGateway.id.toString(),
          {
            linked_entities_count: linkedCount.toString(),
            linkable_entities_count: linkableCount.toString(),
          },
          appAuthToken
        );
      } catch (error) {
        console.error('Failed to update gateway entity counts:', error);
      }
    } catch (error) {
      console.error('Failed to sync entities after gateway save:', error);
      if (isUnauthorizedError(error as Error)) {
        router.replace('/login');
      }
    }
  };

  /**
   * Automatic computation effect - triggers whenever haEntities or dbEntities changes
   * This replaces the conditional computation logic that was previously in fetchDbEntities
   */
  useEffect(() => {
    // Only compute if we have both HA entities and DB entities (or DB entities is empty array for new gateway)
    if (haEntities.length > 0 && dbEntities.length >= 0) {
      console.log(
        `[useHAEntityManager] Auto-computing entity lists: ${haEntities.length} HA entities, ${dbEntities.length} DB entities`
      );
      computeEntityLists(haEntities, dbEntities, false);
    }
  }, [haEntities, dbEntities, computeEntityLists]);

  /**
   * DB sync effect - handles synchronization when HA and DB entities are available
   * This effect runs after computation and handles creating new entities or deleting orphaned ones
   */
  useEffect(() => {
    const performAutoSync = async () => {
      // Only sync if we have both HA and DB entities, and DB entities exist (not a new gateway)
      if (haEntities.length > 0 && dbEntities.length > 0 && appAuthToken) {
        // Determine if there are new or orphaned entities that need syncing
        const haEntityMap = new Map(haEntities.map((entity) => [entity.entity_id, entity]));
        const dbEntityMap = new Map(dbEntities.map((entity) => [entity.entity_name, entity]));

        const newEntities = haEntities.filter((haEntity) => !dbEntityMap.has(haEntity.entity_id));
        const orphanedEntities = dbEntities.filter(
          (dbEntity) => !haEntityMap.has(dbEntity.entity_name)
        );

        if (newEntities.length > 0 || orphanedEntities.length > 0) {
          // We need the gateway ID to perform sync
          const gatewayId = dbEntities[0]?.gateway_id?.toString();
          if (gatewayId) {
            console.log(
              `[useHAEntityManager] Auto-syncing: ${newEntities.length} new entities, ${orphanedEntities.length} orphaned entities`
            );
            await performDbSync(gatewayId, dbEntities, newEntities, orphanedEntities);
          }
        }
      }
    };

    performAutoSync();
  }, [haEntities, dbEntities, appAuthToken, performDbSync]);

  return {
    // State
    haEntities,
    dbEntities,
    linkableEntities,
    linkedEntities,

    // Actions
    fetchHaEntities,
    fetchDbEntities,
    syncDbEntities,
  };
}
