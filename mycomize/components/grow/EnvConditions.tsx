import React from 'react';
import useState from 'react';

import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';

interface EnvConditionsProps {
  name?: string;
  type?: string;
  value?: number;
  unit?: string;
}

export const EnvConditionsView: React.FC<EnvConditionsProps> = ({ name, type, value, unit }) => {
  return <VStack className="w-full space-y-2"></VStack>;
};
