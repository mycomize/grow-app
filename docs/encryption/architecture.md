# Client-Side Encryption Architecture

## Overview

This document outlines the comprehensive client-side encryption architecture for the Mycomize application, implementing zero-knowledge encryption with BIP39 seed phrase recovery and optional two-factor encryption passwords.

## Goals

- **Zero-Knowledge Architecture**: Backend cannot decrypt user data
- **Seed Phrase Recovery**: Users can recover data on new devices using 12-word BIP39 seed phrases
- **Two-Factor Security**: Optional encryption password adds second security factor
- **Individual Field Encryption**: Each data field encrypted separately for efficient partial updates
- **Public Tek Sharing**: Teks can be shared publicly (cleartext) or kept private (encrypted)
- **Backwards Compatibility**: Smooth transition from current unencrypted system

## Security Requirements

### Cryptographic Standards

- **Key Derivation**: PBKDF2 with SHA-256 hash function and 100,000 iterations
- **Salt Format**: `"mycomize-<user_encryption_password>"` or `"mycomize"` if no password
- **Encryption**: AES-256-GCM for authenticated encryption
- **Seed Phrases**: BIP39 12-word mnemonic generation
- **Secure Storage**: Platform keychain/keystore for encrypted master keys

### Two-Factor Security Model

- **Factor 1**: 12-word BIP39 seed phrase (something you have)
- **Factor 2**: Optional encryption password (something you know)
- **Fallback**: If no encryption password set, uses default salt "mycomize"
- **User Choice**: Users can enable/disable encryption password for their security preference

### Threat Model

**Protected Against:**

- Server-side data breaches (encrypted data useless without keys)
- Network interception (only encrypted data transmitted)
- Database compromise (all user data encrypted)
- Seed phrase compromise alone (if encryption password enabled)

**Not Protected Against:**

- Device compromise with unlocked app
- Physical device access with biometric bypass
- Side-channel attacks on device crypto operations
- User sharing both seed phrase and encryption password

## Architecture Components

### 1. Frontend Encryption Service

**Location**: `mycomize/lib/EncryptionService.ts`

**Responsibilities:**

- BIP39 seed phrase generation and validation
- PBKDF2 key derivation with deterministic salt format
- AES-256-GCM encryption/decryption operations
- Secure master key storage in device keychain
- Encryption password management (separate from app login)
- Ciphertext format management and validation

### 2. Backend Data Storage

**Models**: All user data models (BulkGrow, BulkGrowTek, User, etc.)

**Field Strategy:**

- Convert all user data fields from specific types (String, Integer, JSON) to TEXT
- Store either cleartext (public teks) or ciphertext (private data)
- Prefix encrypted values with "enc\_" for identification
- Maintain system fields (id, timestamps, foreign keys) unencrypted

### 3. Public/Private Data Handling

**Tek Sharing Logic:**

- `is_public=true`: Store all tek data in cleartext for search/discovery
- `is_public=false`: Store all tek data encrypted with user's key
- User can toggle privacy setting, triggering encryption/decryption

## Data Flow

### Encryption Flow (Save Data)

```
User Input → Frontend Form → EncryptionService.encrypt() → Backend API → Database (TEXT fields)
```

1. User enters data in form fields
2. Frontend determines if data should be encrypted (based on privacy settings)
3. For encrypted data: Each field encrypted individually with user's master key
4. API request sent with either cleartext or ciphertext values
5. Backend stores values as-is in TEXT fields (no backend decryption)

### Decryption Flow (Load Data)

```
Database → Backend API → Frontend → EncryptionService.decrypt() → UI Display
```

1. Backend returns stored TEXT values (cleartext or ciphertext)
2. Frontend identifies encrypted fields by "enc\_" prefix
3. Encrypted fields decrypted using stored master key
4. Decrypted data displayed in UI forms

### Seed Phrase Recovery Flow

```
New Device → Seed Phrase + Encryption Password → Key Derivation → Existing Data Decryption
```

1. User enters 12-word seed phrase on new device
2. User enters encryption password (or skips if none was set)
3. System derives same master key using PBKDF2(seed_phrase, salt, 100k iterations, SHA-256)
4. Encrypted master key stored in new device's keychain
5. Existing encrypted data becomes readable with restored key

## Key Management Lifecycle

### Initial Setup

1. Generate cryptographically secure 12-word BIP39 seed phrase
2. Display seed phrase to user with backup instructions
3. Prompt user for optional encryption password (separate from app login)
4. Create salt: `"mycomize-<encryption_password>"` or `"mycomize"` if no password
5. Derive master key using PBKDF2(seed_phrase, salt, 100k iterations, SHA-256)
6. Encrypt master key with device-specific key and store in keychain
7. Clear seed phrase and encryption password from memory

### Normal Operation

1. Retrieve encrypted master key from device keychain
2. Decrypt master key using device-specific key
3. Use master key for data encryption/decryption operations
4. Clear master key from memory after operations

### Device Migration

1. User enters seed phrase on new device
2. User enters encryption password (if one was set during setup)
3. Create same salt format: `"mycomize-<encryption_password>"` or `"mycomize"`
4. Derive identical master key using same PBKDF2 parameters (SHA-256, 100k iterations)
5. Verify key correctness by attempting to decrypt existing data
6. Store encrypted master key in new device's keychain

