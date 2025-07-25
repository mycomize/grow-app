## Brief overview

Security-focused guidelines for implementing and maintaining client-side encryption in the Mycomize application, ensuring all user data is encrypted by default with explicit allowlist for unencrypted fields.

## Default encryption principle

- All new user data fields must be encrypted by default unless explicitly added to an allowlist
- When adding fields to backend models, always use TEXT type to support encryption
- Frontend forms must encrypt all user input before sending to backend APIs
- Only system/metadata fields (id, timestamps, foreign keys, is_active) remain unencrypted

## Allowlist approach for unencrypted data

- Maintain explicit allowlists in encryption configuration for any fields that should remain unencrypted
- Public tek fields can be stored in cleartext only when is_public=true
- Authentication fields (username, hashed_password) remain unencrypted for system functionality
- Document and justify any additions to unencrypted allowlists

## Model and schema changes

- Convert user data fields to TEXT type in SQLAlchemy models to support ciphertext storage
- Update Pydantic schemas to use Optional[str] for all user data fields
- Remove database indexes on fields that will be encrypted (can't index encrypted data)
- Add new fields to the appropriate encryption configuration immediately upon creation

## Frontend data handling

- Use the DataEncryption utility functions for all API calls involving user data
- Encrypt data before sending to backend, decrypt after receiving from backend
- Handle both cleartext and ciphertext gracefully in case of mixed data states
- Test encryption/decryption flows thoroughly when adding new data fields

## Security validation requirements

- Verify that new fields appear in encryption configuration before deployment
- Test that new fields are properly encrypted in database storage
- Ensure error handling for encryption/decryption failures doesn't expose sensitive data
- Validate that field changes don't accidentally expose previously encrypted data
