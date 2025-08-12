import { useState, useEffect } from 'react';
import { getUserPreferences, updateIoTFilterPreferences } from '~/lib/userPreferences';
import { IoTFilterPreferences, DEFAULT_GROW_DEVICE_CLASSES } from '~/lib/iotTypes';

// This is used in the ControlPanelSection
export function useHAFilterManager() {
  const [filterEnabled, setFilterEnabled] = useState(false);
  const [showDomainFilters, setShowDomainFilters] = useState(false);
  const [showDeviceClassFilters, setShowDeviceClassFilters] = useState(false);

  const [filterPreferences, setFilterPreferences] = useState<IoTFilterPreferences>({
    domains: ['switch', 'automation', 'sensor', 'number'],
    showAllDomains: false,
    deviceClasses: DEFAULT_GROW_DEVICE_CLASSES,
    showAllDeviceClasses: false,
  });

  // Load user preferences
  useEffect(() => {
    const loadPreferences = async () => {
      const prefs = await getUserPreferences();
      setFilterPreferences(prefs.iotFilters);
    };
    loadPreferences();
  }, []);

  // Toggle domain filter
  const toggleDomainFilter = async (domain: string) => {
    const newDomains = filterPreferences.domains.includes(domain)
      ? filterPreferences.domains.filter((d: string) => d !== domain)
      : [...filterPreferences.domains, domain];

    const newPrefs = { ...filterPreferences, domains: newDomains };
    setFilterPreferences(newPrefs);
    await updateIoTFilterPreferences(newPrefs);
  };

  // Toggle show all domains
  const toggleShowAllDomains = async () => {
    const newPrefs = { ...filterPreferences, showAllDomains: !filterPreferences.showAllDomains };
    setFilterPreferences(newPrefs);
    await updateIoTFilterPreferences(newPrefs);
  };

  // Toggle device class filter
  const toggleDeviceClassFilter = async (deviceClass: string) => {
    const newDeviceClasses = filterPreferences.deviceClasses.includes(deviceClass)
      ? filterPreferences.deviceClasses.filter((dc: string) => dc !== deviceClass)
      : [...filterPreferences.deviceClasses, deviceClass];

    const newPrefs = { ...filterPreferences, deviceClasses: newDeviceClasses };
    setFilterPreferences(newPrefs);
    await updateIoTFilterPreferences(newPrefs);
  };

  // Toggle show all device classes
  const toggleShowAllDeviceClasses = async () => {
    const newPrefs = {
      ...filterPreferences,
      showAllDeviceClasses: !filterPreferences.showAllDeviceClasses,
    };
    setFilterPreferences(newPrefs);
    await updateIoTFilterPreferences(newPrefs);
  };

  return {
    // State
    filterEnabled,
    showDomainFilters,
    showDeviceClassFilters,
    filterPreferences,

    // Actions
    setFilterEnabled,
    setShowDomainFilters,
    setShowDeviceClassFilters,
    toggleDomainFilter,
    toggleShowAllDomains,
    toggleDeviceClassFilter,
    toggleShowAllDeviceClasses,
  };
}
