import { useState } from 'react';
import { IoTGateway, IoTGatewayUpdate } from '~/lib/iot';

const createEmptyGateway = (): IoTGatewayUpdate => ({
  name: '',
  description: '',
  api_url: '',
  api_key: '',
});

export function useFormState(initialGateway?: IoTGateway) {
  const [gateway, setGateway] = useState<IoTGateway | null>(initialGateway || null);
  const [formData, setFormData] = useState<IoTGatewayUpdate>(
    initialGateway
      ? {
          name: initialGateway.name,
          description: initialGateway.description || '',
          api_url: initialGateway.api_url,
          api_key: initialGateway.api_key,
        }
      : createEmptyGateway()
  );

  // Edit mode and UI state
  const [isEditing, setIsEditing] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const updateFormField = (field: keyof IoTGatewayUpdate, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleApiKeyVisibility = () => {
    setShowApiKey(!showApiKey);
  };

  const resetForm = () => {
    setFormData(createEmptyGateway());
  };

  const initializeFormFromGateway = (gatewayData: IoTGateway) => {
    setGateway({
      ...gatewayData,
    });

    setFormData({
      name: gatewayData.name,
      description: gatewayData.description || '',
      api_url: gatewayData.api_url,
      api_key: gatewayData.api_key,
    });
  };

  return {
    // State
    gateway,
    formData,
    isEditing,
    showApiKey,
    showDeleteModal,
    isLoading,
    isRefreshing,
    isSaving,
    isDeleting,
    isTestingConnection,

    // Actions
    setGateway,
    setIsEditing,
    setShowDeleteModal,
    setIsLoading,
    setIsRefreshing,
    setIsSaving,
    setIsDeleting,
    setIsTestingConnection,
    updateFormField,
    toggleApiKeyVisibility,
    resetForm,
    initializeFormFromGateway,
  };
}
