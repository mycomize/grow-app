import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useUnifiedToast } from '~/components/ui/unified-toast';
import { apiClient, isUnauthorizedError } from '~/lib/ApiClient';
import { IoTGateway, IoTEntity } from '~/lib/iot';
import { BulkGrow } from '~/lib/growTypes';

// This is used in the ControlPanelSection
export function useHAEntityLinkingManager(appAuthToken: string | null) {
  const router = useRouter();
  const { showError, showSuccess } = useUnifiedToast();

  const [grows, setGrows] = useState<BulkGrow[]>([]);

  // Fetch grows for linking
  const fetchGrows = useCallback(async () => {
    if (!appAuthToken) return;

    try {
      const data: BulkGrow[] = await apiClient.getBulkGrows(appAuthToken);
      setGrows(data);
    } catch (err) {
      if (isUnauthorizedError(err as Error)) {
        router.replace('/login');
        return;
      }
      console.error('Failed to fetch grows:', err);
    }
  }, [appAuthToken, router]);

  // Handle bulk entity linking to grow and stage
  const handleBulkLink = async (
    gateway: IoTGateway,
    dbEntities: IoTEntity[],
    entityIds: string[],
    growId: number,
    stage: string
  ) => {
    if (!gateway || !appAuthToken) return;

    try {
      const entityDbIds = entityIds
        .map((entityName) => {
          const entity = dbEntities.find((e) => e.entity_name === entityName);
          if (!entity) return null;

          return entity.id;
        })
        .filter((id): id is number => id !== null);

      console.log('Debug - Entity IDs:', entityDbIds, 'Grow ID:', growId, 'Stage:', stage);

      if (entityDbIds.length === 0) {
        console.log('No valid entities found for in dbEntities for linking');
        return;
      }

      await apiClient.bulkLinkIoTEntities(
        gateway.id.toString(),
        entityDbIds,
        growId,
        stage,
        appAuthToken
      );

      showSuccess(`Successfully linked ${entityIds.length} IoT controls`);
      return true;
    } catch (err) {
      if (isUnauthorizedError(err as Error)) {
        router.replace('/login');
        return;
      }
      console.log(
        'Failed to link entities: ' + (err instanceof Error ? err.message : 'Unknown error')
      );
      return false;
    }
  };

  // Handle individual entity linking to grow and stage
  const handleIndividualLink = async (
    gateway: IoTGateway,
    dbEntities: IoTEntity[],
    entityId: string,
    growId: number,
    stage: string
  ) => {
    if (!gateway || !appAuthToken) return;

    try {
      const entity = dbEntities.find((e) => e.entity_name === entityId);
      if (!entity) {
        console.log('Failed to link IoT control');
        return;
      }

      await apiClient.linkIoTEntity(
        gateway.id.toString(),
        entity.id.toString(),
        growId,
        stage,
        appAuthToken
      );

      showSuccess('Successfully linked IoT control');
      return true;
    } catch (err) {
      if (isUnauthorizedError(err as Error)) {
        router.replace('/login');
        return;
      }
      console.log(
        'Failed to link entity: ' + (err instanceof Error ? err.message : 'Unknown error')
      );
      return false;
    }
  };

  // Handle bulk entity unlinking from grows
  const handleBulkUnlink = async (
    gateway: IoTGateway,
    dbEntities: IoTEntity[],
    entityIds: string[]
  ) => {
    if (!gateway || !appAuthToken) return;

    try {
      const entityDbIds = entityIds
        .map((entityName) => {
          const entity = dbEntities.find((e) => e.entity_name === entityName);
          if (!entity) return null;

          return entity.id;
        })
        .filter((id): id is number => id !== null);

      console.log('Debug - Unlinking Entity IDs:', entityDbIds);

      if (entityDbIds.length === 0) {
        console.log('No valid entities found for unlinking');
        return;
      }

      await apiClient.bulkUnlinkIoTEntities(gateway.id.toString(), entityDbIds, appAuthToken);

      showSuccess(`Successfully unlinked ${entityIds.length} entities from their grows`);
      return true;
    } catch (err) {
      if (isUnauthorizedError(err as Error)) {
        router.replace('/login');
        return;
      }
      console.log(
        'Failed to unlink entities: ' + (err instanceof Error ? err.message : 'Unknown error')
      );
      return false;
    }
  };

  // Handle individual entity unlinking from grow
  const handleIndividualUnlink = async (
    gateway: IoTGateway,
    dbEntities: IoTEntity[],
    entityId: string
  ) => {
    if (!gateway || !appAuthToken) return;

    try {
      const entity = dbEntities.find((e) => e.entity_name === entityId);
      if (!entity) {
        console.log('Failed to unlink entity: Entity not found in dbEntities');
        return;
      }

      await apiClient.unlinkIoTEntity(gateway.id.toString(), entity.id.toString(), appAuthToken);

      showSuccess('Successfully unlinked entity from grow');
      return true;
    } catch (err) {
      if (isUnauthorizedError(err as Error)) {
        router.replace('/login');
        return;
      }
      console.log(
        'Failed to unlink entity: ' + (err instanceof Error ? err.message : 'Unknown error')
      );
      return false;
    }
  };

  return {
    // State
    grows,

    // Actions
    fetchGrows,
    handleBulkLink,
    handleIndividualLink,
    handleBulkUnlink,
    handleIndividualUnlink,
  };
}
