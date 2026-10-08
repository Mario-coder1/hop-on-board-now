# Project rules
- Keep payment administration focused on platform reservation fees and card authorization/capture/refund states, never driver payouts; drivers collect their fares separately and historical payout fields do not represent current payments.
- Preserve backend payment and refund behavior when updating public payment copy; wording changes must not alter money movement or historical records.
- Use the shared DriverSpokenLanguages display and spoken-language catalog on discovery cards so saved driver languages render consistently across screen sizes.