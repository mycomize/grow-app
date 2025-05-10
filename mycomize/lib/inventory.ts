import { getBackendUrl } from './backendUrl';

export interface InventoryItem {
  type: 'Syringe' | 'Spawn' | 'Bulk' | '';
  id: number;
  source: string;
  source_date: Date;
  expiration_date: Date;
  cost: number;
  notes: string;
}

export type SyringeItem = InventoryItem & {
  syringe_type: string;
  volume_ml: number;
  species: string;
  variant: string;
};

export type SpawnItem = InventoryItem & {
  spawn_type: string;
  amount_lbs: number;
};

export type BulkItem = InventoryItem & {
  bulk_type: string;
  amount_lbs: number;
};

export async function getInventoryItem(id: number) {
  const url = `${getBackendUrl()}/inventory/${id}/`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    throw error;
  }
}
