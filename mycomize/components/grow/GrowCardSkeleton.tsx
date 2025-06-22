import React from 'react';
import { Card } from '~/components/ui/card';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { View } from '~/components/ui/view';
import { Skeleton, SkeletonText } from '~/components/ui/skeleton';

export const GrowCardSkeleton: React.FC = () => {
  return (
    <Card className="w-11/12 rounded-xl bg-background-0">
      <VStack className="p-2">
        {/* Header with strain and species */}
        <HStack className="mb-5 items-center justify-between">
          <SkeletonText className="h-6 w-32" />
          <SkeletonText className="h-5 w-24" />
        </HStack>

        {/* Timeline Section */}
        <VStack className="mb-5">
          {/* Timeline with circles and connecting lines */}
          <HStack className="items-center">
            {Array.from({ length: 5 }).map((_, index) => (
              <React.Fragment key={index}>
                {/* Stage indicator (circle) */}
                <View className="items-center">
                  <Skeleton className="h-6 w-6 rounded-full" />
                </View>

                {/* Connecting line (except for last stage) */}
                {index < 4 && <Skeleton className="h-0.5 flex-1" />}
              </React.Fragment>
            ))}
          </HStack>

          {/* Stage names under timeline */}
          <HStack className="mt-1">
            {Array.from({ length: 5 }).map((_, index) => {
              const isFirst = index === 0;
              const isLast = index === 4;

              return (
                <View
                  key={index}
                  className="flex-1"
                  style={{
                    alignItems: isFirst ? 'flex-start' : isLast ? 'flex-end' : 'center',
                  }}>
                  <SkeletonText className="h-4 w-16" />
                </View>
              );
            })}
          </HStack>
        </VStack>

        {/* IoT Gateways Section */}
        <VStack className="mb-3" space="xs">
          <SkeletonText className="mb-1 h-5 w-28" />
          <VStack
            space="xs"
            className="rounded-lg border border-background-200 bg-background-0 p-3">
            <HStack className="items-center justify-between">
              <HStack space="sm" className="items-center">
                <Skeleton className="h-6 w-6 rounded" />
                <SkeletonText className="h-4 w-24" />
              </HStack>
              <SkeletonText className="h-4 w-20" />
            </HStack>
            <SkeletonText className="h-3 w-40" />
          </VStack>
        </VStack>

        {/* Stats Row */}
        <HStack className="mt-2">
          {/* Age */}
          <HStack
            space="xs"
            className="items-center rounded-sm border border-background-200 bg-background-50 px-2 py-1">
            <Skeleton className="h-4 w-4 rounded" />
            <SkeletonText className="h-4 w-12" />
          </HStack>

          {/* Cost */}
          <HStack
            space="xs"
            className="ml-3 items-center rounded-sm border border-background-200 bg-background-50 px-2 py-1">
            <Skeleton className="h-4 w-4 rounded" />
            <SkeletonText className="h-4 w-10" />
          </HStack>
        </HStack>
      </VStack>
    </Card>
  );
};
