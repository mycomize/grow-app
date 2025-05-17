import { InventoryItem } from '~/lib/inventory';
import { IoTGateway } from '~/lib/iot';

export interface Grow {
  id: number;
  species: string;
  variant: string;
  type: string;
  notes: string;
  inoculationDate: Date | null;
  harvestDate: Date | null;
  harvestDryWeight: number;
  harvestWetWeight: number;
  contaminated: boolean;
  inventoryList: InventoryItem[];
  iotGatewayList: IoTGateway[];
}
