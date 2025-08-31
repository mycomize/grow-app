import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Spinner } from '~/components/ui/spinner';
import { Card } from '~/components/ui/card';
import { Icon } from '~/components/ui/icon';
import { Button } from '~/components/ui/button';
import { AlertCircle, Thermometer, Droplet, Activity, Clock } from 'lucide-react-native';
import { IoTGateway } from '~/lib/iot/iot';
import { Grow } from '~/lib/types/growTypes';
import { useEntityStore } from '~/lib/stores/iot/entityStore';
import { sensorHistoryCache } from '~/lib/iot/cache/SensorHistoryCache';
import { calculateTimeRange, convertHADataToCachedFormat } from '~/lib/iot/cache/utils';
import { TimeScale } from '~/lib/iot/cache/types';

// TypeScript interface for sensor metadata
interface SensorMetadata {
  growName: string;
  growStage: string;
  friendlyName: string;
  currentValue: string;
  deviceClass: string;
  lastUpdated: string;
  unitOfMeasurement?: string;
}

interface SensorData {
  entity_id: string;
  friendly_name: string;
  unit_of_measurement?: string;
  data: Array<{
    value: number;
    label?: string;
    dataPointText?: string;
    dataPointLabelComponent?: () => React.ReactElement;
  }>;
  color: string;
  lastValue: number;
}

interface SensorGraphProps {
  gateway: IoTGateway;
  sensorEntityId?: string; // Optional: if provided, show only this sensor
  grow?: Grow; // Optional: if provided, use inoculation date and stage data
  sensorMetadata?: SensorMetadata | null; // Optional: sensor metadata for header display
  stageStartDate?: string; // Optional: stage start date for STAGE time scale
}

// Inline sensor header component
interface SensorHeaderProps {
  sensorMetadata: SensorMetadata;
}

function getDeviceClassIcon(device_class: string) {
    if (device_class === 'temperature') {
        return Thermometer;
    }
    
    if (device_class === 'humidity') {
        return Droplet;
    }
    
    return Activity;
}

const SensorHeader: React.FC<SensorHeaderProps> = ({ sensorMetadata }) => {
  const formatStateValue = (value: string): string => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      // Format to max 2 decimal places, removing trailing zeros
      return parseFloat(numValue.toFixed(2)).toString();
    }
    return value;
  };

  return (
    <VStack space="sm" className="p-2 pb-0">
      {/* Title bar - friendly name, current value*/}
      <HStack className="items-center justify-between">
        <Text className="text-xl font-medium text-typography-600">{sensorMetadata.friendlyName}</Text>
        <HStack className="ml-auto items-center" space="sm">
          <Text className="text-xl font-bold text-typography-600">{formatStateValue(sensorMetadata.currentValue)}</Text>
          {sensorMetadata.unitOfMeasurement && (
            <Text className="text-lg text-typography-500">{sensorMetadata.unitOfMeasurement}</Text>
          )}
        </HStack>
      </HStack>
      <HStack className="items-center mt-2" space="md">
        <Icon as={getDeviceClassIcon(sensorMetadata.deviceClass)} className="text-typography-500" size="md"/>
        <Text className="text-md text-typography-500 capitalize">{sensorMetadata.deviceClass} sensor</Text>
      </HStack>
      <HStack className="items-center mt-1" space="md">
        <Icon as={Clock} className="text-typography-500" size="md"/>
        <Text className="text-md text-typography-500">
          Last Updated: {sensorMetadata.lastUpdated}
        </Text>
      </HStack>

      {/* Grow Information */}
      <HStack className="flex-1 items-center mt-4" space="xs">
        <Text className="text-lg text-typography-600">Grow:</Text>
        <Text className="text-lg font-medium text-typography-600">{sensorMetadata.growName}</Text>
        <Text className="ml-auto text-md text-typography-500 italic">{sensorMetadata.growStage}</Text>
      </HStack>

    </VStack>
  );
};


// Color palette for multiple sensors
const SENSOR_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#FFA07A',
  '#98D8C8',
  '#6C5CE7',
  '#FECA57',
  '#48DBFB',
];

