import React from 'react';
import useState from 'react';

import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';

interface MaterialsProps {
  description?: string;
  vendor?: string;
  quantity?: number;
  url?: string;
}

export const MaterialsView: React.FC<MaterialsProps> = ({ description, vendor, quantity, url }) => {
  return (
    <VStack className="w-full space-y-2">
      <HStack>
        <Text className="text-md text-typography-600">Description:</Text>
        <Text className="text-md ml-auto text-typography-600">{description}</Text>
      </HStack>
      <HStack>
        <Text className="text-md text-typography-600">Vendor:</Text>
        <Text className="text-md ml-auto text-typography-600">{vendor}</Text>
      </HStack>
      <HStack>
        <Text className="text-md text-typography-600">Quantity:</Text>
        <Text className="text-md ml-auto text-typography-600">{quantity}</Text>
      </HStack>
      <HStack>
        <Text className="text-md text-typography-600">URL:</Text>
        <Text className="text-md ml-auto text-typography-600">{url}</Text>
      </HStack>
    </VStack>
  );
};
