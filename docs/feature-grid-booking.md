# Feature: BookingGridView
**Status:** ✅ SHIPPED | **Updated:** 2026-01-13

## Overview
Week/month grid for household booking management. Uses ADR-016 scaffold pattern with draft state.

## Implementation Complete

| Feature | Status |
|---------|--------|
| Grid view component | ✅ `BookingGridView.vue` |
| View switcher (day/week/month) | ✅ `BookingViewSwitcher.vue` |
| URL-synced view state | ✅ `useBookingView()` |
| Draft state pattern | ✅ Cancel/Save workflow |
| Power row (all inhabitants) | ✅ |
| Inhabitant rows | ✅ |
| Guest order rows | ✅ |
| Mode toggle per cell | ✅ `DinnerModeSelector` |
| Week navigation (◀ ▶) | ✅ |
| Store integration | ✅ `processMultipleEventsBookings` |
| E2E tests | ✅ Indirect via scaffold tests |

## Remaining Polish

| Item | Notes |
|------|-------|
| Component unit tests | Currently E2E only |
| `useBookingView` unit tests | URL sync composable |
| Guest add UX in grid | Currently day view only |

## Key Files

| File | Role |
|------|------|
| `app/components/booking/BookingGridView.vue` | Grid UI component |
| `app/components/booking/BookingViewSwitcher.vue` | Day/week/month toggle |
| `app/composables/useBookingView.ts` | URL-synced view/date state |
| `app/stores/bookings.ts` | `processMultipleEventsBookings()` |