export const SensorGraph: React.FC<SensorGraphProps> = ({ gateway, sensorEntityId, grow, sensorMetadata, stageStartDate }) => {
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [selectedTimeScale, setSelectedTimeScale] = useState<TimeScale>('1D');

  // Zustand store hooks
  const entityStates = useEntityStore((state) => state.entityStates);

  const chartWidth = useMemo(() => screenWidth - 100, [screenWidth]);

  // Memoize expensive y-axis calculations (must be before any conditional returns)
  const { yMin } = useMemo(() => {
    if (sensorData.length === 0) return { yMin: 0, yMax: 30, stepHeight: 6 };

    const allValues = sensorData.flatMap((sensor) => sensor.data.map((d) => d.value));
    const dataMin = Math.min(...allValues);
    const dataMax = Math.max(...allValues);
    const yAxisRange = dataMax - dataMin;

    // Add reasonable padding (5% of range or at least 0.5 degrees)
    const padding = Math.max(yAxisRange * 0.05, 0.5);
    const yMin = Math.floor(dataMin - padding);
    const yMax = Math.ceil(dataMax + padding);

    // Calculate step height for y-axis
    const stepHeight = Math.ceil((yMax - yMin) / 5);

    return { yMin, yMax, stepHeight };
  }, [sensorData]);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });
    return () => subscription?.remove();
  }, []);

  const fetchSensorHistory = useCallback(
    async (timeScale: TimeScale = selectedTimeScale) => {
      setIsLoading(true);
      setError(null);

      try {
        let sensorsToFetch: any[] = [];

        if (sensorEntityId) {
          // Get current sensor state from zustand store instead of API call
          const sensorState = entityStates[sensorEntityId];
          
          if (sensorState && sensorState.state !== 'unavailable' && sensorState.state !== 'unknown') {
            sensorsToFetch = [sensorState];
          } else {
            // Fallback: fetch from API if not in store
            const stateResponse = await fetch(`${gateway.api_url}/api/states/${sensorEntityId}`, {
              headers: {
                Authorization: `Bearer ${gateway.api_key}`,
                'Content-Type': 'application/json',
              },
            });

            if (stateResponse.ok) {
              const apiSensorState = await stateResponse.json();
              if (apiSensorState.state !== 'unavailable' && apiSensorState.state !== 'unknown') {
                sensorsToFetch = [apiSensorState];
              }
            }
          }
        }

        if (sensorsToFetch.length === 0) {
          setError('Sensor not found or unavailable');
          setIsLoading(false);
          return;
        }

        // Calculate time range using cache utility for consistency
        const timeRange = calculateTimeRange(
          timeScale, 
          new Date(), 
          grow?.inoculation_date,
          stageStartDate
        );

        // Initialize cache system
        await sensorHistoryCache.initialize();

        // Process each sensor with cache-first approach
        const historyPromises = sensorsToFetch.map(async (sensor: any, index: number) => {
          console.log(`[SensorGraph] Processing sensor ${sensor.entity_id} with cache-first approach`);

          // Step 1: Query cache for existing data
          const cacheResult = await sensorHistoryCache.getCachedData(sensor.entity_id, timeRange);
          
          let allHistoryData: any[] = [];
          
          // Step 2: Check if we need to fetch additional data from API
          if (cacheResult.needsFetch && cacheResult.fetchRange) {
            console.log(`[SensorGraph] Cache hit ratio: ${(cacheResult.cacheHitRatio * 100).toFixed(1)}% - fetching additional data`);
            console.log(`[SensorGraph] Fetch range: ${cacheResult.fetchRange.start.toISOString()} to ${cacheResult.fetchRange.end.toISOString()}`);
            console.log(`[SensorGraph] Cached data points: ${cacheResult.cachedData.length}`);
            
            // Fetch only the missing time range (differential loading)
            const historyUrl = `${gateway.api_url}/api/history/period/${cacheResult.fetchRange.start.toISOString()}?filter_entity_id=${sensor.entity_id}&end_time=${cacheResult.fetchRange.end.toISOString()}&minimal_response&no_attributes`;
            console.log(`[SensorGraph] API URL: ${historyUrl}`);

            const historyResponse = await fetch(historyUrl, {
              headers: {
                Authorization: `Bearer ${gateway.api_key}`,
                'Content-Type': 'application/json',
              },
            });

            console.log(`[SensorGraph] API Response status: ${historyResponse.status} ${historyResponse.statusText}`);
            
            if (historyResponse.ok) {
              const freshHistoryData = await historyResponse.json();
              console.log(`[SensorGraph] Fresh API data points: ${freshHistoryData?.[0]?.length || 0}`);
              
              // If no data returned, try a smaller time range to test Home Assistant's limits
              if (!freshHistoryData || !freshHistoryData[0] || freshHistoryData[0].length === 0) {
                console.warn(`[SensorGraph] No data returned for range ${cacheResult.fetchRange.start.toISOString()} to ${cacheResult.fetchRange.end.toISOString()}`);
                console.log(`[SensorGraph] This may indicate Home Assistant's history retention limit has been exceeded`);
                
                // Try a test query for just the last 48 hours to see if API is working
                const testStart = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
                const testEnd = new Date().toISOString();
                const testUrl = `${gateway.api_url}/api/history/period/${testStart}?filter_entity_id=${sensor.entity_id}&end_time=${testEnd}&minimal_response&no_attributes`;
                
                try {
                  const testResponse = await fetch(testUrl, {
                    headers: {
                      Authorization: `Bearer ${gateway.api_key}`,
                      'Content-Type': 'application/json',
                    },
                  });
                  
                  if (testResponse.ok) {
                    const testData = await testResponse.json();
                    console.log(`[SensorGraph] Test query (last 48h) returned: ${testData?.[0]?.length || 0} points`);
                  }
                } catch (testError) {
                  console.warn(`[SensorGraph] Test query failed:`, testError);
                }
              }
              
              if (freshHistoryData && freshHistoryData[0]) {
                // Step 3: Merge cached and fresh data using cache utility
                const mergedData = await sensorHistoryCache.mergeCachedAndFreshData(
                  sensor.entity_id,
                  cacheResult.cachedData,
                  freshHistoryData[0]
                );
                console.log(`[SensorGraph] Merged data points: ${mergedData.length}`);

                // Step 4: Update cache with new data
                const freshCachedData = convertHADataToCachedFormat(freshHistoryData[0]);
                if (freshCachedData.length > 0) {
                  await sensorHistoryCache.cacheData(
                    sensor.entity_id,
                    gateway.id,
                    freshCachedData,
                    {
                      unit_of_measurement: sensor.attributes.unit_of_measurement,
                      device_class: sensor.attributes.device_class,
                      friendly_name: sensor.attributes.friendly_name,
                    }
                  );
                }

                // Convert merged cache format back to chart format
                allHistoryData = mergedData.map((point: any) => ({
                  last_changed: point.timestamp,
                  state: point.state,
                }));
                console.log(`[SensorGraph] Final allHistoryData points: ${allHistoryData.length}`);
                
                // Debug: check date range of final data
                if (allHistoryData.length > 0) {
                  const sortedData = allHistoryData.sort((a: any, b: any) => new Date(a.last_changed).getTime() - new Date(b.last_changed).getTime());
                  console.log(`[SensorGraph] Data range: ${sortedData[0].last_changed} to ${sortedData[sortedData.length - 1].last_changed}`);
                }
              } else {
                console.log(`[SensorGraph] No fresh data from API, using cached data only`);
                // No fresh data, use cached data only
                allHistoryData = cacheResult.cachedData.map((point: any) => ({
                  last_changed: point.timestamp,
                  state: point.state,
                }));
              }
            } else {
              const errorText = await historyResponse.text();
              console.error(`[SensorGraph] API Error ${historyResponse.status}: ${errorText}`);
              console.warn(`[SensorGraph] Failed to fetch additional data for ${sensor.entity_id}, using cache only`);
              // API failed, use cached data only
              allHistoryData = cacheResult.cachedData.map((point: any) => ({
                last_changed: point.timestamp,
                state: point.state,
              }));
            }
          } else {
            console.log(`[SensorGraph] Cache hit ratio: ${(cacheResult.cacheHitRatio * 100).toFixed(1)}% - using cache only`);
            // Use cached data only
            allHistoryData = cacheResult.cachedData.map((point: any) => ({
              last_changed: point.timestamp,
              state: point.state,
            }));
          }

          // Handle case where no data is available at all
          if (allHistoryData.length === 0) {
            console.log(`[SensorGraph] No data available for ${sensor.entity_id}, falling back to direct API call`);
            
            // Fallback: direct API call for the full range (original behavior)
            const fallbackUrl = `${gateway.api_url}/api/history/period/${timeRange.start.toISOString()}?filter_entity_id=${sensor.entity_id}&end_time=${timeRange.end.toISOString()}&minimal_response&no_attributes`;
            
            const fallbackResponse = await fetch(fallbackUrl, {
              headers: {
                Authorization: `Bearer ${gateway.api_key}`,
                'Content-Type': 'application/json',
              },
            });

            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              if (fallbackData && fallbackData[0]) {
                allHistoryData = fallbackData[0];
                
                // Cache this data for future use
                const cachedData = convertHADataToCachedFormat(fallbackData[0]);
                if (cachedData.length > 0) {
                  await sensorHistoryCache.cacheData(
                    sensor.entity_id,
                    gateway.id,
                    cachedData,
                    {
                      unit_of_measurement: sensor.attributes.unit_of_measurement,
                      device_class: sensor.attributes.device_class,
                      friendly_name: sensor.attributes.friendly_name,
                    }
                  );
                }
              }
            }
          }

          if (allHistoryData.length === 0) {
            console.warn(`[SensorGraph] No history data found for ${sensor.entity_id}`);
            return null;
          }

          // Process history data (same as before)
          const processedData = allHistoryData
            .filter((point: any) => {
              const value = parseFloat(point.state);
              return !isNaN(value) && point.state !== 'unavailable' && point.state !== 'unknown';
            })
            .map((point: any) => ({
              time: new Date(point.last_changed),
              value: parseFloat(point.state),
            }))
            .sort((a: any, b: any) => a.time.getTime() - b.time.getTime());
            
          console.log(`[SensorGraph] Processed data points: ${processedData.length}`);
          if (processedData.length > 0) {
            console.log(`[SensorGraph] Processed data range: ${processedData[0].time.toISOString()} to ${processedData[processedData.length - 1].time.toISOString()}`);
          }

          // Sample data based on actual data range to achieve ~150 data points
          // Calculate sampling interval dynamically based on available data
          let samplingInterval: number;
          
          if (processedData.length > 0) {
            // Calculate actual data duration in minutes
            const actualStartTime = processedData[0].time.getTime();
            const actualEndTime = processedData[processedData.length - 1].time.getTime();
            const actualDurationMinutes = (actualEndTime - actualStartTime) / (1000 * 60);
            
            // Target ~150 points, but with sensible min/max intervals
            const targetPoints = 150;
            const calculatedInterval = Math.floor(actualDurationMinutes / targetPoints);
            
            // Apply time scale constraints for performance and data quality
            switch (timeScale) {
              case '1D':
                samplingInterval = Math.max(5, Math.min(calculatedInterval, 15)); // 5-15 min range
                break;
              case '1W':
                samplingInterval = Math.max(30, Math.min(calculatedInterval, 120)); // 30min-2hr range
                break;
              case '1M':
                samplingInterval = Math.max(60, Math.min(calculatedInterval, 360)); // 1-6hr range
                break;
              case 'STAGE':
                samplingInterval = Math.max(10, Math.min(calculatedInterval, 480)); // 10min-8hr range
                break;
              default:
                samplingInterval = Math.max(10, calculatedInterval);
            }
            
            console.log(`[SensorGraph] Actual data duration: ${(actualDurationMinutes / 60).toFixed(1)}h, calculated interval: ${calculatedInterval}min, final interval: ${samplingInterval}min`);
          } else {
            // Fallback intervals if no processed data
            switch (timeScale) {
              case '1D': samplingInterval = 10; break;
              case '1W': samplingInterval = 70; break;
              case '1M': samplingInterval = 300; break;
              case 'STAGE': samplingInterval = 240; break;
              default: samplingInterval = 10;
            }
          }

          const sampledData = sampleDataEveryNMinutes(processedData, samplingInterval);
          console.log(`[SensorGraph] Sampled data points (${samplingInterval}min interval): ${sampledData.length}`);

          // Format data for gifted-charts with x-axis labels
          const chartData = sampledData.map((point: { time: Date; value: number }, idx: number) => {
            const date = point.time;

            return {
              value: point.value,
              label: '',
              labelTextStyle: { color: '#6B7280', fontSize: 10, textAlign: 'center' },
              timeString: formatFullTimeLabel(date), // Store formatted time string instead of Date object
            };
          });
          
          console.log(`[SensorGraph] Final chart data points: ${chartData.length}`);

          return {
            entity_id: sensor.entity_id,
            friendly_name: sensor.attributes.friendly_name || sensor.entity_id,
            unit_of_measurement: sensor.attributes.unit_of_measurement,
            data: chartData,
            color: SENSOR_COLORS[index % SENSOR_COLORS.length],
            lastValue: processedData[processedData.length - 1]?.value || 0,
          };
        });

        const results = await Promise.all(historyPromises);
        const validResults = results.filter(
          (result) => result !== null && result!.data.length > 0
        ) as SensorData[];

        setSensorData(validResults);
      } catch (err) {
        console.error('Error fetching sensor history:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch sensor data');
      } finally {
        setIsLoading(false);
      }
    },
    [gateway.api_url, gateway.api_key, gateway.id, sensorEntityId, grow?.inoculation_date]
  );

  useEffect(() => {
    if (gateway.type === 'home_assistant') {
      fetchSensorHistory(selectedTimeScale);
    }
  }, [gateway.type, fetchSensorHistory, selectedTimeScale]);

  // Sample data every N minutes
  const sampleDataEveryNMinutes = (
    data: Array<{ time: Date; value: number }>,
    intervalMinutes: number
  ): Array<{ time: Date; value: number }> => {
    if (data.length === 0) return [];

    const result = [data[0]]; // Always include first point
    let lastSampledTime = data[0].time.getTime();

    for (let i = 1; i < data.length; i++) {
      const currentTime = data[i].time.getTime();
      const timeDiff = (currentTime - lastSampledTime) / (1000 * 60); // in minutes

      if (timeDiff >= intervalMinutes) {
        result.push(data[i]);
        lastSampledTime = currentTime;
      }
    }

    // Always include the last point if it's not already included
    if (result[result.length - 1] !== data[data.length - 1]) {
      result.push(data[data.length - 1]);
    }

    return result;
  };

  const formatFullTimeLabel = useCallback((date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();

    const formatted = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    return `${formatted} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }, []);

  const pointerLabelComponent = useCallback(
    (items: any) => {
      const pointData = items[0];
      if (!pointData) return null;

      // Use the pre-formatted time string
      const timeLabel = pointData.timeString || '';

      // Get the unit of measurement from the first sensor (primary sensor)
      const unitOfMeasurement = sensorData.length > 0 ? sensorData[0].unit_of_measurement : '';
      const unitSuffix = unitOfMeasurement ? unitOfMeasurement : '';

      return (
        <View
          style={{
            backgroundColor: '#1F2937',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8,
            minWidth: 80,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
          }}>
          <Text
            style={{
              color: '#FFF',
              fontSize: 11,
              fontWeight: '600',
              textAlign: 'center',
            }}>
            {timeLabel}
          </Text>
          <Text
            style={{
              color: '#FFF',
              fontSize: 13,
              fontWeight: '700',
              marginTop: 2,
              textAlign: 'center',
            }}>
            {pointData.value.toFixed(1)}
            {unitSuffix}
          </Text>
        </View>
      );
    },
    [sensorData]
  );

  const formatYLabel = useCallback(
    (label: string | number) => {
      const unitOfMeasurement = sensorData.length > 0 ? sensorData[0].unit_of_measurement : '';
      const unitSuffix = unitOfMeasurement ? unitOfMeasurement : '';

      if (typeof label === 'string') {
        const num = parseFloat(label);
        return isNaN(num) ? label : `${num}${unitSuffix}  `;
      }
      return `${label}${unitSuffix}  `;
    },
    [sensorData]
  );

  const pointerConfig = useMemo(
    () => ({
      pointerStripHeight: 250,
      pointerStripColor: '#94A3B8',
      pointerStripWidth: 2,
      showPointerStrip: true,
      pointerColor: '#94A3B8',
      radius: 4,
      pointerLabelWidth: 100,
      pointerLabelHeight: 60,
      activatePointersOnLongPress: false,
      autoAdjustPointerLabelPosition: true,
      pointerLabelComponent: pointerLabelComponent,
    }),
    [pointerLabelComponent]
  );


  // Render the main component structure
  const renderGraphArea = () => {
    if (isLoading) {
      return (
        <VStack className="items-center justify-center py-16" space="md" style={{ height: 250 }}>
          <Spinner size="large" />
          <Text className="text-typography-500">Loading sensor data...</Text>
        </VStack>
      );
    }

    if (error) {
      return (
        <VStack className="items-center justify-center py-16" space="sm" style={{ height: 250 }}>
          <Icon as={AlertCircle} className="text-error-600" size="lg" />
          <Text className="text-error-700 text-center">{error}</Text>
        </VStack>
      );
    }

    if (sensorData.length === 0) {
      return (
        <VStack className="items-center justify-center py-16" space="sm" style={{ height: 250 }}>
          <Icon as={Thermometer} className="text-typography-400" size="lg" />
          <Text className="text-center text-typography-500">
            No temperature sensor data available for the selected time period
          </Text>
        </VStack>
      );
    }

    return (
      <View style={{ width: chartWidth, alignSelf: 'flex-start' }} className="mx-auto">
        <LineChart
          data={sensorData[0].data}
          data2={sensorData[1]?.data}
          data3={sensorData[2]?.data}
          data4={sensorData[3]?.data}
          color={sensorData[0].color}
          color2={sensorData[1]?.color}
          color3={sensorData[2]?.color}
          color4={sensorData[3]?.color}
          thickness={2}
          thickness2={2}
          thickness3={2}
          thickness4={2}
          width={chartWidth}
          height={250}
          adjustToWidth
          yAxisLabelWidth={30}
          yAxisOffset={yMin - 2}
          formatYLabel={formatYLabel}
          yAxisTextStyle={{ color: '#9F9F9F', fontSize: 10 }}
          showXAxisIndices={false}
          showFractionalValues={false}
          yAxisColor="#E5E7EB"
          xAxisColor="#E5E7EB"
          hideRules
          dataPointsRadius={0}
          hideDataPoints
          curved
          animateOnDataChange
          animationDuration={750}
          spacing={Math.max(2, (chartWidth - 120) / Math.max(1, sensorData[0].data.length - 1))}
          initialSpacing={10}
          endSpacing={10}
          hideYAxisText={false}
          yAxisThickness={1}
          xAxisThickness={1}
          xAxisLength={320}
          xAxisLabelsVerticalShift={-5}
          hideOrigin
          // Disable default strip, only use pointer
          focusEnabled={false}
          showStripOnFocus={false}
          pointerConfig={pointerConfig}
        />
      </View>
    );
  };

  return (
    <Card className="bg-background-0">
      <VStack space="md">
        {/* Sensor Metadata Header - Always visible */}
        {sensorMetadata && <SensorHeader sensorMetadata={sensorMetadata} />}
        
        {/* Graph Area - Shows spinner, error, or chart */}
        <View className={`${sensorMetadata ? 'mt-4' : 'mt-6'}`}>
          {renderGraphArea()}
        </View>

        {/* Time Scale Selector - Always visible */}
        <HStack space="sm" className="justify-center pb-4">
          {(() => {
            // Build array of available time scales
            const baseScales: TimeScale[] = ['1D', '1W', '1M'];
            // Add STAGE button only if stageStartDate is provided
            if (stageStartDate) {
              baseScales.push('STAGE');
            }
            return baseScales;
          })().map((timeScale) => (
            <Button
              key={timeScale}
              size="sm"
              variant={selectedTimeScale === timeScale ? 'solid' : 'outline'}
              action={selectedTimeScale === timeScale ? 'positive' : 'secondary'}
              onPress={() => setSelectedTimeScale(timeScale)}
              disabled={isLoading}
              className={
                selectedTimeScale === timeScale ? 'min-w-16' : 'min-w-16 border-typography-200'
              }>
              <Text
                className={`text-sm font-medium ${
                  selectedTimeScale === timeScale ? 'text-white' : 'text-typography-600'
                }`}>
                {timeScale}
              </Text>
            </Button>
          ))}
        </HStack>
      </VStack>
    </Card>
  );
};
