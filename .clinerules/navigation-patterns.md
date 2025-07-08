## Brief overview

Guidelines for consistent navigation patterns in the React Native Expo Router application, focusing on proper handling of nested navigators (Drawer + Stack) and ensuring intuitive user experience with back button behavior.

## Drawer + Stack navigation pattern

- When using nested navigators (Drawer containing Stack), implement custom back buttons instead of default hamburger menus for detail/edit screens
- Users expect back button behavior when navigating from list views to detail/edit views, not drawer access
- Apply this pattern consistently across all sections: grows, IoT, lab, profile, and any future nested navigation scenarios

## Custom back button implementation

- Create reusable `BackButton` component using `TouchableOpacity` with `ArrowLeft` icon from lucide-react-native
- Use `router.back()` for navigation instead of hardcoded routes to maintain proper navigation stack
- Apply theme-aware styling using `headerTintColor` to match the app's dark/light mode
- Position with appropriate margins and padding: `style={{ marginLeft: 16, padding: 4 }}`

## Header management for nested navigators

- In Drawer layout: set `headerShown: true` and `headerLeft: () => <BackButton />` for dynamic routes like `[id]`
- In nested Stack layout: set `headerShown: false` to prevent double headers
- Hide drawer items from menu using `drawerItemStyle: { display: 'none' }` for detail routes
- Disable drawer swipe with `swipeEnabled: false` on screens where back navigation is primary intent

## Navigation UX consistency

- Maintain single, clean headers on detail/edit screens with appropriate back navigation
- Prevent accidental drawer opening on screens where users are focused on specific content
- Preserve proper navigation hierarchy where back buttons return to the logical previous screen
- Apply this pattern uniformly across all major app sections to ensure predictable user experience
