import { getBackendUrl } from './backendUrl';
import {
  encryptData,
  decryptData,
  encryptDataArray,
  decryptDataArray,
  DataType,
} from './DataEncryption';

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  token?: string;
}

interface ApiCallConfig<TRequest = any, TResponse = any> {
  endpoint: string;
  config: RequestConfig;
  requestDataType?: DataType | null;
  responseDataType?: DataType | null;
  isArrayResponse?: boolean;
}

/**
 * Backend API client that automatically handles encryption/decryption.
 * All user data is encrypted before sending to backend and decrypted after receiving
 * Transparent to the rest of the application code
 */
class ApiClient {
  private async makeRequest<TResponse = any>(
    endpoint: string,
    config: RequestConfig
  ): Promise<TResponse> {
    const backendUrl = getBackendUrl();
    if (!backendUrl) {
      throw new Error('Backend URL not available for this platform');
    }

    const url = `${backendUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    if (config.token) {
      headers.Authorization = `Bearer ${config.token}`;
    }

    // Handle different body types based on Content-Type
    let body: string | undefined;
    if (config.body) {
      if (headers['Content-Type'] === 'application/x-www-form-urlencoded') {
        // For form data, use the body as-is (should be a URLSearchParams string)
        body = config.body;
      } else {
        // For JSON data, stringify the body
        body = JSON.stringify(config.body);
      }
    }

    const response = await fetch(url, {
      method: config.method || 'GET',
      headers,
      body,
    });

    // Handle 401 responses - let calling code handle navigation
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }

    if (!response.ok) {
      let errorMessage = 'Request failed';
      try {
        const errorData = await response.json();

        // Handle FastAPI validation errors (422)
        if (response.status === 422 && Array.isArray(errorData.detail)) {
          // Extract validation error messages and clean them up
          const validationErrors = errorData.detail
            .map((error: any) => error.msg.replace(/^Value error,?\s*/i, ''))
            .join(', ');
          errorMessage = validationErrors;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    // Handle responses with no content (204, etc.)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return null as TResponse;
    }

    // Check if response has content before trying to parse JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      if (!text.trim()) {
        return null as TResponse;
      }
      // If there's text but it's not JSON, try to parse it anyway for backward compatibility
      try {
        return JSON.parse(text);
      } catch {
        return text as TResponse;
      }
    }

    return await response.json();
  }

  /**
   * Make an API call with automatic encryption/decryption
   */
  async call<TRequest = any, TResponse = any>({
    endpoint,
    config,
    requestDataType = null,
    responseDataType = null,
    isArrayResponse = false,
  }: ApiCallConfig<TRequest, TResponse>): Promise<TResponse> {
    let processedBody = config.body;

    // Encrypt request data if needed
    if (requestDataType && config.body) {
      try {
        processedBody = await encryptData(requestDataType, config.body);
      } catch (error) {
        console.error(`Failed to encrypt ${requestDataType} request data:`, error);
        throw new Error(`Failed to encrypt ${requestDataType} data`);
      }
    }

    // Make the API call
    const response = await this.makeRequest<TResponse>(endpoint, {
      ...config,
      body: processedBody,
    });

    // Decrypt response data if needed
    if (responseDataType) {
      try {
        if (isArrayResponse) {
          return (await decryptDataArray(responseDataType, response as any[])) as TResponse;
        } else {
          return (await decryptData(responseDataType, response as any)) as TResponse;
        }
      } catch (error) {
        console.error(`Failed to decrypt ${responseDataType} response data:`, error);
        throw new Error(`Failed to decrypt ${responseDataType} data`);
      }
    }

    return response;
  }

  // Convenience methods for common HTTP operations

  async get<TResponse = any>(
    endpoint: string,
    token?: string,
    responseDataType?: DataType,
    isArrayResponse = false
  ): Promise<TResponse> {
    return this.call<never, TResponse>({
      endpoint,
      config: { method: 'GET', token },
      responseDataType,
      isArrayResponse,
    });
  }

  async post<TRequest = any, TResponse = any>(
    endpoint: string,
    data: TRequest,
    token?: string,
    requestDataType?: DataType,
    responseDataType?: DataType
  ): Promise<TResponse> {
    return this.call<TRequest, TResponse>({
      endpoint,
      config: { method: 'POST', body: data, token },
      requestDataType,
      responseDataType,
    });
  }

  async put<TRequest = any, TResponse = any>(
    endpoint: string,
    data: TRequest,
    token?: string,
    requestDataType?: DataType,
    responseDataType?: DataType
  ): Promise<TResponse> {
    return this.call<TRequest, TResponse>({
      endpoint,
      config: { method: 'PUT', body: data, token },
      requestDataType,
      responseDataType,
    });
  }

  async delete(endpoint: string, token?: string): Promise<void> {
    await this.call({
      endpoint,
      config: { method: 'DELETE', token },
    });
  }

  // BulkGrow operations
  async getBulkGrows(token: string) {
    return this.get('/grows/', token, 'BulkGrow', true);
  }

  async getBulkGrow(id: string, token: string) {
    return this.get(`/grows/${id}`, token, 'BulkGrow');
  }

  async createBulkGrow(data: any, token: string) {
    return this.post('/grows/', data, token, 'BulkGrow', 'BulkGrow');
  }

  async updateBulkGrow(id: string, data: any, token: string) {
    return this.put(`/grows/${id}`, data, token, 'BulkGrow', 'BulkGrow');
  }

  async deleteBulkGrow(id: string, token: string) {
    return this.delete(`/grows/${id}`, token);
  }

  // BulkGrowTek operations with special public/private handling
  async getBulkGrowTeks(token: string) {
    return this.get('/bulk-grow-tek/', token, 'BulkGrowTek', true);
  }

  async getBulkGrowTek(id: string, token: string) {
    return this.get(`/bulk-grow-tek/${id}`, token, 'BulkGrowTek');
  }

  async createBulkGrowTek(data: any, token: string) {
    return this.post('/bulk-grow-tek/', data, token, 'BulkGrowTek', 'BulkGrowTek');
  }

  async updateBulkGrowTek(id: string, data: any, token: string) {
    return this.put(`/bulk-grow-tek/${id}`, data, token, 'BulkGrowTek', 'BulkGrowTek');
  }

  async deleteBulkGrowTek(id: string, token: string) {
    return this.delete(`/bulk-grow-tek/${id}`, token);
  }

  // IoT Gateway operations
  async getIoTGateways(token: string) {
    return this.get('/iot-gateways/', token, 'IoTGateway', true);
  }

  async getIoTGateway(id: string, token: string) {
    return this.get(`/iot-gateways/${id}`, token, 'IoTGateway');
  }

  async createIoTGateway(data: any, token: string) {
    return this.post('/iot-gateways/', data, token, 'IoTGateway', 'IoTGateway');
  }

  async updateIoTGateway(id: string, data: any, token: string) {
    return this.put(`/iot-gateways/${id}`, data, token, 'IoTGateway', 'IoTGateway');
  }

  async deleteIoTGateway(id: string, token: string) {
    return this.delete(`/iot-gateways/${id}`, token);
  }

  async enableIoTGateway(id: string, token: string) {
    return this.put(`/iot-gateways/${id}/enable`, {}, token, undefined, 'IoTGateway');
  }

  async disableIoTGateway(id: string, token: string) {
    return this.put(`/iot-gateways/${id}/disable`, {}, token, undefined, 'IoTGateway');
  }

  // IoT Entity operations
  async getIoTEntities(gatewayId: string, token: string) {
    return this.get(`/iot-gateways/${gatewayId}/entities`, token, 'IoTEntity', true);
  }

  async getIoTEntity(gatewayId: string, entityId: string, token: string) {
    return this.get(`/iot-gateways/${gatewayId}/entities/${entityId}`, token, 'IoTEntity');
  }

  async createIoTEntity(gatewayId: string, data: any, token: string) {
    return this.post(`/iot-gateways/${gatewayId}/entities`, data, token, 'IoTEntity', 'IoTEntity');
  }

  async updateIoTEntity(gatewayId: string, entityId: string, data: any, token: string) {
    return this.put(
      `/iot-gateways/${gatewayId}/entities/${entityId}`,
      data,
      token,
      'IoTEntity',
      'IoTEntity'
    );
  }

  async deleteIoTEntity(gatewayId: string, entityId: string, token: string) {
    return this.delete(`/iot-gateways/${gatewayId}/entities/${entityId}`, token);
  }

  async bulkCreateIoTEntities(gatewayId: string, entities: any[], token: string) {
    return this.call({
      endpoint: `/iot-gateways/${gatewayId}/entities/bulk-create`,
      config: {
        method: 'POST',
        body: { entities },
        token,
      },
      requestDataType: 'BulkEntityCreateRequest',
      responseDataType: 'IoTEntity',
      isArrayResponse: true,
    });
  }

  async bulkDeleteIoTEntities(gatewayId: string, entityIds: number[], token: string) {
    return this.call({
      endpoint: `/iot-gateways/${gatewayId}/entities/bulk-delete`,
      config: {
        method: 'DELETE',
        body: { entity_ids: entityIds },
        token,
      },
      requestDataType: null,
    });
  }

  // IoT Entity Linking operations
  async linkIoTEntity(
    gatewayId: string,
    entityId: string,
    growId: number,
    stage: string,
    token: string
  ) {
    return this.put(
      `/iot-gateways/${gatewayId}/entities/${entityId}/link`,
      { grow_id: growId, stage: stage },
      token,
      'IoTAssignmentRequest',
      'IoTEntity'
    );
  }

  async bulkLinkIoTEntities(
    gatewayId: string,
    entityIds: number[],
    growId: number,
    stage: string,
    token: string
  ) {
    const requestBody = { entity_ids: entityIds, grow_id: growId, stage: stage };

    return this.call({
      endpoint: `/iot-gateways/${gatewayId}/entities/bulk-link`,
      config: {
        method: 'PUT',
        body: requestBody,
        token,
      },
      requestDataType: 'IoTAssignmentRequest',
      responseDataType: 'IoTEntity',
      isArrayResponse: true,
    });
  }

  async unlinkIoTEntity(gatewayId: string, entityId: string, token: string) {
    return this.delete(`/iot-gateways/${gatewayId}/entities/${entityId}/link`, token);
  }

  async bulkUnlinkIoTEntities(gatewayId: string, entityIds: number[], token: string) {
    return this.call({
      endpoint: `/iot-gateways/${gatewayId}/entities/bulk-unlink`,
      config: {
        method: 'DELETE',
        body: { entity_ids: entityIds },
        token,
      },
      requestDataType: null,
    });
  }

  async removeIoTEntityLink(gatewayId: string, entityId: string, token: string) {
    return this.delete(`/iot-gateways/${gatewayId}/entities/${entityId}/link`, token);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export the class for testing/advanced usage
export { ApiClient };

// Export utility functions for handling 401 responses
export function isUnauthorizedError(error: Error): boolean {
  return error.message === 'UNAUTHORIZED';
}
