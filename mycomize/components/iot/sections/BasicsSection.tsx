import { useState, useCallback } from 'react';
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
import { ConnectionStatus } from '~/components/ui/connection-status-badge';
import { InfoBadge, InfoBadgeVariant } from '~/components/ui/info-badge';
import { CountBadge } from '~/components/ui/count-badge';
import { IoTTypeSelectionModal } from '~/components/modals/IoTTypeSelectionModal';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useCurrentGatewayFormData,
  useCurrentGatewayConnectionStatus,
  useUpdateCurrentGatewayField,
  useTestCurrentGatewayConnection,
  useGatewayStore,
} from '~/lib/stores/iot/gatewayStore';
import { useEntityStore } from '~/lib/stores/iot/entityStore';

export function BasicsSection() {
  // Zustand store hooks - optimized subscriptions
  const formData = useCurrentGatewayFormData();
  const { status: connectionStatus, latency } = useCurrentGatewayConnectionStatus();
  const updateCurrentGatewayField = useUpdateCurrentGatewayField();
  const testCurrentGatewayConnection = useTestCurrentGatewayConnection();
  const { fetchHaEntities } = useEntityStore();

  // Local UI state
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  const isEditing = true; // Always in editing mode for form sections
  const isTestingConnection = connectionStatus === 'connecting';

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

  // Handle scanned data when returning from scanner with enhanced timing and error handling
  useFocusEffect(
    useCallback(() => {
      const checkForScannedData = async () => {
        try {
          // Check if there's scanned data from QR scanner
          const scannedData = await AsyncStorage.getItem('qr_scanned_data');
          
          if (scannedData && scannedData.trim()) {
            // Apply scanned data immediately - this should overwrite any preserved data
            updateCurrentGatewayField('api_key', scannedData.trim());
            
            // Clear the stored data after successfully applying it
            try {
              await AsyncStorage.removeItem('qr_scanned_data');
            } catch (clearError) {
              // Don't fail the entire operation if clearing fails
            }
          } 
        } catch (error) {
          // Attempt to clear potentially corrupted data
          try {
            await AsyncStorage.removeItem('qr_scanned_data');
          } catch (clearError) {
          }
        }
      };

      // Use setTimeout to ensure this runs after any store initialization
      // This improves timing to ensure preserved data is loaded before QR data overwrites it
      const timeoutId = setTimeout(() => {
        checkForScannedData();
      }, 100);

      // Cleanup function to prevent memory leaks
      return () => {
        clearTimeout(timeoutId);
      };
    }, [updateCurrentGatewayField, formData])
  );

  // Connection test handler - optimized to force refresh entities
  const handleTestConnection = useCallback(async () => {
    try {
      const result = await testCurrentGatewayConnection();

      // If connection successful, fetch HA entities with forceRefresh for immediate preview
      if (result.status === 'connected' && formData) {
        // Create temporary gateway object for entity fetching
        const tempGateway = {
          id: -1,
          name: formData.name || 'Test',
          type: formData.type || 'home_assistant',
          api_url: formData.api_url || '',
          api_key: formData.api_key || '',
        };
        // Force refresh to get latest entities regardless of cache
        await fetchHaEntities(tempGateway, true);

        // Compute entity lists for new gateway to make entities available in ControlPanelSection
        const { computeAndSetEntityLists } = useEntityStore.getState();
        computeAndSetEntityLists(true); // true = isNewGateway
      }
    } catch (error) {
    }
  }, [testCurrentGatewayConnection, fetchHaEntities, formData]);

  // Handle credential field blur - detect potential changes for cache invalidation
  const handleCredentialBlur = useCallback((field: 'api_url' | 'api_key', value: string) => {
    // Note: The actual cache invalidation will be handled by the entityStore's
    // shouldRefreshEntities method when fetchHaEntities is next called
    // This blur handler is mainly for logging and future enhancements

    if (field === 'api_url') {
      console.log(`[BasicsSection] API URL updated: ${value.substring(0, 20)}...`);
    } else if (field === 'api_key') {
      console.log(`[BasicsSection] API key updated (length: ${value.length})`);
    }
  }, []);

  const getIoTGatewayTypeDisplayName = (type: string) => {
    switch (type) {
      case 'home_assistant':
        return 'Home Assistant';
      default:
        return 'Unknown Type';
    }
  };

  const handleQRCodeScan = () => {
    // Set the QR scanning flag before navigation
    useGatewayStore.getState().setQrScanning(true);
    router.push('/qrscanner' as any);
  };

  const toggleApiKeyVisibility = () => {
    setShowApiKey((prev) => !prev);
  };

  // Early return if no form data available
  if (!formData) {
    return (
      <VStack className="p-4">
        <Text className="text-typography-500">Loading gateway data...</Text>
      </VStack>
    );
  }

  if (isEditing) {
    return (
      <VStack space="lg" className="px-0 pt-0 pb-3">
        <FormControl>
          <FormControlLabel>
            <FormControlLabelText>Name</FormControlLabelText>
          </FormControlLabel>
          <Input>
            <InputField
              value={formData.name || ''}
              onChangeText={(text) => updateCurrentGatewayField('name', text)}
            />
          </Input>
        </FormControl>

        <FormControl>
          <FormControlLabel>
            <FormControlLabelText>Type</FormControlLabelText>
          </FormControlLabel>
          <Pressable onPress={() => setShowTypeModal(true)}>
            <Input pointerEvents="none">
              <InputField
                value={getIoTGatewayTypeDisplayName(formData.type || 'home_assistant')}
                editable={false}
              />
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
              value={formData.description || ''}
              onChangeText={(text) => updateCurrentGatewayField('description', text)}
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
              value={formData.api_url || ''}
              onChangeText={(text) => updateCurrentGatewayField('api_url', text)}
              onBlur={() => handleCredentialBlur('api_url', formData.api_url || '')}
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
              value={formData.api_key || ''}
              onChangeText={(text) => updateCurrentGatewayField('api_key', text)}
              onBlur={() => handleCredentialBlur('api_key', formData.api_key || '')}
              autoCapitalize="none"
              secureTextEntry={!showApiKey}
            />
            <InputSlot className="flex-row items-center pr-3">
              <Pressable onPress={handleQRCodeScan} className="mr-2">
                <InputIcon as={QrCode} className="text-typography-700" />
              </Pressable>
              <Pressable onPress={toggleApiKeyVisibility}>
                <InputIcon as={showApiKey ? EyeOff : Eye} className="text-background-500" />
              </Pressable>
            </InputSlot>
          </Input>
        </FormControl>

        {/* Connection Status and Controls */}
        <VStack space="md" className="mt-2 rounded-md p-0">
          <HStack className="mb-0 items-center">
            <Icon as={RadioTower} className="mr-2 text-typography-400" />
            <Text className="flex-1 text-lg font-semibold">Link Status</Text>
            <HStack className="items-center" space="xs">
              <InfoBadge {...getConnectionBadgeProps(connectionStatus)} />
              {latency !== undefined && connectionStatus === 'connected' && (
                <InfoBadge icon={Gauge} text={` ${latency} ms`} variant="healthy" />
              )}
            </HStack>
          </HStack>

          {/* Connection Controls */}
          <HStack space="sm" className="mt-1 w-1/3">
            <Button
              variant="solid"
              action="positive"
              onPress={() => {
                // Don't execute if in connecting/testing state or missing required fields
                if (isTestingConnection || !formData.api_url?.trim() || !formData.api_key?.trim())
                  return;

                handleTestConnection();
              }}
              className="flex-1">
              {isTestingConnection && <Spinner size="small" className="mr-2 text-background-0" color="white" />}
              {!isTestingConnection && <ButtonIcon className="text-typography-900" as={ChevronsLeftRightEllipsis} />}
              <ButtonText className="text-typography-900">
                {isTestingConnection && 'Connecting'}
                {connectionStatus === 'connected' && !isTestingConnection && 'Test'}
                {(connectionStatus === 'disconnected' || connectionStatus === 'unknown') &&
                  !isTestingConnection &&
                  'Connect'}
              </ButtonText>
            </Button>
          </HStack>
        </VStack>

        {/* Type Selection Modal */}
        <IoTTypeSelectionModal
          isOpen={showTypeModal}
          onClose={() => setShowTypeModal(false)}
          currentType={formData.type || 'home_assistant'}
          onSelectType={(type) => updateCurrentGatewayField('type', type)}
        />
      </VStack>
    );
  }

  return null;
}
