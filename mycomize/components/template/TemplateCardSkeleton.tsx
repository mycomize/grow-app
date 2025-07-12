import React from 'react';
import { Card } from '~/components/ui/card';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { View } from '~/components/ui/view';
import { Skeleton, SkeletonText } from '~/components/ui/skeleton';

export const TemplateCardSkeleton: React.FC = () => {
  return (
    <Card className="w-11/12 rounded-xl bg-background-0 p-2">
      <VStack className="p-2">
        <View>
          {/* Header with avatar and creator name */}
          <HStack className="mb-5 items-center" space="sm">
            <Skeleton className="h-12 w-12 rounded-full" />
            <SkeletonText className="h-5 w-24" />
            <View className="ml-auto">
              <SkeletonText className="h-4 w-20" />
              <SkeletonText className="mt-1 h-4 w-16" />
            </View>
          </HStack>

          {/* Template name and privacy/type info */}
          <HStack className="mb-2 items-center">
            <Skeleton className="h-6 w-6 rounded" />
            <SkeletonText className="ml-2 h-5 w-32" />
            <View className="ml-auto">
              <SkeletonText className="h-5 w-16" />
            </View>
          </HStack>

          {/* Description */}
          <HStack className="mb-2 items-center">
            <SkeletonText className="h-4 w-full" />
          </HStack>
          <HStack className="mb-4 items-center">
            <SkeletonText className="h-4 w-3/4" />
          </HStack>

          {/* Tags section */}
          <VStack className="mb-4" space="xs">
            <HStack space="xs" className="flex-wrap items-center">
              <Skeleton className="h-4 w-4 rounded" />
              <SkeletonText className="h-5 w-16" />
              <SkeletonText className="h-5 w-20" />
              <SkeletonText className="h-5 w-14" />
            </HStack>
          </VStack>

          {/* Action controls */}
          <HStack className="mt-1 justify-around" space="md">
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-6 w-6 rounded" />
            <Skeleton className="h-6 w-6 rounded" />
          </HStack>
        </View>
      </VStack>
    </Card>
  );
};
