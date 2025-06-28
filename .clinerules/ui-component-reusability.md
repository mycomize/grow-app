## Brief overview

Guidelines for creating reusable UI components and maintaining consistency across the React Native application, with emphasis on identifying patterns and consolidating duplicate code into shared components.

## Component reusability principles

- When encountering similar UI patterns across multiple screens, create a centralized reusable component rather than duplicating code
- Place reusable UI components in the `~/components/ui/` directory following the existing structure
- Export both the component and any related TypeScript types for proper type safety
- Support multiple sizes and variants when applicable (sm/md/lg, different themes, etc.)

## Refactoring workflow

- Systematically identify all existing implementations of similar UI patterns before creating the reusable component
- Use the most complete/polished existing implementation as the basis for the new component
- Update all identified locations to use the new component in a single refactoring effort
- Ensure proper TypeScript type safety throughout the refactoring process

## TypeScript component patterns

- Export TypeScript types alongside components for reuse (e.g., `ConnectionStatus` type)
- Use union types for component props that have specific allowed values
- Implement proper prop interfaces with required and optional properties
- Use type assertions carefully when bridging between different type systems

## State management consistency

- Handle transitional states appropriately (e.g., "connecting" state during async operations)
- Use consistent state naming and structure across similar components
- Implement proper state transitions that provide clear user feedback

## Future development standards

- Always check for existing reusable components before implementing new UI patterns
- When adding new connection/status indicators, use the established `ConnectionStatusBadge` component
- Maintain backward compatibility when updating shared components
- Document component usage patterns and props in component files
