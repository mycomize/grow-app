import { HAEntityState } from '../stores/iot/entity/types';
import { getEntityStateUpdateCadenceMinutes } from '../userPreferences';

// Entity state update tracking
export interface EntityUpdateTracker {
  entityId: string;
  gatewayId: number;
  lastUpdateTime: number;
}

// State change listener callback
export type StateChangeListener = (
  gatewayId: number,
  entityId: string,
  newState: HAEntityState
) => void;

/**
 * EntityStateUpdateManager - Central manager for tracking entity state updates with cadence control
 * Implements singleton pattern for global state management across the application
 */
class EntityStateUpdateManager {
  private static instance: EntityStateUpdateManager;
  
  private trackedEntities: Map<string, EntityUpdateTracker> = new Map();
  private cadenceMinutes: number = 1; // Default 1 minute
  private stateChangeListeners: Set<StateChangeListener> = new Set();

  private constructor() {
    this.loadCadenceFromPreferences();
  }

  public static getInstance(): EntityStateUpdateManager {
    if (!EntityStateUpdateManager.instance) {
      EntityStateUpdateManager.instance = new EntityStateUpdateManager();
    }
    return EntityStateUpdateManager.instance;
  }

  /**
   * Load cadence setting from user preferences
   */
  private async loadCadenceFromPreferences(): Promise<void> {
    try {
      this.cadenceMinutes = await getEntityStateUpdateCadenceMinutes();
    } catch (error) {
      console.warn('Failed to load cadence from preferences, using default:', error);
      this.cadenceMinutes = 1;
    }
  }

  /**
   * Generate unique key for entity tracking
   */
  private getEntityKey(entityId: string, gatewayId: number): string {
    return `${gatewayId}-${entityId}`;
  }

  /**
   * Register an entity for state update tracking (idempotent - won't duplicate existing registrations)
   */
  public registerEntityForUpdates(entityId: string, gatewayId: number): boolean {
    const key = this.getEntityKey(entityId, gatewayId);
    
    if (!this.trackedEntities.has(key)) {
      const tracker: EntityUpdateTracker = {
        entityId,
        gatewayId,
        lastUpdateTime: 0, // Allow immediate first update
      };
      
      this.trackedEntities.set(key, tracker);
      console.log(`Registered entity ${entityId} on gateway ${gatewayId} for state updates`);
      return true; // New registration
    } else {
      console.log(`Entity ${entityId} on gateway ${gatewayId} already registered for state updates`);
      return false; // Already registered
    }
  }

  /**
   * Unregister an entity from state update tracking
   */
  public unregisterEntityFromUpdates(entityId: string, gatewayId: number): boolean {
    const key = this.getEntityKey(entityId, gatewayId);
    
    if (this.trackedEntities.delete(key)) {
      console.log(`Unregistered entity ${entityId} on gateway ${gatewayId} from state updates`);
      return true; // Successfully unregistered
    } else {
      console.log(`Entity ${entityId} on gateway ${gatewayId} was not registered for state updates`);
      return false; // Was not registered
    }
  }

  /**
   * Check if minimum time has passed for entity updates
   */
  public shouldUpdateEntity(entityId: string, gatewayId: number): boolean {
    const key = this.getEntityKey(entityId, gatewayId);
    const tracker = this.trackedEntities.get(key);
    
    if (!tracker) {
      return false; // Entity not tracked
    }
    
    const now = Date.now();
    const cadenceMs = this.cadenceMinutes * 60 * 1000;
    const timeSinceLastUpdate = now - tracker.lastUpdateTime;
    
    return timeSinceLastUpdate >= cadenceMs;
  }

  /**
   * Process state change with cadence check - update immediately if minimum time elapsed, ignore otherwise
   */
  public handleStateChange(gatewayId: number, entityId: string, newState: HAEntityState): void {
    const key = this.getEntityKey(entityId, gatewayId);
    const tracker = this.trackedEntities.get(key);
    
    if (!tracker) {
      // Entity not registered for updates
      return;
    }
    
    if (this.shouldUpdateEntity(entityId, gatewayId)) {
      // Minimum time has passed, update immediately
      this.executeStateUpdate(gatewayId, entityId, newState);
      tracker.lastUpdateTime = Date.now();
    }
    // If minimum time hasn't passed, simply ignore this update
  }

  /**
   * Execute the actual state update by notifying all listeners
   */
  private executeStateUpdate(gatewayId: number, entityId: string, newState: HAEntityState): void {
    this.stateChangeListeners.forEach(listener => {
      try {
        listener(gatewayId, entityId, newState);
      } catch (error) {
        console.error('Error in state change listener:', error);
      }
    });
  }

  /**
   * Add a state change listener
   */
  public addStateChangeListener(listener: StateChangeListener): void {
    this.stateChangeListeners.add(listener);
  }

  /**
   * Remove a state change listener
   */
  public removeStateChangeListener(listener: StateChangeListener): void {
    this.stateChangeListeners.delete(listener);
  }

  /**
   * Update the global cadence setting and reload from preferences
   */
  public async updateUserCadenceSetting(cadenceMinutes?: number): Promise<void> {
    if (cadenceMinutes !== undefined) {
      this.cadenceMinutes = cadenceMinutes;
    } else {
      await this.loadCadenceFromPreferences();
    }
    
    console.log(`Updated entity state update cadence to ${this.cadenceMinutes} minutes`);
  }

  /**
   * Get current cadence in minutes
   */
  public getCadenceMinutes(): number {
    return this.cadenceMinutes;
  }

  /**
   * Get list of all tracked entities
   */
  public getTrackedEntities(): EntityUpdateTracker[] {
    return Array.from(this.trackedEntities.values());
  }

  /**
   * Clear all tracked entities (useful for cleanup)
   */
  public clearAllTrackedEntities(): void {
    this.trackedEntities.clear();
    console.log('Cleared all tracked entities');
  }

  /**
   * Check if an entity is already being tracked for updates
   */
  public isEntityTracked(entityId: string, gatewayId: number): boolean {
    const key = this.getEntityKey(entityId, gatewayId);
    return this.trackedEntities.has(key);
  }

  /**
   * Register multiple entities for state update tracking (bulk operation)
   */
  public registerMultipleEntitiesForUpdates(entityIds: string[], gatewayId: number): { registered: number; alreadyRegistered: number } {
    let registered = 0;
    let alreadyRegistered = 0;
    
    for (const entityId of entityIds) {
      if (this.registerEntityForUpdates(entityId, gatewayId)) {
        registered++;
      } else {
        alreadyRegistered++;
      }
    }
    
    console.log(`Bulk registration for gateway ${gatewayId}: ${registered} new, ${alreadyRegistered} already registered`);
    return { registered, alreadyRegistered };
  }

  /**
   * Get debug information about current state
   */
  public getDebugInfo(): {
    trackedEntitiesCount: number;
    cadenceMinutes: number;
    listenersCount: number;
  } {
    return {
      trackedEntitiesCount: this.trackedEntities.size,
      cadenceMinutes: this.cadenceMinutes,
      listenersCount: this.stateChangeListeners.size,
    };
  }
}

// Export singleton instance
export default EntityStateUpdateManager.getInstance();
