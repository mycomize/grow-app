import { useState } from 'react';
import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Input, InputField, InputSlot, InputIcon } from '~/components/ui/input';
import { FormControl, FormControlLabel, FormControlLabelText } from '~/components/ui/form-control';
import { Textarea, TextareaInput } from '~/components/ui/textarea';
import { Pressable } from '~/components/ui/pressable';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import { Spinner } from '~/components/ui/spinner';
import {
  Eye,
  EyeOff,
  ChevronDown,
  PowerOff,
  ChevronsLeftRightEllipsis,
  QrCode,
  RadioTower,
  Gauge,
  Wifi,
  WifiOff,
} from 'lucide-react-native';
import { IoTGateway, IoTGatewayUpdate } from '~/lib/iot';
import { ConnectionStatus } from '~/components/ui/connection-status-badge';
import { InfoBadge, InfoBadgeVariant } from '~/components/ui/info-badge';
import { CountBadge } from '~/components/ui/count-badge';
import { IoTTypeSelectionModal } from '~/components/modals/IoTTypeSelectionModal';
import { ConnectionInfo } from '~/lib/iotTypes';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback } from 'react';

interface BasicsSectionProps {
  gateway: IoTGateway | null;
  formData: IoTGatewayUpdate;
  isEditing: boolean;
  showApiKey: boolean;
  connectionInfo: ConnectionInfo;
  isTestingConnection: boolean;
  onUpdateField: (field: keyof IoTGatewayUpdate, value: any) => void;
  onToggleApiKeyVisibility: () => void;
  onTestConnection: () => void;
}

