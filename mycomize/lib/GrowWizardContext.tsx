import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { AuthContext } from './AuthContext';
import { getBackendUrl } from './backendUrl';
import { Grow, growTeks, growStatuses, growStages } from './grow';

interface SyringeData {
  vendor: string;
  volumeMl: number;
  cost: number;
  species: string;
  strain: string;
  createdAt: Date | null;
  expirationDate: Date | null;
}

interface SpawnData {
  type: string;
  weightLbs: number;
  cost: number;
  vendor: string;
  inoculationDate: Date | null;
}

interface BulkData {
  type: string;
  weightLbs: number;
  cost: number;
  vendor: string;
  createdAt: Date | null;
  expirationDate: Date | null;
}

interface FruitingData {
  startDate: Date | null;
  pinDate: Date | null;
  mistFrequency: string;
  fanFrequency: string;
}

interface HarvestFlush {
  id: string;
  harvestDate: Date | null;
  wetWeightG: number;
  dryWeightG: number;
  potency: string;
}

interface GrowWizardContextType {
  // Basic grow data
  growId: string | null;
  name: string;
  setName: (name: string) => void;
  tek: string;
  setTek: (tek: string) => void;
  notes: string;
  setNotes: (notes: string) => void;

  // Extended data for wizard
  syringe: SyringeData;
  setSyringe: (data: Partial<SyringeData>) => void;
  spawn: SpawnData;
  setSpawn: (data: Partial<SpawnData>) => void;
  bulk: BulkData;
  setBulk: (data: Partial<BulkData>) => void;
  fruiting: FruitingData;
  setFruiting: (data: Partial<FruitingData>) => void;
  flushes: HarvestFlush[];
  addFlush: () => void;
  updateFlush: (id: string, data: Partial<HarvestFlush>) => void;
  removeFlush: (id: string) => void;

  // Functions
  isLoading: boolean;
  error: string | null;
  saveGrow: (nextStep?: string) => Promise<void>;
  deleteGrow: () => Promise<void>;
  calculateTotalCost: () => number;
}

const defaultSyringeData: SyringeData = {
  vendor: '',
  volumeMl: 10,
  cost: 0,
  species: '',
  strain: '',
  createdAt: new Date(),
  expirationDate: null,
};

const defaultSpawnData: SpawnData = {
  type: 'Rye Grain',
  weightLbs: 1,
  cost: 0,
  vendor: '',
  inoculationDate: new Date(),
};

const defaultBulkData: BulkData = {
  type: 'Coco Coir',
  weightLbs: 1,
  cost: 0,
  vendor: '',
  createdAt: new Date(),
  expirationDate: null,
};

const defaultFruitingData: FruitingData = {
  startDate: null,
  pinDate: null,
  mistFrequency: 'Twice daily',
  fanFrequency: 'Twice daily',
};

// Generate a unique ID for harvest flushes
const generateId = () => Math.random().toString(36).substring(2, 11);

const defaultHarvestFlush: HarvestFlush = {
  id: generateId(),
  harvestDate: null,
  wetWeightG: 0,
  dryWeightG: 0,
  potency: 'Medium',
};

// Create the context with a default undefined value
const GrowWizardContext = createContext<GrowWizardContextType | undefined>(undefined);

// Hook for using the context
export const useGrowWizard = () => {
  const context = useContext(GrowWizardContext);
  if (context === undefined) {
    throw new Error('useGrowWizard must be used within a GrowWizardProvider');
  }
  return context;
};

