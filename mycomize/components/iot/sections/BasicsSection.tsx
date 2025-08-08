import { VStack } from '~/components/ui/vstack';
import { HStack } from '~/components/ui/hstack';
import { Text } from '~/components/ui/text';
import { Input, InputField, InputSlot, InputIcon } from '~/components/ui/input';
import { FormControl, FormControlLabel, FormControlLabelText } from '~/components/ui/form-control';
import { Textarea, TextareaInput } from '~/components/ui/textarea';
import { Pressable } from '~/components/ui/pressable';
import { Button, ButtonText, ButtonIcon } from '~/components/ui/button';
import { Icon } from '~/components/ui/icon';
import {
  Eye,
  EyeOff,
  ChevronDown,
  Power,
  PowerOff,
  ChevronsLeftRightEllipsis,
} from 'lucide-react-native';
import { IoTGateway, IoTGatewayUpdate } from '~/lib/iot';
import { ConnectionStatusBadge, ConnectionStatus } from '~/components/ui/connection-status-badge';
import { IoTTypeSelectionModal } from '~/components/modals/IoTTypeSelectionModal';
import { useState } from 'react';

interface ConnectionInfo {
  status: ConnectionStatus;
  version?: string;
  config?: any;
}

interface DetailsSectionProps {
  gateway: IoTGateway | null;
  formData: IoTGatewayUpdate;
  isEditing: boolean;
  showApiKey: boolean;
  connectionInfo: ConnectionInfo;
  isTestingConnection: boolean;
  onUpdateField: (field: keyof IoTGatewayUpdate, value: any) => void;
  onToggleApiKeyVisibility: () => void;
  onToggleGatewayStatus: () => void;
  onTestConnection: () => void;
}

