# Feature: BookingGridView

**ADR Reference:** [ADR-016: Grid Booking Pattern with Draft State](./adr.md#adr-016-grid-booking-pattern-with-draft-state)

## Overview
Unified week/month grid for household booking management. Reuses display logic from DinnerBookingForm. Uses **draft state pattern** with Cancel/Save, and `processGridBooking` workhorse.

**ASCII layouts:** See `BookingGridView.vue` component header for VIEW/EDIT mode layouts.

## Row Types (same as DinnerBookingForm)
| Row Type | When Shown | Description |
|----------|------------|-------------|
| `power` | Edit mode | Updates ALL inhabitants for clicked column |
| `inhabitant` | Always | Regular household member |
| `guest` | Edit mode | Add new guest ticket for a day |
| `guest-order` | Always (if exists) | Existing guest bookings |

## Cell Display
Reuse existing components:
- **DinnerModeSelector** with `interaction="toggle"` for mode cycling
- Released/claimed status: icon + accent color (from DinnerTicket pattern)
- Compact: just mode icon + status icon (no full ticket in grid)

| State | Icon | Accent |
|-------|------|--------|
| Normal | mode icon | primary |
| Released | 📤 + mode | error |
| Claimed | 🎟️ + mode | info |

## Architecture (ADR-016)

### Workhorse: processGridBooking
Single function handles ALL booking mutations:

```typescript
type GridBookingChange = {
  inhabitantId: number
  dinnerEventId: number
  dinnerMode: DinnerMode
}

const processGridBooking = async (
  changes: GridBookingChange[],
  existingOrders: OrderDisplay[],
  inhabitants: Pick<InhabitantDisplay, 'id' | 'birthDate'>[],
  ticketPrices: TicketPrice[],
  dinnerEventDates: Map<number, Date>,
  householdId: number,
  userId: number
): Promise<GridBookingResult>
```

### Specialization: processBooking
Single-dinner API delegates to workhorse:

```typescript
const processBooking = async (...) => {
  const changes = inhabitants.map(i => ({
    inhabitantId: i.id,
    dinnerEventId: dinnerId,
    dinnerMode
  }))
  return processGridBooking(changes, ...)
}
```

## Files
| File | Action | Status |
|------|--------|--------|
| `dinner/DinnerModeSelector.vue` | Reuse (`interaction="toggle"`) | ✅ Done |
| `dinner/DinnerTicket.vue` | Reuse patterns (released/claimed) | ✅ Done |
| `dinner/DinnerBookingForm.vue` | Reference for row types | ✅ Done |
| `booking/BookingGridView.vue` | Create with draft state | ⚠️ Partial |
| `stores/bookings.ts` | Add `processGridBooking` | ❌ TODO |

## Implementation Checklist

### Phase 1: Workhorse Function
- [ ] Add `GridBookingChange`, `GridBookingResult` types
- [ ] Implement `processGridBooking` in bookingsStore
- [ ] Refactor `processBooking` to delegate
- [ ] Tests

### Phase 2: Grid View
- [ ] Draft state Map
- [ ] Cell display with released/claimed status
- [ ] Mode toggle (DinnerModeSelector)
- [ ] Power row
- [ ] Guest rows (add + existing)
- [ ] Cancel/Save buttons
- [ ] Amount column

### Phase 3: Polish
- [ ] Week boundary styling
- [ ] Navigation (◀ ▶)
- [ ] Error handling
- [ ] E2E tests
