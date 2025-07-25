## Brief overview

Guidelines for maintaining documentation synchronization throughout development, ensuring that all design documents, API specifications, and implementation guides remain current with code changes.

## Documentation maintenance workflow

- Create initial design documents before implementation begins
- Update relevant documentation in the same commit/PR as code changes
- Include documentation reviews as part of the code review process
- Treat outdated documentation as technical debt requiring immediate attention

## Documentation update requirements

- API changes must immediately update API documentation with working examples
- Security-related changes require updates to security specifications and threat models
- User flow changes must update UX documentation and recovery procedures
- Architecture changes require updates to design documents and diagrams

## Validation and quality assurance

- Test all code examples included in documentation against actual implementation
- Validate API examples to ensure they work with current endpoints
- Conduct regular documentation audits to identify and fix documentation drift
- Verify that architectural diagrams reflect current implementation

## Documentation scope for changes

- Backend model changes require schema documentation updates
- Frontend component changes need integration guide updates
- New features require complete documentation including user flows, API specs, and implementation guides
- Security implementations must include comprehensive security documentation and compliance considerations
