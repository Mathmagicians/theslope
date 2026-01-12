# Feature: Unified Booking Through Scaffold (ADR-016)
**Status:** In Progress | **Updated:** 2026-01-12

## Problem Summary

Abstract composite keys (`inhabitantId-dinnerEventId`) caused:
1. **BUG #1:** NONE after deadline deletes instead of releases
2. **BUG #2:** Single-user edit deletes other household members
3. **BUG #3:** Guest tickets indistinguishable (same abstract key)
4. **BUG #0:** Missing handler in HouseholdBookings day view

## Solution

Use `orderId` for updates. Generator decides intent → Scaffolder executes.

### Decision Matrix

| `orderId` | `dinnerMode` | `existing` | `deadline` | → Action |
|-----------|--------------|------------|------------|----------|
| absent | ≠ NONE | N/A | any | **CREATE** |
| absent | = NONE | N/A | any | SKIP |
| present | = NONE | found | before | **DELETE** |
| present | = NONE | found | after | **RELEASE** (→ RELEASED state) |
| present | ≠ NONE | found, same | any | **IDEMPOTENT** |
| present | ≠ NONE | found, diff | any | **UPDATE** |
| present | any | not found | any | SKIP (stale) |

## Implementation Status

### ✅ Phase 1: Schema Updates
- `DesiredOrderSchema` includes `orderId` (optional) and `state` (required)

### ✅ Phase 2: Generator Refactor (useBooking.ts)
- `decideOrderAction()` - Pure decision function implementing matrix above
- `resolveDesiredOrdersToBuckets()` - Batch processor for user mode
- `generateDesiredOrdersFromPreferences()` - System mode generator
- `resolveOrdersFromPreferencesToBuckets()` - System scaffolding (flat function)
- Orphan order detection for system mode

### ✅ Phase 3: Test Migration
- 94 tests in useBooking.nuxt.spec.ts (all passing)
- 75 tests in useSeason.nuxt.spec.ts (all passing)
- 199 tests in useBookingValidation.unit.spec.ts (all passing)

### ✅ Phase 4: Dead Code Cleanup
- Removed `reconcilePreBookings` from useSeason.ts
- Removed `convertDesiredToOrderCreate` from useBookingValidation.ts
- Cleaned unused imports

### ⏳ Phase 5: Component Updates (IN PROGRESS)
- [x] DinnerBookingForm: include orderId and state in emitted DesiredOrder
- [x] HouseholdBookings.handleGridSave: include orderId and state
- [x] useBooking.buildGuestOrder: include state
- [x] Store refactored: processSingleEventBookings + processMultipleEventsBookings
- [x] dinner/index.vue: updated to use processSingleEventBookings
- [ ] HouseholdBookings day view: ADD missing @save-bookings handler for DinnerBookingForm
- [ ] BookingGridView: guest booking UX (currently emits addGuest, needs design decision)

### ⏳ Phase 6: Final Cleanup (PENDING)
- [ ] Fix remaining lint errors
- [ ] Update ADR-016 in docs/adr.md
- [ ] Full E2E regression tests

## Key Files

| File | Role |
|------|------|
| `app/composables/useBooking.ts` | Generator: `decideOrderAction`, `resolveDesiredOrdersToBuckets` |
| `app/composables/useBookingValidation.ts` | Schemas: `DesiredOrderSchema`, `ScaffoldResultSchema` |
| `server/utils/scaffoldPrebookings.ts` | Scaffolder: executes buckets from generator |

## Success Criteria

- [x] Generator returns buckets (create/update/delete/release/idempotent)
- [x] Scaffolder just executes (no business logic)
- [x] orderId enables tracking specific orders
- [ ] All 4 bugs fixed via UI
- [ ] Tests pass
- [ ] ADR updated
