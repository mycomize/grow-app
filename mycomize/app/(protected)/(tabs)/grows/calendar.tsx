import React, { useState } from 'react';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Card } from '@/components/ui/card';
import { ScrollView } from '@/components/ui/scroll-view';
import { Badge } from '@/components/ui/badge';
import { Calendar, Flag, Wrench, Scissors, Eye } from 'lucide-react-native';
import { useTheme } from '@/components/ui/themeprovider/themeprovider';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'milestone' | 'maintenance' | 'harvest' | 'observation';
  growName: string;
  status: 'upcoming' | 'today' | 'overdue';
}

export default function CalendarScreen() {
  const { theme } = useTheme();
  const iconColor = theme === 'dark' ? '#9ca3af' : '#6b7280';

  // Mock data - in a real app, this would come from your grows
  const [events] = useState<CalendarEvent[]>([
    {
      id: '1',
      title: 'Inoculation Complete',
      date: 'Today',
      time: '2:00 PM',
      type: 'milestone',
      growName: 'Oyster Grow #1',
      status: 'today',
    },
    {
      id: '2',
      title: 'Spawn Run Check',
      date: 'Tomorrow',
      time: '10:00 AM',
      type: 'observation',
      growName: 'Shiitake Grow #2',
      status: 'upcoming',
    },
    {
      id: '3',
      title: 'Misting Schedule',
      date: 'Jan 30',
      time: '8:00 AM',
      type: 'maintenance',
      growName: "Lion's Mane #1",
      status: 'upcoming',
    },
    {
      id: '4',
      title: 'Harvest Ready',
      date: 'Jan 28',
      time: '6:00 PM',
      type: 'harvest',
      growName: 'Oyster Grow #2',
      status: 'overdue',
    },
  ]);

  const getEventTypeColor = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'milestone':
        return 'bg-blue-100 text-blue-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'harvest':
        return 'bg-green-100 text-green-800';
      case 'observation':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEventIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'milestone':
        return Flag;
      case 'maintenance':
        return Wrench;
      case 'harvest':
        return Scissors;
      case 'observation':
        return Eye;
      default:
        return Calendar;
    }
  };

  const getStatusColor = (status: CalendarEvent['status']) => {
    switch (status) {
      case 'today':
        return '#2563eb';
      case 'upcoming':
        return iconColor;
      case 'overdue':
        return '#dc2626';
      default:
        return iconColor;
    }
  };

  const todayEvents = events.filter((e) => e.status === 'today');
  const upcomingEvents = events.filter((e) => e.status === 'upcoming');
  const overdueEvents = events.filter((e) => e.status === 'overdue');

  const renderEvent = (event: CalendarEvent) => {
    const IconComponent = getEventIcon(event.type);
    const statusColor = getStatusColor(event.status);

    return (
      <Card
        key={event.id}
        className={`p-4 ${event.status === 'overdue' ? 'border-l-4 border-l-red-500' : ''}`}>
        <VStack space="sm">
          <HStack className="items-center justify-between">
            <HStack space="sm" className="items-center">
              <IconComponent size={16} color={statusColor} />
              <Text className="font-semibold text-typography-900">{event.title}</Text>
            </HStack>
            <Badge className={getEventTypeColor(event.type)}>
              <Text className="text-xs font-medium">{event.type}</Text>
            </Badge>
          </HStack>
          <Text className="text-sm text-typography-600">{event.growName}</Text>
          <HStack space="sm" className="items-center">
            <Text className="text-sm font-medium" style={{ color: statusColor }}>
              {event.date}
            </Text>
            <Text className="text-sm text-typography-500">at {event.time}</Text>
          </HStack>
        </VStack>
      </Card>
    );
  };

  return (
    <ScrollView className="flex-1 bg-background-0">
      <VStack space="lg" className="p-6">
        <View className="flex-row items-center justify-between">
          <Heading size="xl" className="text-typography-900">
            Grow Calendar
          </Heading>
          <Calendar size={24} color={iconColor} />
        </View>

        <Text className="text-base text-typography-600">
          Track milestones, maintenance tasks, and harvest schedules across all your grows.
        </Text>

        {/* Overdue Events */}
        {overdueEvents.length > 0 && (
          <VStack space="md">
            <Heading size="lg" className="text-red-600">
              Overdue ({overdueEvents.length})
            </Heading>
            {overdueEvents.map(renderEvent)}
          </VStack>
        )}

        {/* Today's Events */}
        {todayEvents.length > 0 && (
          <VStack space="md">
            <Heading size="lg" className="text-blue-600">
              Today ({todayEvents.length})
            </Heading>
            {todayEvents.map(renderEvent)}
          </VStack>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <VStack space="md">
            <Heading size="lg" className="text-typography-800">
              Upcoming ({upcomingEvents.length})
            </Heading>
            {upcomingEvents.map(renderEvent)}
          </VStack>
        )}

        {/* Empty State */}
        {events.length === 0 && (
          <Card className="p-6">
            <VStack space="sm" className="items-center">
              <Calendar size={48} color={iconColor} />
              <Text className="text-center text-typography-600">No events scheduled</Text>
              <Text className="text-center text-sm text-typography-500">
                Events will automatically appear as you add grows and progress through stages
              </Text>
            </VStack>
          </Card>
        )}

        {/* Legend */}
        <Card className="p-4">
          <VStack space="sm">
            <Heading size="md" className="text-typography-800">
              Event Types
            </Heading>
            <VStack space="xs">
              <HStack space="sm" className="items-center">
                <Flag size={16} color="#2563eb" />
                <Text className="text-sm text-typography-600">Milestones - Key grow stages</Text>
              </HStack>
              <HStack space="sm" className="items-center">
                <Wrench size={16} color="#ca8a04" />
                <Text className="text-sm text-typography-600">
                  Maintenance - Regular care tasks
                </Text>
              </HStack>
              <HStack space="sm" className="items-center">
                <Scissors size={16} color="#16a34a" />
                <Text className="text-sm text-typography-600">Harvest - Ready to harvest</Text>
              </HStack>
              <HStack space="sm" className="items-center">
                <Eye size={16} color="#9333ea" />
                <Text className="text-sm text-typography-600">
                  Observation - Check-ups and monitoring
                </Text>
              </HStack>
            </VStack>
          </VStack>
        </Card>
      </VStack>
    </ScrollView>
  );
}
