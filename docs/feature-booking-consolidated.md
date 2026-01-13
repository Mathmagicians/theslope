# Feature: Unified Booking Through Scaffold (ADR-016)
**Status:** ✅ SHIPPED | **Updated:** 2026-01-13

## Implementation Complete

All core ADR-016 functionality is implemented and tested:

| Component | Status |
|-----------|--------|
| `DesiredOrderSchema` with orderId/state | ✅ |
| `decideOrderAction()` decision matrix | ✅ |
| `resolveDesiredOrdersToBuckets()` | ✅ |
| `resolveOrdersFromPreferencesToBuckets()` | ✅ |
| `POST /api/household/order/scaffold` | ✅ |
| `bookings.ts` store methods | ✅ |
| `DinnerBookingForm` integration | ✅ |
| `BookingGridView` week/month grid | ✅ |
| Unit tests (94 useBooking + 199 validation) | ✅ |
| E2E tests (scaffold endpoint) | ✅ |
| ADR-016 documented | ✅ |
| Compliance docs updated | ✅ |

## Remaining Polish (Low Priority)

| Item | Notes |
|------|-------|
| `useBookingView` unit tests | ADR-006 URL-synced composable |
| `GuestBookingFields` tests | Component test coverage |
| `BookingGridView` component tests | Currently tested via E2E |

## Key Files

| File | Role |
|------|------|
| `app/composables/useBooking.ts` | Generator: `decideOrderAction`, bucket resolvers |
| `app/composables/useBookingValidation.ts` | Schemas: `DesiredOrderSchema`, `ScaffoldResultSchema` |
| `server/utils/scaffoldPrebookings.ts` | Scaffolder: executes buckets |
| `server/routes/api/household/order/scaffold.post.ts` | ADR-016 endpoint |
| `app/stores/bookings.ts` | `processSingleEventBookings`, `processMultipleEventsBookings` |
| `app/components/booking/BookingGridView.vue` | Week/month grid UI |
| `app/components/dinner/DinnerBookingForm.vue` | Day view booking form |
