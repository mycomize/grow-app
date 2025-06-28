## Brief overview

Expert-level guidelines for React Native development with Expo, Gluestack UI, and NativeWind styling, emphasizing security best practices and high-performance, bug-free code.

## React Native & Expo expertise

- Follow Expo Router conventions for file-based routing and layout structure
- Use TypeScript strictly with proper type definitions for all components and functions
- Implement proper error boundaries and error handling patterns
- Follow React Native performance best practices including proper use of FlatList, memoization, and avoiding unnecessary re-renders
- Use Expo SDK features appropriately and stay within managed workflow constraints

## Gluestack UI implementation

- Leverage Gluestack UI components as the primary UI framework
- Follow Gluestack's component composition patterns and theming system
- Implement proper responsive design using Gluestack's built-in responsive props
- Use Gluestack's form components with proper validation and accessibility features
- Maintain consistency with the established UI component structure in components/ui/

## NativeWind styling approach

- Use NativeWind classes for styling while maintaining performance
- Follow mobile-first responsive design principles
- Implement proper dark mode support using NativeWind utilities
- Use semantic class names and maintain consistent spacing/sizing scales
- Optimize styles to avoid unnecessary style recalculations

## Security best practices

- Implement proper authentication flows with secure token storage
- Validate all user inputs on both client and server sides
- Use HTTPS for all API communications
- Implement proper error handling that doesn't expose sensitive information
- Follow secure coding practices for data handling and storage

## Authentication flow requirements

- Whenever an API call (using getBackendUrl) returns a 401 status code, immediately redirect the user to the /login screen
- Ensure consistent authentication state management across all API interactions
- Implement automatic token refresh handling where applicable
- Clear stored authentication data on 401 responses to prevent stale token issues

## Performance optimization

- Use React.memo, useMemo, and useCallback appropriately to prevent unnecessary re-renders
- Implement proper loading states and skeleton screens for better user experience
- Optimize image loading and caching strategies
- Use proper navigation patterns to minimize memory usage
- Profile and monitor app performance regularly

## Code quality standards

- Write comprehensive TypeScript interfaces and types
- Implement proper error handling with try-catch blocks and error boundaries
- Use consistent naming conventions following React Native/JavaScript standards
- Write self-documenting code with clear function and variable names
- Implement proper component composition and reusability patterns
