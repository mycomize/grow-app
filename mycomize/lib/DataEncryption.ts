import { getEncryptionService } from './EncryptionService';

/**
 * Allowlist approach here is that each data type specifies exactly which fields should remain unencrypted.
 * Everything else is encrypted on the client
 *
 * This prevents accidental exposure if new fields are added with similar names.
 * Each data type only includes fields that are actually present in that specific data structure.
 *
 * IMPORTANT: When adding new data types or fields, be explicit about what should remain unencrypted.
 * Only include fields generated in the backend itself - (IDs, timestamps, foreign keys) and SQLAlchemy
 * relationships in the allowlist. _All_ other fields will be encrypted.
 */
const MODEL_SPECIFIC_ALLOWLISTS = {
  User: [
    // Backend-generated fields present in User model
    'id',
    'created_at',
    'updated_at',
    'is_active',
    // Authentication fields (must remain unencrypted for system to function)
    'username',
    'hashed_password',
    // SQLAlchemy relationships present in User model
    'bulk_grows',
    'bulk_grow_teks',
    'iot_gateways',
  ] as const,

  BulkGrow: [
    // Backend-generated fields present in BulkGrow model
    'id',
    'user_id',
    // SQLAlchemy relationships present in BulkGrow model
    'flushes',
    'user',
    'linked_entities',
  ] as const,

  BulkGrowFlush: [
    // Backend-generated fields present in BulkGrowFlush model
    'id',
    'bulk_grow_id',
    // SQLAlchemy relationships present in BulkGrowFlush model
    'bulk_grow',
  ] as const,

  BulkGrowTek: [
    // Backend-generated fields present in BulkGrowTek model
    'id',
    'created_at',
    'updated_at',
    'is_public',
    'usage_count',
    // SQLAlchemy relationships present in BulkGrowTek model
    'creator',
  ] as const,

  IoTGateway: [
    // Backend-generated fields present in IoTGateway model
    'id',
    'user_id',
    // SQLAlchemy relationships present in IoTGateway model
    'user',
    'entities',
  ] as const,

  IoTEntity: [
    // Backend-generated fields present in IoTEntity model
    'id',
    'gateway_id',
    'linked_grow_id',
    // SQLAlchemy relationships present in IoTEntity model
    'gateway',
    'linked_grow',
  ] as const,

  IoTAssignmentRequest: [
    // Backend-generated fields present in assignment request - foreign keys should remain unencrypted
    'entity_ids', // Array of foreign keys for entity assignments
    'grow_id', // Foreign key for grow assignment
  ] as const,

  EntityLinkingRequest: [
    // Backend-generated fields for individual entity linking - foreign keys should remain unencrypted
    'grow_id', // Foreign key for grow assignment
  ] as const,

  BulkEntityLinkingRequest: [
    // Backend-generated fields for bulk entity linking - foreign keys should remain unencrypted
    'entity_ids', // Array of foreign keys for entity assignments
    'grow_id', // Foreign key for grow assignment
  ] as const,

  BulkEntityCreateRequest: [
    // The entities field itself should remain as a list structure, but individual entities will be encrypted
    'entities',
  ] as const,
} as const;

/**
 * Configuration for encryption behavior by data type
 * Following the security principle: encrypt by default, explicit allowlist for unencrypted
 */
