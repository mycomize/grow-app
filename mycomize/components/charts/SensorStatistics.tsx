import React from 'react';
import { VStack } from '~/components/ui/vstack';
import { Text } from '~/components/ui/text';
import { Table, TableBody, TableRow, TableData } from '~/components/ui/table';
import { SensorStatistics as SensorStatisticsData, formatStatisticsForDisplay, StatisticItem } from '~/lib/utils/statisticsUtils';

interface SensorStatisticsProps {
  statistics: SensorStatisticsData | null;
  isLoading?: boolean;
}

/**
 * Displays sensor statistics (mean, median, min, max) using a table layout
 * Positioned below time scale selector in SensorGraph component
 */
export const SensorStatistics: React.FC<SensorStatisticsProps> = ({
  statistics, 
  isLoading = false 
}) => {
  // Don't render anything if loading or no statistics
  if (isLoading || !statistics || statistics.count === 0) {
    return null;
  }

  const statisticItems = formatStatisticsForDisplay(statistics);

  return (
    <VStack space="sm" className="px-2 pb-2">
      {/* Statistics Title - Bigger, left-aligned, with vertical margin */}
      <Text className="text-lg font-semibold text-typography-600 mb-2 mt-3">
        Statistics ({statistics.count} data points)
      </Text>
      
      {/* Statistics Table - One statistic per row */}
      <Table className="w-full">
        <TableBody>
          {statisticItems.map((item, index) => (
            <TableRow key={item.label}>
              <TableData className="py-1 px-2 font-medium text-typography-600">
                {item.label}
              </TableData>
              <TableData className="py-1 px-2 text-right text-typography-700 font-semibold">
                {item.value}
              </TableData>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </VStack>
  );
};
