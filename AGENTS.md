# Project rules
- Use shared discovery statuses for passenger listings; departure time alone must not be interpreted as an ended ride, while booking and lifecycle safeguards remain independent.
- Keep payment administration focused on platform reservation fees and card authorization/capture/refund states, never driver payouts; drivers collect their fares separately and historical payout fields do not represent current payments.
- Preserve backend payment and refund behavior when updating public payment copy; wording changes must not alter money movement or historical records.
- Use the shared DriverSpokenLanguages display and spoken-language catalog on discovery cards so saved driver languages render consistently across screen sizes.
- Route shared ride links through the public `ride-share` Edge Function so social crawlers receive server-rendered route metadata while browsers continue to the protected ride page.
- Search metrics use consent-gated, debounced shared tracking with anonymous session UUIDs and result counts only; admin aggregates require server-verified roles and reservation totals remain separate from search conversions.
- Ride-detail location previews reuse useDriverTracking and label positions with their recorded time; unavailable or old GPS must never imply a current position or alter booking safeguards.