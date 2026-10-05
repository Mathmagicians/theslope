# Bug Fix: Add Snapshot to Order for Robust Portion Calculations

## Problem

Kitchen statistics show incorrect portion counts (0 portions, 0 for sale) when orders have `ticketPriceId: null`.

## Root Cause

- `ticketType` is derived from the `ticketPrice` relation
- When `ticketPriceId` is null, `ticketType` becomes null
- Portion calculations return 0 for null `ticketType`

## Current State

- Order has `priceAtBooking` (frozen price) but NOT frozen `ticketType`
- Transaction has `orderSnapshot` with fallback logic - Order should follow same pattern
- `OrderSnapshotSchema` exists but is missing `ticketType` field

## Solution

1. Add `ticketType` to `OrderSnapshotSchema`
2. Add `orderSnapshot` field to Order model (like Transaction has)
3. Capture snapshot at booking time with `ticketType` from related TicketPrice
4. Update portion calculation to use snapshot as fallback when relation is null

## Affected Areas

- `KitchenPreparation.vue` - displays portion counts
- `useOrder.ts` - portion calculation functions
- `useBookingValidation.ts` - snapshot schema
- `financesRepository.ts` - order creation
- `scaffoldPrebookings.ts` - order scaffolding

## Migration

Backfill existing orders with null `ticketPriceId` by matching `priceAtBooking` to season's ticket prices.
