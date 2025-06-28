## Brief overview

Guidelines for backend development focusing on code organization, security, and maintainability within the FastAPI/Python backend of the mycomize project.

## Database and model changes

- When adding fields to backend models, proceed with the changes knowing that database migrations will be handled separately by the user
- Focus on proper model structure and relationships without worrying about migration scripts
- Ensure new fields have appropriate types, constraints, and default values where applicable

## Code organization principles

- Maintain clear separation between models, schemas, routers, and business logic
- Keep the backend code organized with appropriate levels of abstraction and modularity
- Only reorganize the codebase when highly confident the changes will not introduce security issues or bugs
- Preserve the existing structure: models/, schemas/, routers/ directories with clear responsibilities

## Security and reliability standards

- Only make changes when highly confident they will not introduce security vulnerabilities
- Maintain existing security patterns and authentication flows
- Prioritize code reliability over ambitious refactoring
- Be conservative with structural changes that could affect system stability

## Development approach

- Focus on readability and maintainability over clever optimizations
- Use clear, descriptive naming conventions consistent with the existing codebase
- Implement proper error handling and validation patterns
- Maintain consistency with existing FastAPI patterns and conventions

## Code quality expectations

- Ensure all backend code remains easy to read and understand
- Create appropriate levels of abstraction without over-engineering
- Keep related functionality grouped logically within the established directory structure
- Document complex business logic when necessary for future maintenance
