import { useState, useEffect, useContext, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView } from '~/components/ui/scroll-view';
import { RefreshControl } from '~/components/ui/refresh-control';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Card } from '~/components/ui/card';
import { Heading } from '~/components/ui/heading';
import { Text } from '~/components/ui/text';
import { Input, InputField, InputIcon } from '~/components/ui/input';
import { Icon } from '~/components/ui/icon';
import { Switch } from '~/components/ui/switch';
import { Spinner } from '~/components/ui/spinner';
import { Pressable } from '~/components/ui/pressable';
import { Badge } from '~/components/ui/badge';
import { Alert, AlertIcon, AlertText } from '~/components/ui/alert';
import { Search, X, Power, AlertCircle, Filter, ChevronRight } from 'lucide-react-native';

import { AuthContext } from '~/lib/AuthContext';
import { getBackendUrl } from '~/lib/backendUrl';
import { IoTGateway, HAService } from '~/lib/iot';

export default function ServicesScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { token } = useContext(AuthContext);
  const [gateway, setGateway] = useState<IoTGateway | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [services, setServices] = useState<HAService[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [enabledServices, setEnabledServices] = useState<Set<string>>(new Set());
  const [filterEnabled, setFilterEnabled] = useState(false);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());

  // Fetch gateway details
  const fetchGateway = useCallback(async () => {
    try {
      const url = getBackendUrl();
      const response = await fetch(`${url}/iot-gateways/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.replace('/login');
          return;
        }
        throw new Error('Failed to fetch integration details');
      }

      const data: IoTGateway = await response.json();
      setGateway(data);

      // Fetch services if active
      if (data.is_active) {
        fetchServices(data);
      } else {
        setError('Integration is not active. Please connect it first.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id, token]);

  // Fetch services from Home Assistant
  const fetchServices = async (gateway: IoTGateway) => {
    try {
      const response = await fetch(`${gateway.api_url}/api/services`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${gateway.api_key}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Transform the data into our HAService structure
        const servicesList: HAService[] = Object.entries(data).map(
          ([domain, domainData]: [string, any]) => ({
            domain,
            services: domainData,
          })
        );
        setServices(servicesList);
      } else {
        if (response.status === 401) {
          setError('Invalid API token');
        } else {
          setError('Failed to fetch services');
        }
      }
    } catch (err) {
      console.error('Failed to fetch services:', err);
      setError('Failed to connect to Home Assistant');
    }
  };

  // Filter services based on search and enabled filter
  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
      Object.keys(service.services).some((serviceName) =>
        serviceName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    const matchesFilter = !filterEnabled || enabledServices.has(service.domain);
    return matchesSearch && matchesFilter;
  });

  // Toggle domain expansion
  const toggleDomainExpansion = (domain: string) => {
    setExpandedDomains((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(domain)) {
        newSet.delete(domain);
      } else {
        newSet.add(domain);
      }
      return newSet;
    });
  };

  // Count total services
  const totalServicesCount = services.reduce(
    (acc, service) => acc + Object.keys(service.services).length,
    0
  );

  useEffect(() => {
    fetchGateway();
  }, [fetchGateway]);

  if (isLoading) {
    return (
      <VStack className="flex-1 items-center justify-center bg-background-50">
        <Spinner size="large" />
      </VStack>
    );
  }

  if (error && !services.length) {
    return (
      <VStack className="flex-1 items-center justify-center bg-background-50 p-4">
        <Alert action="error">
          <AlertIcon as={AlertCircle} />
          <AlertText>{error}</AlertText>
        </Alert>
      </VStack>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background-50"
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => {
            setIsRefreshing(true);
            fetchGateway();
          }}
        />
      }>
      <VStack className="p-4" space="md">
        <Card className="bg-background-0">
          <VStack className="p-4" space="md">
            <HStack className="items-center justify-between">
              <Heading size="xl">Services</Heading>
              <VStack className="items-end">
                <Badge variant="solid" action="success">
                  <Text size="xs" className="text-white">
                    {filteredServices.length} domains
                  </Text>
                </Badge>
                <Text className="mt-1 text-xs text-typography-500">
                  {totalServicesCount} total services
                </Text>
              </VStack>
            </HStack>

            {/* Search and Filter Controls */}
            <VStack space="sm">
              <Input>
                <InputIcon as={Search} className="ml-3" />
                <InputField
                  placeholder="Search domains or services..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery && (
                  <Pressable onPress={() => setSearchQuery('')} className="pr-3">
                    <Icon as={X} size="sm" className="text-typography-500" />
                  </Pressable>
                )}
              </Input>

              <HStack className="items-center justify-between">
                <HStack className="items-center" space="xs">
                  <Icon as={Filter} size="sm" className="text-typography-500" />
                  <Text className="text-sm">Show enabled only</Text>
                </HStack>
                <Switch value={filterEnabled} onValueChange={setFilterEnabled} />
              </HStack>
            </VStack>

            {/* Enabled count */}
            {enabledServices.size > 0 && (
              <Badge variant="outline" action="success">
                <Text size="xs">{enabledServices.size} enabled domains</Text>
              </Badge>
            )}
          </VStack>
        </Card>

        {/* Service Domains */}
        {filteredServices.map((service) => (
          <Card key={service.domain} className="bg-background-0">
            <VStack className="p-4" space="sm">
              <HStack className="items-center justify-between">
                <Pressable onPress={() => toggleDomainExpansion(service.domain)} className="flex-1">
                  <HStack className="items-center" space="xs">
                    <Icon
                      as={ChevronRight}
                      size="sm"
                      className={`text-typography-500 transition-transform ${
                        expandedDomains.has(service.domain) ? 'rotate-90' : ''
                      }`}
                    />
                    <VStack className="flex-1">
                      <Heading size="md" className="capitalize">
                        {service.domain}
                      </Heading>
                      <Text className="text-xs text-typography-500">
                        {Object.keys(service.services).length} services
                      </Text>
                    </VStack>
                  </HStack>
                </Pressable>
                <Switch
                  value={enabledServices.has(service.domain)}
                  onValueChange={(value) => {
                    setEnabledServices((prev) => {
                      const newSet = new Set(prev);
                      if (value) {
                        newSet.add(service.domain);
                      } else {
                        newSet.delete(service.domain);
                      }
                      return newSet;
                    });
                  }}
                />
              </HStack>

              {/* Expanded Service List */}
              {expandedDomains.has(service.domain) && (
                <VStack space="xs" className="ml-6 mt-2">
                  {Object.entries(service.services).map(([serviceName, serviceData]) => (
                    <Card key={serviceName} className="bg-gray-50 p-3">
                      <VStack space="xs">
                        <Text className="text-sm font-semibold">
                          {service.domain}.{serviceName}
                        </Text>
                        {serviceData.name && (
                          <Text className="text-xs text-typography-600">{serviceData.name}</Text>
                        )}
                        {serviceData.description && (
                          <Text className="text-xs text-typography-500">
                            {serviceData.description}
                          </Text>
                        )}
                        {Object.keys(serviceData.fields || {}).length > 0 && (
                          <Badge variant="outline" action="muted" size="sm">
                            <Text size="xs">{Object.keys(serviceData.fields).length} fields</Text>
                          </Badge>
                        )}
                      </VStack>
                    </Card>
                  ))}
                </VStack>
              )}
            </VStack>
          </Card>
        ))}
      </VStack>
    </ScrollView>
  );
}