export const ENCRYPTION_CONFIG = {
  User: {
    encryptionStrategy: 'encrypt_all_except_allowlist' as const,
    allowedUnencryptedFields: MODEL_SPECIFIC_ALLOWLISTS.User,
  },

  BulkGrow: {
    encryptionStrategy: 'encrypt_all_except_allowlist' as const,
    allowedUnencryptedFields: MODEL_SPECIFIC_ALLOWLISTS.BulkGrow,
  },

  BulkGrowFlush: {
    encryptionStrategy: 'encrypt_all_except_allowlist' as const,
    allowedUnencryptedFields: MODEL_SPECIFIC_ALLOWLISTS.BulkGrowFlush,
  },

  BulkGrowTek: {
    encryptionStrategy: 'conditional_on_public_flag' as const,
    allowedUnencryptedFields: MODEL_SPECIFIC_ALLOWLISTS.BulkGrowTek,
    conditionalField: 'is_public', // If true, store in cleartext; if false, encrypt
  },

  IoTGateway: {
    encryptionStrategy: 'encrypt_all_except_allowlist' as const,
    allowedUnencryptedFields: MODEL_SPECIFIC_ALLOWLISTS.IoTGateway,
  },

  IoTEntity: {
    encryptionStrategy: 'encrypt_all_except_allowlist' as const,
    allowedUnencryptedFields: MODEL_SPECIFIC_ALLOWLISTS.IoTEntity,
  },

  IoTAssignmentRequest: {
    encryptionStrategy: 'encrypt_all_except_allowlist' as const,
    allowedUnencryptedFields: MODEL_SPECIFIC_ALLOWLISTS.IoTAssignmentRequest,
  },

  EntityLinkingRequest: {
    encryptionStrategy: 'encrypt_all_except_allowlist' as const,
    allowedUnencryptedFields: MODEL_SPECIFIC_ALLOWLISTS.EntityLinkingRequest,
  },

  BulkEntityLinkingRequest: {
    encryptionStrategy: 'encrypt_all_except_allowlist' as const,
    allowedUnencryptedFields: MODEL_SPECIFIC_ALLOWLISTS.BulkEntityLinkingRequest,
  },

  BulkEntityCreateRequest: {
    encryptionStrategy: 'encrypt_all_except_allowlist' as const,
    allowedUnencryptedFields: MODEL_SPECIFIC_ALLOWLISTS.BulkEntityCreateRequest,
  },
} as const;

export type DataType = keyof typeof ENCRYPTION_CONFIG;

/**
 * Generic encryption function for any field value
 */
async function encryptField(value: any): Promise<string> {
  if (value === null || value === undefined) return '';

  const encryptionService = getEncryptionService();
  if (!encryptionService.isInitialized()) {
    throw new Error('Encryption not initialized');
  }

  if (typeof value === 'object') {
    return await encryptionService.encryptJSON(value);
  }
  return await encryptionService.encrypt(String(value));
}

/**
 * Generic decryption function for any field value
 */
async function decryptField(value: string): Promise<any> {
  if (!value) return '';

  const encryptionService = getEncryptionService();
  if (!encryptionService.isInitialized()) {
    throw new Error('Encryption not initialized');
  }

  if (!encryptionService.isEncrypted(value)) {
    return value; // Return as-is if not encrypted
  }

  try {
    // Try to decrypt as JSON first, fall back to string
    return await encryptionService.decryptJSON(value);
  } catch {
    return await encryptionService.decrypt(value);
  }
}

/**
 * Determines if a specific field should be encrypted based on allowlist
 */
function shouldEncryptField(dataType: DataType, fieldName: string, data: any): boolean {
  const config = ENCRYPTION_CONFIG[dataType];

  // Check if field is in allowlist (should NOT be encrypted)
  if ((config.allowedUnencryptedFields as readonly string[]).includes(fieldName)) {
    return false;
  }

  // Handle BulkGrowTek special case - if is_public=true, don't encrypt any user data fields
  if (dataType === 'BulkGrowTek' && config.encryptionStrategy === 'conditional_on_public_flag') {
    const isPublic = data[config.conditionalField!];
    if (isPublic) {
      return false; // Don't encrypt if public
    }
  }

  // Encrypt all fields not in allowlist
  return true;
}

/**
 * Get all field names that should be encrypted for a given data object
 */
function getEncryptableFields(dataType: DataType, data: any): string[] {
  const allFields = Object.keys(data);
  return allFields.filter((field) => shouldEncryptField(dataType, field, data));
}

/**
 * Encrypts data object based on allowlist configuration
 */
