import React from 'react';
import { Icon } from '~/components/ui/icon';
import { Syringe, Wheat, Box, ShoppingBasket } from 'lucide-react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export const BulkGrowTekIcon: React.FC<{ stage: string }> = ({ stage }) => {
  switch (stage) {
    case 'inoculation':
      return <Icon className="mb-1 text-typography-400" as={Syringe} />;
    case 'spawn_colonization':
      return <Icon className="mb-1 text-typography-400" as={Wheat} />;
    case 'bulk_colonization':
      return <Icon className="mb-1 text-typography-400" as={Box} />;
    case 'fruiting':
      return (
        <MaterialCommunityIcons name="mushroom-outline" size={19} color="#888888" />
      );
    case 'harvest':
      return <Icon className="mb-1 text-typography-400" as={ShoppingBasket} />;
    default:
      return null;
  }
};
