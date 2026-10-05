# Bug Fix: Unify DesiredOrder Construction Across Booking Views

## Problem

In the week/month grid view (`/household/.../bookings`), saving a power-mode change for the whole
family shows a toast saying "fejlede" even though every network call returns 200 and no server
**error** is logged. The same operation works in day view.

## Root Cause

There are **three** independent "intent → `DesiredOrder`" builders that have drifted apart:

| Concern | Day — `DinnerBookingForm.buildDesiredOrdersForRow` | Grid preview — `BookingGridView.actionPreviewItems` | Grid save — `HouseholdBookings.handleGridSave` |
|---|---|---|---|
| Guest exclusion | ✅ via `regularOrders` | ✅ `&& !o.isGuestTicket` | ❌ **none** |
| Ticket price | pre-resolved `r.ticketPriceId` | `resolveTicketPrice(birthDate, null, prices)` (no event date) | `getTicketPriceForInhabitant(birthDate, prices, eventDate)` |
| orderId | `r.order?.id` (regular) | `existingOrder?.id` (regular) | `existingOrder?.id` (**incl. guest/duplicate**) |

The grid **save** path omits the guest filter (and uses a different price resolution than the
preview). Because `Order` has no `@@unique([inhabitantId, dinnerEventId])`, an unfiltered
`find` can attach a **guest or stale/duplicate order id** to a regular cell change. The server
then receives an `update` for an order its fresh fetch doesn't return and hits the silent skip
in `scaffoldPrebookings.ts:282` (`Order … not found … skipping`, `householdUpdateErrors++`),
which only emits `console.warn` — hence 200 + `errored=1` + no visible server error.

Two consequences:
1. Grid preview and grid save disagree → "clean preview, failing save".
2. Day vs week/month behave differently purely because the builders differ — not by design.

## Symptom Decode

`processMultipleEventsBookings: !1` (compact format) = `errored=1`, all other counts `0`.
The toast hardcodes `color: 'success'` and renders `formatScaffoldResult(..., 'past')`, so the
`errored` past-label "fejlede" is shown inside a green success toast.

## Solution

1. Extract one **module-level pure** builder in `useBooking.ts` (mirrors `decideOrderAction` —
   deps injected, unit-testable):
   `buildDesiredOrder(intent, existingOrders, inhabitants, dinnerEvents, resolveTicketPrice, BOOKED): DesiredOrder | null`
   - filters `!o.isGuestTicket` (single place)
   - one consistent, event-date-aware ticket-price resolution
   - single skip rule (`null` when no ticket price)
2. Repoint all three sites at it: `handleGridSave`, `actionPreviewItems`, and
   `DinnerBookingForm`'s inhabitant/power rows. Guest **creation** (`GuestBookingForm`) stays
   separate (guests are genuinely special).
3. Fix the toasts to read `result.scaffoldResult.errored` and switch to `color: 'error'`
   when non-zero (`handleGridSave`, `handleDayViewSave`, `handleAddGuest`).
4. Cleanup: `actionPreviewItems` lazily calls `useOrder()` → `useTheSlopeDesignSystem()` inside a
   `computed`, triggering `inject() outside setup` warnings. Resolve at setup, pass in.

## TDD

1. **Red** — parametrized unit test on `buildDesiredOrder` (`useBooking` spec):
   - new booking → `orderId: undefined`
   - existing regular → `orderId: <regular id>`
   - **guest-only on event → `orderId: undefined`** (today returns the guest id)
   - **regular + guest → `orderId: <regular id>`** (today may return the guest id)
   - E2E: member holds a guest ticket on a date; week-grid power-mode save asserts
     `scaffoldResult.errored === 0`, regular order updated, guest order untouched.
2. **Green** — implement builder; repoint the three call sites.
3. **Refactor/guard** — toast severity fix; existing day-view + preview tests stay green
   (proves no behavior change there).

## Affected Areas

- `app/composables/useBooking.ts` — new `buildDesiredOrder` (+ unit tests)
- `app/components/household/HouseholdBookings.vue` — `handleGridSave`, toast severity
- `app/components/booking/BookingGridView.vue` — `actionPreviewItems`, inject cleanup
- `app/components/dinner/DinnerBookingForm.vue` — `buildDesiredOrdersForRow`
- `tests/component/.../useBooking.*.spec.ts`, new E2E booking regression

## ADR Notes

- ADR-016: builder feeds the existing generator/scaffolder unchanged (still emits `DesiredOrder[]`).
- ADR-001/010: builder is pure, deps injected, domain types only.
- Out of scope (noted): `Order` lacks `@@unique([inhabitantId, dinnerEventId])`, allowing
  duplicates — consider a follow-up constraint + backfill.
