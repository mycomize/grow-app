import { useState, useCallback, useContext } from 'react';
import { useRouter } from 'expo-router';
import { AuthContext } from '~/lib/AuthContext';
import { apiClient, isUnauthorizedError } from '~/lib/ApiClient';
import { useUnifiedToast } from '~/components/ui/unified-toast';

export interface IoTOperations {
  loading: boolean;
  linkEntity: (entityId: string, targetGrowId?: number, targetStage?: string) => Promise<boolean>;
  unlinkEntity: (entityId: string) => Promise<boolean>;
  bulkLinkEntities: (
    entityIds: string[],
    targetGrowId?: number,
    targetStage?: string
  ) => Promise<boolean>;
  bulkUnlinkEntities: (entityIds: string[]) => Promise<boolean>;
}

/**
 * Hook for managing IoT entity link/unlink operations
 * Can work in context mode (with predefined grow/stage) or flexible mode
 */
export const useIoTOperations = (
  contextGrowId?: number,
  contextStageName?: string
): IoTOperations => {
  const [loading, setLoading] = useState(false);
  const { token } = useContext(AuthContext);
  const router = useRouter();
  const { showError, showSuccess } = useUnifiedToast();

  const linkEntity = useCallback(
    async (entityId: string, targetGrowId?: number, targetStage?: string): Promise<boolean> => {
      if (!token) {
        router.replace('/login');
        return false;
      }

      const growId = targetGrowId ?? contextGrowId;
      const stage = targetStage ?? contextStageName;

      if (!growId || !stage) {
        showError('Grow and stage must be specified for linking');
        return false;
      }

      try {
        setLoading(true);

        // Find the gateway for this entity
        const allGateways = await apiClient.get('/iot-gateways', token, 'IoTGateway', true);
        const gatewayEntities = await Promise.all(
          allGateways.map(async (gateway: any) => {
            try {
              const entities = await apiClient.get(
                `/iot-gateways/${gateway.id}/entities`,
                token,
                'IoTEntity',
                true
              );
              return entities.map((entity: any) => ({ ...entity, gateway_id: gateway.id }));
            } catch {
              return [];
            }
          })
        );

        const allEntities = gatewayEntities.flat();
        const entity = allEntities.find((e: any) => e.entity_name === entityId);

        if (!entity) {
          showError('IoT entity not found');
          return false;
        }

        // Link the entity
        await apiClient.put(
          `/iot-gateways/${entity.gateway_id}/entities/${entity.id}/link`,
          {
            grow_id: growId,
            stage: stage,
          },
          token,
          'EntityLinkingRequest'
        );

        showSuccess('IoT control linked successfully');
        return true;
      } catch (err) {
        if (isUnauthorizedError(err as Error)) {
          router.replace('/login');
          return false;
        }
        console.error('Failed to link entity:', err);
        showError('Failed to link IoT control');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [token, contextGrowId, contextStageName, router, showError, showSuccess]
  );

  const unlinkEntity = useCallback(
    async (entityId: string): Promise<boolean> => {
      if (!token) {
        router.replace('/login');
        return false;
      }

      try {
        setLoading(true);

        // Find the gateway for this entity
        const allGateways = await apiClient.get('/iot-gateways', token, 'IoTGateway', true);
        const gatewayEntities = await Promise.all(
          allGateways.map(async (gateway: any) => {
            try {
              const entities = await apiClient.get(
                `/iot-gateways/${gateway.id}/entities`,
                token,
                'IoTEntity',
                true
              );
              return entities.map((entity: any) => ({ ...entity, gateway_id: gateway.id }));
            } catch {
              return [];
            }
          })
        );

        const allEntities = gatewayEntities.flat();
        const entity = allEntities.find((e: any) => e.entity_name === entityId);

        if (!entity) {
          showError('Entity not found');
          return false;
        }

        // Unlink the entity
        await apiClient.delete(
          `/iot-gateways/${entity.gateway_id}/entities/${entity.id}/unlink`,
          token
        );

        showSuccess('IoT control unlinked successfully');
        return true;
      } catch (err) {
        if (isUnauthorizedError(err as Error)) {
          router.replace('/login');
          return false;
        }
        console.error('Failed to unlink entity:', err);
        showError('Failed to unlink IoT control');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [token, router, showError, showSuccess]
  );

  const bulkLinkEntities = useCallback(
    async (entityIds: string[], targetGrowId?: number, targetStage?: string): Promise<boolean> => {
      if (!token) {
        router.replace('/login');
        return false;
      }

      if (entityIds.length === 0) return true;

      const growId = targetGrowId ?? contextGrowId;
      const stage = targetStage ?? contextStageName;

      if (!growId || !stage) {
        showError('Grow and stage must be specified for linking');
        return false;
      }

      try {
        setLoading(true);

        const results = await Promise.allSettled(
          entityIds.map((entityId) => linkEntity(entityId, growId, stage))
        );

        const successCount = results.filter(
          (result) => result.status === 'fulfilled' && result.value
        ).length;

        if (successCount === entityIds.length) {
          showSuccess(
            `Successfully linked ${successCount} IoT control${successCount !== 1 ? 's' : ''}`
          );
          return true;
        } else {
          const failedCount = entityIds.length - successCount;
          showError(
            `Linked ${successCount} control${successCount !== 1 ? 's' : ''}, failed ${failedCount}`
          );
          return false;
        }
      } catch (err) {
        console.error('Bulk link operation failed:', err);
        showError('Bulk link operation failed');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [token, linkEntity, contextGrowId, contextStageName, router, showError, showSuccess]
  );

  const bulkUnlinkEntities = useCallback(
    async (entityIds: string[]): Promise<boolean> => {
      if (!token) {
        router.replace('/login');
        return false;
      }

      if (entityIds.length === 0) return true;

      try {
        setLoading(true);

        const results = await Promise.allSettled(
          entityIds.map((entityId) => unlinkEntity(entityId))
        );

        const successCount = results.filter(
          (result) => result.status === 'fulfilled' && result.value
        ).length;

        if (successCount === entityIds.length) {
          showSuccess(
            `Successfully unlinked ${successCount} IoT control${successCount !== 1 ? 's' : ''}`
          );
          return true;
        } else {
          const failedCount = entityIds.length - successCount;
          showError(
            `Unlinked ${successCount} control${successCount !== 1 ? 's' : ''}, failed ${failedCount}`
          );
          return false;
        }
      } catch (err) {
        console.error('Bulk unlink operation failed:', err);
        showError('Bulk unlink operation failed');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [token, unlinkEntity, router, showError, showSuccess]
  );

  return {
    loading,
    linkEntity,
    unlinkEntity,
    bulkLinkEntities,
    bulkUnlinkEntities,
  };
};
