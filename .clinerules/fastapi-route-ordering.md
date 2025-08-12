## Brief overview

Guidelines for proper FastAPI route ordering to prevent path matching conflicts and ensure correct endpoint resolution, based on FastAPI's first-match routing behavior.

## Route ordering principles

- Always place more specific routes before more generic routes within the same router
- Routes with literal string segments must come before routes with path parameters that could match those strings
- FastAPI matches routes in the order they are defined, using the first pattern that matches
- Incorrect ordering can result in 422 "Input should be a valid integer" errors when strings are matched against integer path parameters

## Path parameter specificity

- Routes like `/{gateway_id}/entities/bulk-assign` must be defined before `/{gateway_id}/entities/{entity_id}`
- Routes with multiple path parameters should be ordered from most specific to least specific
- Literal endpoints like `/health` or `/status` should come before parameterized routes like `/{id}`

## Error prevention

- When adding new routes with path parameters, always check existing route definitions for potential conflicts
- Test new routes immediately after creation to ensure they are being matched correctly
- Use debug middleware or logging to verify which route is being matched during development

## Route organization

- Group related routes together but maintain proper specificity ordering within each group
- Document route ordering decisions when the logic might not be immediately obvious
- Consider using separate routers for different resource types to minimize ordering conflicts