### Encryption Password Changes

1. User enters current encryption password and new encryption password
2. Derive old master key with current salt
3. Derive new master key with new salt format
4. Re-encrypt all user data with new master key
5. Update stored master key in keychain

## Key Derivation Details

### PBKDF2 Specification

```typescript
// Salt format
const salt = encryptionPassword ? `mycomize-${encryptionPassword}` : "mycomize";

// PBKDF2 parameters
const pbkdf2Params = {
  name: "PBKDF2",
  salt: new TextEncoder().encode(salt),
  iterations: 100000,
  hash: "SHA-256", // Chosen for optimal security/performance balance
};

// Key derivation
const masterKey = await crypto.subtle.deriveKey(
  pbkdf2Params,
  seedKeyMaterial,
  { name: "AES-GCM", length: 256 },
  false,
  ["encrypt", "decrypt"]
);
```

### Cryptographic Rationale

- **SHA-256**: Provides 256-bit security, excellent performance on mobile devices
- **100,000 iterations**: Balances security against brute force with mobile performance
- **AES-256-GCM**: Industry standard authenticated encryption
- **Deterministic salt**: Enables recovery while maintaining per-user uniqueness

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)

- [ ] Implement EncryptionService with BIP39, PBKDF2-SHA256, AES-GCM
- [ ] Create seed phrase management components
- [ ] Add encryption password setup and management
- [ ] Set up secure key storage with React Native Keychain
- [ ] Build encryption format standards and validation

### Phase 2: Backend Updates (Week 3-4)

- [ ] Update model field types from specific types to TEXT
- [ ] Update Pydantic schemas for new field types
- [ ] Test backend with mixed cleartext/ciphertext data
- [ ] Ensure API compatibility with existing frontend

### Phase 3: Frontend Integration (Week 5-6)

- [ ] Update form logic to encrypt before save operations
- [ ] Update data loading to decrypt after API responses
- [ ] Add encryption setup flow to authentication process
- [ ] Implement public/private toggle for teks
- [ ] Add encryption password change functionality

### Phase 4: Testing & Security (Week 7)

- [ ] End-to-end encryption testing across all data types
- [ ] Security audit of key management and crypto operations
- [ ] Test recovery flows with various password combinations
- [ ] Performance optimization for encryption overhead
- [ ] User acceptance testing for seed phrase and password flows

## Security Considerations

### Key Storage Security

- Master keys encrypted with device-specific keys before keychain storage
- Keys cleared from memory immediately after use
- No keys transmitted over network or stored in application state
- Encryption passwords never stored, only used for key derivation

### Ciphertext Integrity

- AES-GCM provides authenticated encryption (confidentiality + integrity)
- Tampering with ciphertext will cause decryption failures
- Version headers in ciphertext enable future crypto upgrades

### Two-Factor Security

- Seed phrase compromise alone insufficient if encryption password set
- Encryption password can be changed without affecting seed phrase
- Users can upgrade from single-factor to two-factor security
- Recovery requires both factors if encryption password was set

### Operational Security

- Seed phrases displayed only during setup and backup flows
- Encryption passwords entered only during setup, recovery, and changes
- No logging or caching of decrypted data or passwords
- Secure random number generation for all crypto operations
- Protection against timing attacks in key derivation

### Privacy Considerations

- Public teks stored in cleartext enable search but sacrifice privacy
- Users must explicitly choose public sharing for each tek
- Private data remains encrypted even during public sharing
- Encryption password adds layer against seed phrase compromise

## User Experience Flow

### First-Time Setup

1. User creates account with regular app login password
2. System generates and displays 12-word seed phrase for backup
3. User prompted to set optional encryption password (separate from login)
4. User confirms seed phrase backup completion
5. Encryption setup complete, user can now save encrypted data

### Recovery on New Device

1. User logs in with regular app credentials
2. System detects no encryption key on device
3. User enters 12-word seed phrase
4. User enters encryption password (if one was set originally)
5. System derives key and verifies against existing encrypted data
6. Recovery complete, user can access all encrypted data

### Encryption Password Management

1. User can enable encryption password if not set during initial setup
2. User can change existing encryption password through settings
3. User can remove encryption password (downgrade to single-factor)
4. All changes require current credentials and re-encrypt existing data

## Monitoring and Alerts

### Success Metrics

- Successful encryption/decryption operations
- Seed phrase recovery success rate
- Encryption password setup and usage rates
- User adoption of backup flows

### Error Monitoring

- Decryption failures (potential corruption or wrong password)
- Key derivation timeouts or failures
- Keychain access denials or corruption
- Recovery attempt failures

### Security Alerts

- Unusual patterns in decryption failures
- Multiple failed seed phrase or password attempts
- Keychain corruption incidents
- Downgrade from two-factor to single-factor security

## Future Enhancements

### Advanced Features

- Multi-device key synchronization
- Hardware security module integration
- Biometric authentication for encryption password
- Advanced key rotation strategies
- Backup verification with test decryption

### Scalability Improvements

- Batch encryption operations for large datasets
- Background encryption for imported data
- Optimized key derivation for performance
- Progressive data encryption for large migrations

### User Experience

- Progressive encryption setup with guided tutorials
- Enhanced backup verification flows
- Recovery assistance for partial information
- Security level indicators and recommendations