export async function encryptData<T extends Record<string, any>>(
  dataType: DataType,
  data: T
): Promise<T> {
  const encryptedData = { ...data } as any;
  const fieldsToEncrypt = getEncryptableFields(dataType, data);

  // Encrypt each field that's not in the allowlist
  for (const field of fieldsToEncrypt) {
    if (encryptedData[field] !== undefined && encryptedData[field] !== null) {
      encryptedData[field] = await encryptField(encryptedData[field]);
    }
  }

  // Special handling for BulkGrowTek public teks - complex fields still need JSON serialization
  if (dataType === 'BulkGrowTek' && data.is_public) {
    // Convert complex fields to JSON strings even for public teks
    if (encryptedData.stages && typeof encryptedData.stages === 'object') {
      encryptedData.stages = JSON.stringify(encryptedData.stages);
    }
    if (encryptedData.tags && typeof encryptedData.tags === 'object') {
      encryptedData.tags = JSON.stringify(encryptedData.tags);
    }
  }

  // Handle nested arrays (like flushes in BulkGrow)
  if (dataType === 'BulkGrow' && encryptedData.flushes && Array.isArray(encryptedData.flushes)) {
    encryptedData.flushes = await Promise.all(
      encryptedData.flushes.map(async (flush: any) => await encryptData('BulkGrowFlush', flush))
    );
  }

  // Handle nested arrays for bulk entity creation
  if (
    dataType === 'BulkEntityCreateRequest' &&
    encryptedData.entities &&
    Array.isArray(encryptedData.entities)
  ) {
    encryptedData.entities = await Promise.all(
      encryptedData.entities.map(async (entity: any) => await encryptData('IoTEntity', entity))
    );
  }

  return encryptedData as T;
}

/**
 * Decrypts data object based on allowlist configuration
 */
export async function decryptData<T extends Record<string, any>>(
  dataType: DataType,
  data: T
): Promise<T> {
  const encryptionService = getEncryptionService();
  if (!encryptionService.isInitialized()) {
    throw new Error('Encryption not initialized');
  }

  const decryptedData = { ...data } as any;
  const fieldsToDecrypt = getEncryptableFields(dataType, data);

  // Decrypt each field that would have been encrypted
  for (const field of fieldsToDecrypt) {
    if (decryptedData[field]) {
      try {
        decryptedData[field] = await decryptField(decryptedData[field]);

        // Handle type conversion for specific fields
        if (dataType === 'BulkGrow' && field === 'total_cost') {
          decryptedData[field] = parseFloat(decryptedData[field]) || 0;
        }

        if (
          dataType === 'BulkGrowFlush' &&
          ['wet_yield_grams', 'dry_yield_grams', 'concentration_mg_per_gram'].includes(field)
        ) {
          decryptedData[field] = parseFloat(decryptedData[field]) || 0;
        }

        // Ensure integer fields remain as integers for IoTEntity
        if (dataType === 'IoTEntity' && ['id', 'gateway_id', 'linked_grow_id'].includes(field)) {
          const numValue = parseInt(decryptedData[field], 10);
          if (!isNaN(numValue)) {
            decryptedData[field] = numValue;
          }
        }
      } catch (error) {
        console.warn(`Failed to decrypt field ${field} for ${dataType}:`, error);
        // Keep original value if decryption fails
      }
    }
  }

  // Special handling for BulkGrowTek - parse JSON strings back to objects for both public and private teks
  if (dataType === 'BulkGrowTek') {
    // Parse stages JSON string to object
    if (decryptedData.stages && typeof decryptedData.stages === 'string') {
      try {
        decryptedData.stages = JSON.parse(decryptedData.stages);
      } catch (error) {
        console.warn('Failed to parse stages JSON for tek:', error);
      }
    }

    // Parse tags JSON string to array
    if (decryptedData.tags && typeof decryptedData.tags === 'string') {
      try {
        const parsedTags = JSON.parse(decryptedData.tags);
        // Ensure tags is always an array
        decryptedData.tags = Array.isArray(parsedTags) ? parsedTags : [];
      } catch (error) {
        console.warn('Failed to parse tags JSON for tek:', error);
        // Fallback to empty array if parsing fails
        decryptedData.tags = [];
      }
    }

    // Ensure tags is an array even if it comes as null/undefined
    if (!decryptedData.tags || !Array.isArray(decryptedData.tags)) {
      decryptedData.tags = [];
    }
  }

  // Handle nested arrays (like flushes and iot_entities in BulkGrow)
  if (dataType === 'BulkGrow' && decryptedData.flushes && Array.isArray(decryptedData.flushes)) {
    decryptedData.flushes = await Promise.all(
      decryptedData.flushes.map(async (flush: any) => await decryptData('BulkGrowFlush', flush))
    );
  }

  if (
    dataType === 'BulkGrow' &&
    decryptedData.iot_entities &&
    Array.isArray(decryptedData.iot_entities)
  ) {
    decryptedData.iot_entities = await Promise.all(
      decryptedData.iot_entities.map(async (entity: any) => await decryptData('IoTEntity', entity))
    );
  }

  return decryptedData as T;
}

