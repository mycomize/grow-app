import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Dimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Spinner } from '~/components/ui/spinner';
import { Card } from '~/components/ui/card';
import { Icon } from '~/components/ui/icon';
import { AlertCircle, Thermometer } from 'lucide-react-native';
import { IoTGateway } from '~/lib/iot';

interface SensorData {
  entity_id: string;
  friendly_name: string;
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
}

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

export const SensorGraph: React.FC<SensorGraphProps> = ({ gateway }) => {
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

  const chartWidth = useMemo(() => screenWidth - 100, [screenWidth]);

  // Memoize expensive y-axis calculations (must be before any conditional returns)
  const { yMin, yMax, stepHeight } = useMemo(() => {
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

  const fetchSensorHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // First, fetch all entities to find temperature sensors
      const statesResponse = await fetch(`${gateway.api_url}/api/states`, {
        headers: {
          Authorization: `Bearer ${gateway.api_key}`,
          'Content-Type': 'application/json',
        },
      });

      if (!statesResponse.ok) {
        throw new Error('Failed to fetch states from Home Assistant');
      }

      const states = await statesResponse.json();

      // Filter for temperature sensors
      const temperatureSensors = states.filter((state: any) => {
        return (
          state.entity_id.startsWith('sensor.') &&
          state.attributes.device_class === 'temperature' &&
          state.state !== 'unavailable' &&
          state.state !== 'unknown'
        );
      });

      if (temperatureSensors.length === 0) {
        setError('No temperature sensors found');
        setIsLoading(false);
        return;
      }

      // Calculate time range (past 24 hours)
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

      // Fetch history for each temperature sensor
      const historyPromises = temperatureSensors.map(async (sensor: any, index: number) => {
        const historyUrl = `${gateway.api_url}/api/history/period/${startTime.toISOString()}?filter_entity_id=${sensor.entity_id}&end_time=${endTime.toISOString()}`;

        const historyResponse = await fetch(historyUrl, {
          headers: {
            Authorization: `Bearer ${gateway.api_key}`,
            'Content-Type': 'application/json',
          },
        });

        if (!historyResponse.ok) {
          console.error(`Failed to fetch history for ${sensor.entity_id}`);
          return null;
        }

        const historyData = await historyResponse.json();

        if (!historyData || !historyData[0] || historyData[0].length === 0) {
          return null;
        }

        // Process history data
        const processedData = historyData[0]
          .filter((point: any) => {
            const value = parseFloat(point.state);
            return !isNaN(value) && point.state !== 'unavailable' && point.state !== 'unknown';
          })
          .map((point: any) => ({
            time: new Date(point.last_changed),
            value: parseFloat(point.state),
          }))
          .sort((a: any, b: any) => a.time.getTime() - b.time.getTime());

        // Sample data every 10 minutes for better performance while maintaining data coverage
        const sampledData = sampleDataEveryNMinutes(processedData, 10);

        // Format data for gifted-charts with x-axis labels
        const chartData = sampledData.map((point: { time: Date; value: number }, idx: number) => {
          const date = point.time;
          const hours = date.getHours();

          // Show labels at regular intervals
          const labelInterval = Math.max(1, Math.floor(sampledData.length / 5)); // Show about 5 labels
          const showLabel =
            idx === 0 || idx === sampledData.length - 1 || (idx > 0 && idx % labelInterval === 0);

          return {
            value: point.value,
            label: showLabel ? formatTimeLabel(date) : '',
            labelTextStyle: { color: '#6B7280', fontSize: 10, textAlign: 'center' },
            timeString: formatTimeLabel(date), // Store formatted time string instead of Date object
          };
        });

        return {
          entity_id: sensor.entity_id,
          friendly_name: sensor.attributes.friendly_name || sensor.entity_id,
          data: chartData,
          color: SENSOR_COLORS[index % SENSOR_COLORS.length],
          lastValue: processedData[processedData.length - 1]?.value || 0,
        };
      });

      const results = await Promise.all(historyPromises);
      const validResults = results.filter(
        (result): result is SensorData => result !== null && result.data.length > 0
      );

      setSensorData(validResults);
    } catch (err) {
      console.error('Error fetching sensor history:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sensor data');
    } finally {
      setIsLoading(false);
    }
  }, [gateway.api_url, gateway.api_key]);

  useEffect(() => {
    if (gateway.type === 'home_assistant' && gateway.is_active) {
      fetchSensorHistory();
    }
  }, [gateway.type, gateway.is_active, fetchSensorHistory]);

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

  const formatTimeLabel = useCallback((date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }, []);

  const pointerLabelComponent = useCallback((items: any) => {
    const pointData = items[0];
    if (!pointData) return null;

    // Use the pre-formatted time string
    const timeLabel = pointData.timeString || '';

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
          {pointData.value.toFixed(1)}°
        </Text>
      </View>
    );
  }, []);

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

  if (!gateway.is_active) {
    return (
      <Card className="bg-background-50 p-4">
        <HStack className="items-center" space="sm">
          <Icon as={AlertCircle} className="text-warning-600" size="sm" />
          <Text className="text-typography-600">Gateway is not active</Text>
        </HStack>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-background-0 p-4">
        <VStack className="items-center py-8" space="md">
          <Spinner size="large" />
          <Text className="text-typography-500">Loading sensor data...</Text>
        </VStack>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-background-0 p-4">
        <HStack className="items-center" space="sm">
          <Icon as={AlertCircle} className="text-error-600" size="sm" />
          <Text className="text-error-700">{error}</Text>
        </HStack>
      </Card>
    );
  }

  if (sensorData.length === 0) {
    return (
      <Card className="bg-background-50 p-4">
        <VStack className="items-center py-4" space="sm">
          <Icon as={Thermometer} className="text-typography-400" size="lg" />
          <Text className="text-center text-typography-500">
            No temperature sensor data available for the past 24 hours
          </Text>
        </VStack>
      </Card>
    );
  }

  return (
    <Card className="bg-background-0">
      <VStack space="md">
        <HStack className="items-center" space="sm">
          <Icon as={Thermometer} className="text-primary-600" size="sm" />
          <Text className="text-lg font-semibold">Temperature Sensors (24h)</Text>
        </HStack>

        <View style={{ width: chartWidth, alignSelf: 'flex-start' }}>
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
            yAxisLabelWidth={25}
            yAxisOffset={yMin - 2}
            formatYLabel={(label) => {
              if (typeof label === 'string') {
                const num = parseFloat(label);
                return isNaN(num) ? label : `${num}°`;
              }
              return `${label}°`;
            }}
            yAxisTextStyle={{ color: '#9F9F9F', fontSize: 12 }}
            xAxisLabelTextStyle={{ color: '#9F9F9F', fontSize: 10 }}
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
            yAxisLabelSuffix=""
            spacing={Math.max(2, (chartWidth - 120) / Math.max(1, sensorData[0].data.length - 1))}
            initialSpacing={10}
            endSpacing={10}
            hideYAxisText={false}
            yAxisThickness={1}
            xAxisThickness={1}
            xAxisLength={310}
            hideOrigin
            // Disable default strip, only use pointer
            focusEnabled={false}
            showStripOnFocus={false}
            pointerConfig={pointerConfig}
          />
        </View>

        {/* Legend */}
        <VStack space="xs">
          {sensorData.map((sensor) => (
            <HStack key={sensor.entity_id} className="items-center" space="sm">
              <View
                style={{
                  width: 12,
                  height: 12,
                  backgroundColor: sensor.color,
                  borderRadius: 6,
                }}
              />
              <Text className="text-sm text-typography-600">{sensor.friendly_name}</Text>
              <Text className="text-sm text-typography-500">({sensor.lastValue.toFixed(1)}°)</Text>
            </HStack>
          ))}
        </VStack>
      </VStack>
    </Card>
  );
};