export function BasicsSection({
  gateway,
  formData,
  isEditing,
  showApiKey,
  connectionInfo,
  isTestingConnection,
  onUpdateField,
  onToggleApiKeyVisibility,
  onTestConnection,
}: BasicsSectionProps) {
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [gatewayType, setGatewayType] = useState('home_assistant');

  // Helper function to get InfoBadge props from connection status
  const getConnectionBadgeProps = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return {
          text: 'CONNECTED',
          icon: Wifi,
          variant: 'success' as InfoBadgeVariant,
        };
      case 'connecting':
        return {
          text: 'CONNECTING',
          icon: RadioTower,
          variant: 'purple' as InfoBadgeVariant,
        };
      case 'disconnected':
        return {
          text: 'DISCONNECTED',
          icon: PowerOff,
          variant: 'error' as InfoBadgeVariant,
        };
      default:
        return {
          text: 'UNKNOWN',
          icon: WifiOff,
          variant: 'error' as InfoBadgeVariant,
        };
    }
  };

  // Handle scanned data when returning from scanner
  useFocusEffect(
    useCallback(() => {
      const checkForScannedData = async () => {
        try {
          const scannedData = await AsyncStorage.getItem('qr_scanned_data');
          if (scannedData) {
            onUpdateField('api_key', scannedData);
            // Clear the stored data after using it
            await AsyncStorage.removeItem('qr_scanned_data');
          }
        } catch (error) {
          console.error('Error reading scanned data:', error);
        }
      };

      checkForScannedData();
    }, [onUpdateField])
  );

  const getIoTGatewayTypeDisplayName = (type: string) => {
    switch (type) {
      case 'home_assistant':
        return 'Home Assistant';
      default:
        return 'Unknown Type';
    }
  };

  const handleQRCodeScan = () => {
    router.push('/qrscanner' as any);
  };

  if (isEditing) {
    return (
      <VStack space="lg" className="p-2">
        <FormControl>
          <FormControlLabel>
            <FormControlLabelText>Name</FormControlLabelText>
          </FormControlLabel>
          <Input>
            <InputField
              value={formData.name}
              onChangeText={(text) => onUpdateField('name', text)}
            />
          </Input>
        </FormControl>

        <FormControl>
          <FormControlLabel>
            <FormControlLabelText>Type</FormControlLabelText>
          </FormControlLabel>
          <Pressable onPress={() => setShowTypeModal(true)}>
            <Input pointerEvents="none">
              <InputField value={getIoTGatewayTypeDisplayName(gatewayType)} editable={false} />
              <InputSlot className="pr-3">
                <InputIcon as={ChevronDown} className="text-background-500" />
              </InputSlot>
            </Input>
          </Pressable>
        </FormControl>

        <FormControl>
          <FormControlLabel>
            <FormControlLabelText>Description</FormControlLabelText>
          </FormControlLabel>
          <Textarea>
            <TextareaInput
              value={formData.description}
              onChangeText={(text) => onUpdateField('description', text)}
              style={{ textAlignVertical: 'top' }}
            />
          </Textarea>
        </FormControl>

        <FormControl>
          <FormControlLabel>
            <FormControlLabelText>Home Assistant URL</FormControlLabelText>
          </FormControlLabel>
          <Input>
            <InputField
              value={formData.api_url}
              onChangeText={(text) => onUpdateField('api_url', text)}
              autoCapitalize="none"
              placeholder="http://homeassistant.local:8123"
            />
          </Input>
        </FormControl>

        <FormControl>
          <FormControlLabel>
            <FormControlLabelText>Home Assistant API Token</FormControlLabelText>
          </FormControlLabel>
          <Input>
            <InputField
              value={formData.api_key}
              onChangeText={(text) => onUpdateField('api_key', text)}
              autoCapitalize="none"
              secureTextEntry={!showApiKey}
            />
            <InputSlot className="flex-row items-center pr-3">
              <Pressable onPress={handleQRCodeScan} className="mr-2">
                <InputIcon as={QrCode} className="text-typography-700" />
              </Pressable>
              <Pressable onPress={onToggleApiKeyVisibility}>
                <InputIcon as={showApiKey ? EyeOff : Eye} className="text-background-500" />
              </Pressable>
            </InputSlot>
          </Input>
        </FormControl>

        {/* Connection Status and Controls */}
        <VStack space="md" className="mt-4 rounded-md p-0">
          <HStack className="mb-0 items-center">
            <Icon as={RadioTower} className="mr-2 text-typography-400" />
            <Text className="flex-1 text-lg font-semibold">Link Status</Text>
            <HStack className="items-center" space="xs">
              <InfoBadge
                {...getConnectionBadgeProps(
                  isTestingConnection ? 'connecting' : connectionInfo.status
                )}
              />
              {connectionInfo.latency !== undefined && connectionInfo.status === 'connected' && (
                <CountBadge
                  count={connectionInfo.latency}
                  label="ms"
                  variant="green-dark"
                  icon={Gauge}
                />
              )}
            </HStack>
          </HStack>

          {connectionInfo.status === 'connected' && connectionInfo.version && (
            <Text className="text-sm text-typography-500">
              HA Version: {connectionInfo.version}
            </Text>
          )}

          {/* Connection Controls */}
          <HStack space="sm" className="mt-3">
            {gateway ? (
              // Existing gateway - button logic based on connection state
              <Button
                variant="solid"
                action="primary"
                onPress={() => {
                  // Don't execute if in connecting/testing state
                  if (isTestingConnection || connectionInfo.status === 'connecting') return;

                  if (connectionInfo.status === 'connected') {
                    onTestConnection();
                  }
                }}
                className="flex-1">
                {(isTestingConnection || connectionInfo.status === 'connecting') && (
                  <Spinner size="small" className="mr-2 text-background-0" />
                )}
                {!(isTestingConnection || connectionInfo.status === 'connecting') && (
                  <ButtonIcon as={ChevronsLeftRightEllipsis} />
                )}
                <ButtonText>
                  {(isTestingConnection || connectionInfo.status === 'connecting') && 'Connecting'}
                  {connectionInfo.status === 'connected' && !isTestingConnection && 'Test'}
                  {connectionInfo.status === 'disconnected' && !isTestingConnection && 'Connect'}
                </ButtonText>
              </Button>
            ) : (
              // New gateway - button logic based on connection state
              <Button
                variant="solid"
                action="primary"
                onPress={() => {
                  // Don't execute if in connecting/testing state or missing required fields
                  if (
                    isTestingConnection ||
                    connectionInfo.status === 'connecting' ||
                    !formData.api_url?.trim() ||
                    !formData.api_key?.trim()
                  )
                    return;

                  onTestConnection();
                }}
                className="flex-1">
                {(isTestingConnection || connectionInfo.status === 'connecting') && (
                  <Spinner size="small" className="mr-2 text-background-0" />
                )}
                {!(isTestingConnection || connectionInfo.status === 'connecting') && (
                  <ButtonIcon as={ChevronsLeftRightEllipsis} />
                )}
                <ButtonText>
                  {(isTestingConnection || connectionInfo.status === 'connecting') && 'Connecting'}
                  {connectionInfo.status === 'connected' && !isTestingConnection && 'Test'}
                  {(connectionInfo.status === 'disconnected' ||
                    connectionInfo.status === 'unknown') &&
                    !isTestingConnection &&
                    'Connect'}
                </ButtonText>
              </Button>
            )}
          </HStack>
        </VStack>

        {/* Type Selection Modal */}
        <IoTTypeSelectionModal
          isOpen={showTypeModal}
          onClose={() => setShowTypeModal(false)}
          currentType={gatewayType}
          onSelectType={setGatewayType}
        />
      </VStack>
    );
  }

  if (!gateway) {
    return (
      <VStack className="p-4">
        <Text className="text-typography-500">
          IoT Gateway data not available. Connect your gateway to get started
        </Text>
      </VStack>
    );
  }
}
