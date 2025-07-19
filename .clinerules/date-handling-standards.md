## Brief overview

Guidelines for handling date selection and formatting in the mycomize React Native application, ensuring consistent timezone-safe date handling across all date picker implementations.

## Date formatting for API storage

- Always use local timezone methods when formatting dates for API storage
- Use `getFullYear()`, `getMonth()`, and `getDate()` to extract date components in local time
- Format dates as YYYY-MM-DD strings using local timezone, not UTC conversion
- Never use `toISOString().split('T')[0]` as it causes timezone conversion issues

## Date parsing from API responses

- When parsing date strings from the API, use manual date construction to avoid timezone issues
- Split YYYY-MM-DD strings and construct dates with `new Date(year, month - 1, day)`
- Remember that JavaScript Date constructor months are 0-indexed

## DateTimePicker implementation pattern

- Use the established pattern from InoculationSection for all new date picker implementations
- Ensure `handleDateChange` function properly handles the picker dismissal case
- Format selected dates immediately using the local timezone approach
- Always set `activeDatePicker` to null after processing date selection

## Timezone considerations

- Assume users may be in any timezone globally
- Avoid any date operations that convert to/from UTC unless explicitly required
- Test date selection behavior across different timezones during development
- Ensure selected dates display as the exact same date the user picked, regardless of timezone

## Future date picker implementations

- Follow the exact formatDateForAPI pattern established in useGrowFormLogic.tsx
- Use the parseDate utility function for consistent date parsing
- Maintain the same user experience where selected date equals displayed date
