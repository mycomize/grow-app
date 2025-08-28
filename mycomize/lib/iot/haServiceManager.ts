import { IoTGateway } from './iot';

// Home Assistant REST API service calls
export class HAServiceManager {
  static async callService(
    gateway: IoTGateway,
    domain: string,
    service: string,
    serviceData: Record<string, any>
  ): Promise<boolean> {
    try {
      console.log(`[HAService] Calling ${domain}.${service} on ${gateway.name}`, serviceData);

      const response = await fetch(`${gateway.api_url}/api/services/${domain}/${service}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${gateway.api_key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serviceData),
      });

      if (!response.ok) {
        console.error(`[HAService] Service call failed: ${response.status} ${response.statusText}`);
        return false;
      }

      console.log(`[HAService] Service call successful: ${domain}.${service}`);
      return true;
    } catch (error) {
      console.error(`[HAService] Error calling ${domain}.${service}:`, error);
      return false;
    }
  }

  // Switch domain services
  static async turnOn(gateway: IoTGateway, entityId: string): Promise<boolean> {
    return this.callService(gateway, 'switch', 'turn_on', { entity_id: entityId });
  }

  static async turnOff(gateway: IoTGateway, entityId: string): Promise<boolean> {
    return this.callService(gateway, 'switch', 'turn_off', { entity_id: entityId });
  }

  // Automation domain services  
  static async turnOnAutomation(gateway: IoTGateway, entityId: string): Promise<boolean> {
    return this.callService(gateway, 'automation', 'turn_on', { entity_id: entityId });
  }

  static async turnOffAutomation(gateway: IoTGateway, entityId: string): Promise<boolean> {
    return this.callService(gateway, 'automation', 'turn_off', { entity_id: entityId });
  }

  // Number domain services
  static async setNumberValue(gateway: IoTGateway, entityId: string, value: number): Promise<boolean> {
    return this.callService(gateway, 'number', 'set_value', { 
      entity_id: entityId, 
      value: value 
    });
  }

  // Generic toggle for switch-like entities
  static async toggleEntity(gateway: IoTGateway, entityId: string, currentState: string): Promise<boolean> {
    const domain = entityId.split('.')[0];
    const isOn = currentState === 'on';

    switch (domain) {
      case 'switch':
        return isOn ? this.turnOff(gateway, entityId) : this.turnOn(gateway, entityId);
      case 'automation':
        return isOn ? this.turnOffAutomation(gateway, entityId) : this.turnOnAutomation(gateway, entityId);
      default:
        console.warn(`[HAService] Toggle not supported for domain: ${domain}`);
        return false;
    }
  }
}