/**
 * Convenience function to encrypt array of data
 */
export async function encryptDataArray<T extends Record<string, any>>(
  dataType: DataType,
  dataArray: T[]
): Promise<T[]> {
  return await Promise.all(dataArray.map((item) => encryptData(dataType, item)));
}

/**
 * Convenience function to decrypt array of data
 */
export async function decryptDataArray<T extends Record<string, any>>(
  dataType: DataType,
  dataArray: T[]
): Promise<T[]> {
  return await Promise.all(dataArray.map((item) => decryptData(dataType, item)));
}

/**
 * Higher-order function to wrap API calls with automatic encryption/decryption
 */
export function withEncryption<
  TRequest extends Record<string, any>,
  TResponse extends Record<string, any>,
>(requestDataType: DataType | null, responseDataType: DataType | null) {
  return function encryptionWrapper(apiCall: (data: TRequest) => Promise<TResponse>) {
    return async function wrappedApiCall(data: TRequest): Promise<TResponse> {
      // Encrypt request data if needed
      let processedRequestData = data;
      if (requestDataType) {
        try {
          processedRequestData = await encryptData(requestDataType, data);
        } catch (error) {
          console.error(`Failed to encrypt ${requestDataType} request data:`, error);
          throw new Error(`Failed to encrypt ${requestDataType} data`);
        }
      }

      // Make API call
      const response = await apiCall(processedRequestData);

      // Decrypt response data if needed
      if (responseDataType) {
        try {
          return await decryptData(responseDataType, response);
        } catch (error) {
          console.error(`Failed to decrypt ${responseDataType} response data:`, error);
          throw new Error(`Failed to decrypt ${responseDataType} data`);
        }
      }

      return response;
    };
  };
}

/**
 * Wrapper for API calls that return arrays
 */
export function withEncryptionArray<TResponse extends Record<string, any>>(
  responseDataType: DataType
) {
  return function encryptionArrayWrapper(apiCall: () => Promise<TResponse[]>) {
    return async function wrappedApiCall(): Promise<TResponse[]> {
      const response = await apiCall();

      try {
        return await decryptDataArray(responseDataType, response);
      } catch (error) {
        console.error(`Failed to decrypt ${responseDataType} array response:`, error);
        throw new Error(`Failed to decrypt ${responseDataType} array data`);
      }
    };
  };
}

/**
 * Check if data appears to be encrypted (for debugging/validation)
 */
export function isDataEncrypted(data: any): boolean {
  if (typeof data === 'string') {
    const encryptionService = getEncryptionService();
    return encryptionService.isEncrypted(data);
  }

  if (typeof data === 'object' && data !== null) {
    return Object.values(data).some(
      (value) => typeof value === 'string' && getEncryptionService().isEncrypted(value)
    );
  }

  return false;
}

/**
 * Validate encryption configuration and identify any fields that might be missed
 * This helps enforce the "encrypt by default" rule by showing which fields will be encrypted
 */
export function validateEncryptionConfig(
  dataType: DataType,
  sampleData: Record<string, any>
): {
  fieldsToEncrypt: string[];
  fieldsToKeepUnencrypted: string[];
} {
  const allFields = Object.keys(sampleData);

  const fieldsToKeepUnencrypted: string[] = [];
  const fieldsToEncrypt: string[] = [];

  for (const field of allFields) {
    if (shouldEncryptField(dataType, field, sampleData)) {
      fieldsToEncrypt.push(field);
    } else {
      fieldsToKeepUnencrypted.push(field);
    }
  }

  return {
    fieldsToEncrypt,
    fieldsToKeepUnencrypted,
  };
}

/**
 * Debug helper to show encryption plan for data
 */
export function getEncryptionPlan(dataType: DataType, sampleData: Record<string, any>): void {
  const plan = validateEncryptionConfig(dataType, sampleData);
  console.log(`Encryption plan for ${dataType}:`);
  console.log('  + Fields to encrypt:', plan.fieldsToEncrypt);
  console.log('  - Fields to keep unencrypted:', plan.fieldsToKeepUnencrypted);
}