export function DetailsSection({
  gateway,
  formData,
  isEditing,
  showApiKey,
  connectionInfo,
  isTestingConnection,
  onUpdateField,
  onToggleApiKeyVisibility,
  onToggleGatewayStatus,
  onTestConnection,
}: DetailsSectionProps) {
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [gatewayType, setGatewayType] = useState('home_assistant');

  const getTypeDisplayName = (type: string) => {
    switch (type) {
      case 'home_assistant':
        return 'Home Assistant';
      default:
        return 'Unknown Type';
    }
  };
  if (isEditing) {
    return (
      <VStack space="lg" className="p-4">
        <FormControl>
          <FormControlLabel>
            <FormControlLabelText>Name</FormControlLabelText>
          </FormControlLabel>
          <Input>
            <InputField
              value={formData.name}
              onChangeText={(text) => onUpdateField('name', text)}
              placeholder="My Home Assistant"
            />
          </Input>
        </FormControl>

        <FormControl>
          <FormControlLabel>
            <FormControlLabelText>Type</FormControlLabelText>
          </FormControlLabel>
          <Pressable onPress={() => setShowTypeModal(true)}>
            <Input pointerEvents="none">
              <InputField value={getTypeDisplayName(gatewayType)} editable={false} />
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
              keyboardType="url"
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
            <InputSlot className="pr-3">
              <Pressable onPress={onToggleApiKeyVisibility}>
                <InputIcon as={showApiKey ? EyeOff : Eye} className="text-background-500" />
              </Pressable>
            </InputSlot>
          </Input>
        </FormControl>

        {/* Connection Status and Controls */}
        <VStack space="md" className="mt-4 rounded-md p-0">
          <HStack className="mb-2 items-center justify-between">
            <Text className="text-lg font-semibold">Connection Status</Text>
            <ConnectionStatusBadge
              status={isTestingConnection ? 'connecting' : connectionInfo.status}
            />
          </HStack>

          {connectionInfo.status === 'connected' && connectionInfo.version && (
            <Text className="text-sm text-typography-500">
              Home Assistant Version: {connectionInfo.version}
            </Text>
          )}

          {/* Connection Controls */}
          <HStack space="sm">
            <Button
              onPress={onToggleGatewayStatus}
              className={gateway?.is_active ? 'flex-1 bg-error-200' : 'flex-1 bg-success-300'}>
              <ButtonIcon
                as={gateway?.is_active ? PowerOff : Power}
                className={gateway?.is_active ? 'text-typography-700' : 'text-white'}
              />
              <ButtonText className={gateway?.is_active ? 'text-typography-700' : 'text-white'}>
                {gateway?.is_active ? 'Disconnect' : 'Connect'}
              </ButtonText>
            </Button>

            <Button
              variant="outline"
              onPress={onTestConnection}
              isDisabled={isTestingConnection || !gateway?.is_active}
              className="flex-1">
              <ButtonIcon as={ChevronsLeftRightEllipsis} />
              <ButtonText>{isTestingConnection ? 'Testing...' : 'Test'}</ButtonText>
            </Button>
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
        <Text className="text-typography-500">IoT Gateway data not available</Text>
      </VStack>
    );
  }

  return (
    <VStack space="md" className="p-4">
      <HStack className="justify-between">
        <Text className="font-medium">Name:</Text>
        <Text className="flex-1 text-right" numberOfLines={1} ellipsizeMode="middle">
          {gateway.name}
        </Text>
      </HStack>

      {gateway.description && (
        <HStack className="justify-between">
          <Text className="font-medium">Description:</Text>
          <Text className="flex-1 text-right" numberOfLines={2} ellipsizeMode="tail">
            {gateway.description}
          </Text>
        </HStack>
      )}

      <HStack className="justify-between">
        <Text className="font-medium">URL:</Text>
        <Text className="flex-1 text-right" numberOfLines={1} ellipsizeMode="middle">
          {gateway.api_url}
        </Text>
      </HStack>

      <HStack className="justify-between">
        <Text className="font-medium">Type:</Text>
        <Text className="flex-1 text-right">{getTypeDisplayName(gatewayType)}</Text>
      </HStack>

      <HStack className="justify-between">
        <Text className="font-medium">API Token:</Text>
        <Text>••••••••••••••••</Text>
      </HStack>

      {gateway.grow_id && (
        <HStack className="justify-between">
          <Text className="font-medium">Linked Grow:</Text>
          <Text className="font-medium text-primary-600">Grow #{gateway.grow_id}</Text>
        </HStack>
      )}

      {/* Connection Status and Controls */}
      <VStack space="md" className="mt-4 rounded-md  p-0">
        <HStack className="mb-2 items-center justify-between">
          <Text className="text-lg font-semibold">Connection Status</Text>
          <ConnectionStatusBadge
            status={isTestingConnection ? 'connecting' : connectionInfo.status}
          />
        </HStack>

        {connectionInfo.status === 'connected' && connectionInfo.version && (
          <Text className="text-sm text-typography-500">
            Home Assistant Version: {connectionInfo.version}
          </Text>
        )}

        {/* Connection Controls */}
        <HStack space="sm">
          <Button
            onPress={onToggleGatewayStatus}
            className={gateway.is_active ? 'flex-1 bg-error-200' : 'flex-1 bg-success-300'}>
            <ButtonIcon
              as={gateway.is_active ? PowerOff : Power}
              className={gateway.is_active ? 'text-typography-700' : 'text-white'}
            />
            <ButtonText className={gateway.is_active ? 'text-typography-700' : 'text-white'}>
              {gateway.is_active ? 'Disconnect' : 'Connect'}
            </ButtonText>
          </Button>

          <Button
            variant="outline"
            onPress={onTestConnection}
            isDisabled={isTestingConnection || !gateway.is_active}
            className="flex-1">
            <ButtonIcon as={ChevronsLeftRightEllipsis} />
            <ButtonText>{isTestingConnection ? 'Testing...' : 'Test'}</ButtonText>
          </Button>
        </HStack>
      </VStack>
    </VStack>
  );
}