// Provider component
export const GrowWizardProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { token } = useContext(AuthContext);
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = params.id as string | null;
  const growId = id as string | null;

  // State for loading and error
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Basic grow data
  const [name, setName] = useState('');
  const [tek, setTek] = useState(growTeks.MONOTUB);
  const [notes, setNotes] = useState('');

  // Extended data for wizard
  const [syringe, setSyringeState] = useState<SyringeData>(defaultSyringeData);
  const [spawn, setSpawnState] = useState<SpawnData>(defaultSpawnData);
  const [bulk, setBulkState] = useState<BulkData>(defaultBulkData);
  const [fruiting, setFruitingState] = useState<FruitingData>(defaultFruitingData);
  const [flushes, setFlushes] = useState<HarvestFlush[]>([defaultHarvestFlush]);

  // Handler for setting syringe data
  const setSyringe = (data: Partial<SyringeData>) => {
    setSyringeState((prev) => ({ ...prev, ...data }));
  };

  // Handler for setting spawn data
  const setSpawn = (data: Partial<SpawnData>) => {
    setSpawnState((prev) => ({ ...prev, ...data }));
  };

  // Handler for setting bulk data
  const setBulk = (data: Partial<BulkData>) => {
    setBulkState((prev) => ({ ...prev, ...data }));
  };

  // Handler for setting fruiting data
  const setFruiting = (data: Partial<FruitingData>) => {
    setFruitingState((prev) => ({ ...prev, ...data }));
  };

  // Handler for adding a new flush
  const addFlush = () => {
    setFlushes((prev) => [...prev, { ...defaultHarvestFlush, id: generateId() }]);
  };

  // Handler for updating a flush
  const updateFlush = (id: string, data: Partial<HarvestFlush>) => {
    setFlushes((prev) => prev.map((flush) => (flush.id === id ? { ...flush, ...data } : flush)));
  };

  // Handler for removing a flush
  const removeFlush = (id: string) => {
    setFlushes((prev) => prev.filter((flush) => flush.id !== id));
  };

  // Calculate total cost across all inputs
  const calculateTotalCost = () => {
    return (syringe.cost || 0) + (spawn.cost || 0) + (bulk.cost || 0);
  };

  // Load existing grow data if editing
  useEffect(() => {
    if (!growId || !token) return;

    const fetchGrow = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${getBackendUrl()}/grows/${growId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            router.replace('/login');
          }
          throw new Error(`Failed to load grow: ${response.statusText}`);
        }

        const data = await response.json();

        // Set basic grow data
        setName(data.name || '');
        setTek(data.tek || growTeks.MONOTUB);
        setNotes(data.notes || '');

        // Here we would set the extended data if it was stored in the backend
        // For now, we'll just use default values
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        console.error('Error loading grow:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGrow();
  }, [growId, token]);

  // Save grow data
  const saveGrow = async (nextStep?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Build grow data for backend - with the updated backend schema, we can save partial data
      const growData = {
        name: name || undefined, // Let backend use defaults if empty
        tek,
        notes,
        species: syringe.species || undefined, // Let backend use defaults if empty
        variant: syringe.strain || undefined, // Let backend use defaults if empty
        cost: calculateTotalCost(),
        inoculation_date: spawn.inoculationDate?.toISOString().split('T')[0],
        harvest_date: flushes[0]?.harvestDate?.toISOString().split('T')[0] || null,
        harvest_dry_weight_grams: flushes.reduce((sum, flush) => sum + (flush.dryWeightG || 0), 0),
        harvest_wet_weight_grams: flushes.reduce((sum, flush) => sum + (flush.wetWeightG || 0), 0),
        // Determine stage based on the furthest step that has data
        stage: fruiting.startDate
          ? growStages.FRUITING
          : bulk.createdAt
            ? growStages.BULK_COLONIZATION
            : spawn.inoculationDate
              ? growStages.SPAWN_COLONIZATION
              : growStages.SPAWN_COLONIZATION,
        status: growStatuses.GROWING,
      };

      // If this is a new grow, create it in the backend
      if (!growId) {
        const response = await fetch(`${getBackendUrl()}/grows`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(growData),
        });

        if (!response.ok) {
          if (response.status === 401) {
            router.replace('/login');
          }

          const errorData = await response.json();
          console.error('API Error:', errorData);

          throw new Error(`Failed to create grow: ${response.status} ${response.statusText}`);
        }

        const savedGrow = await response.json();

        // Navigate to the next step with the new grow ID
        if (nextStep) {
          router.push({
            pathname: '/(protected)/(tabs)/grows/wizard/[step]',
            params: { step: nextStep, id: savedGrow.id },
          });
        } else {
          // Navigate back to the grows list if no next step
          router.push('/grows');
        }
      }
      // If we're editing an existing grow
      else {
        const response = await fetch(`${getBackendUrl()}/grows/${growId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(growData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('API Error:', errorData);
          throw new Error(`Failed to update grow: ${response.status} ${response.statusText}`);
        }

        // Navigate to the next step or back to the list
        if (nextStep) {
          router.push({
            pathname: '/(protected)/(tabs)/grows/wizard/[step]',
            params: { step: nextStep, id: growId },
          });
        } else {
          // Navigate back to the grows list if no next step
          router.push('/grows');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error saving grow:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete grow
  const deleteGrow = async () => {
    if (!growId || !token) return;

    setIsLoading(true);
    setError(null);

    try {
      const url = `${getBackendUrl()}/grows/${growId}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete grow: ${response.statusText}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error deleting grow:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Context value
  const value: GrowWizardContextType = {
    growId,
    name,
    setName,
    tek,
    setTek,
    notes,
    setNotes,

    syringe,
    setSyringe,
    spawn,
    setSpawn,
    bulk,
    setBulk,
    fruiting,
    setFruiting,
    flushes,
    addFlush,
    updateFlush,
    removeFlush,

    isLoading,
    error,
    saveGrow,
    deleteGrow,
    calculateTotalCost,
  };

  return <GrowWizardContext.Provider value={value}>{children}</GrowWizardContext.Provider>;
};
