import React from 'react';
import { Icon } from '~/components/ui/icon';
import { Syringe, Wheat, Box, ShoppingBasket } from 'lucide-react-native';
import MushroomIcon from '~/components/icons/MushroomIcon';

interface MonotubTekIconProps {
  stage: string;
}

export const MonotubTekIcon: React.FC<{ stage: string }> = ({ stage }) => {
  switch (stage) {
    case 'inoculation':
      return <Icon className="text-typography-400" as={Syringe} />;
    case 'spawnColonization':
      return <Icon className="text-typography-400" as={Wheat} />;
    case 'bulkColonization':
      return <Icon className="text-typography-400" as={Box} />;
    case 'fruiting':
      return <MushroomIcon height={18} width={18} strokeWidth={2} color="#888888" />;
    case 'harvest':
      return <Icon className="text-typography-400" as={ShoppingBasket} />;
    default:
      return null;
  }
};
