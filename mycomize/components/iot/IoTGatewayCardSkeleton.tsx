import React from 'react';
import { Card } from '~/components/ui/card';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Skeleton, SkeletonText } from '~/components/ui/skeleton';

export const IoTGatewayCardSkeleton: React.FC = () => {
  return (
    <Card className="w-11/12 rounded-xl bg-background-0">
      <VStack className="flex p-2">
        <HStack className="mb-2 items-center">
          <VStack className="flex-1">
            {/* Gateway name */}
            <SkeletonText className="h-6 w-40" />
            {/* Gateway type */}
            <SkeletonText className="h-4 w-32" />
          </VStack>
          <HStack className="ml-auto items-center" space="xs">
            {/* Connection status badge */}
            <HStack className="items-center rounded-sm bg-background-100 px-3 py-1">
              <Skeleton className="mr-2 h-4 w-4 rounded" />
              <SkeletonText className="h-4 w-20" />
            </HStack>
          </HStack>
        </HStack>

        {/* Description */}
        <SkeletonText className="mb-2 h-4 w-full" />

        {/* API URL row */}
        <HStack className="mb-1 mt-1">
          <SkeletonText className="h-4 w-16" />
          <SkeletonText className="ml-auto h-4 w-32" />
        </HStack>

        {/* Grow ID row */}
        <HStack className="mb-1 mt-1">
          <SkeletonText className="h-4 w-16" />
          <SkeletonText className="ml-auto h-4 w-12" />
        </HStack>
      </VStack>
    </Card>
  );
};
