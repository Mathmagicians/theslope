# Booking System - Remaining Work
**Updated:** 2026-01-13

## ✅ COMPLETE: Core Booking (ADR-016)

All booking mutations now flow through unified scaffold endpoint. See [feature-booking-consolidated.md](feature-booking-consolidated.md).

---

## 🎯 NEXT: Ticket Claim Feature

Released tickets can be claimed by other households. Core infrastructure exists:

### What's Done

| Item | Status |
|------|--------|
| Order states (BOOKED, RELEASED, CLOSED) | ✅ |
| `releasedAt` timestamp for FIFO queue | ✅ |
| Release flow (NONE after deadline → RELEASED) | ✅ |
| `POST /api/order/claim` endpoint | ✅ |
| USER_CLAIMED audit action | ✅ |
| Provenance in OrderSnapshot (inhabitantName, householdShortname) | ✅ |
| GET /api/order with state filter | ✅ |

### Remaining Work

| Item | Priority | Notes |
|------|----------|-------|
| Claim UI in DinnerBookingForm | 🔴 High | Show "Ledige billetter" section |
| Available tickets query | 🔴 High | Filter RELEASED by dinnerEventId |
| Provenance display | 🟡 Medium | "🔄 fra AR_1" badge on claimed tickets |
| Original owner status view | 🟢 Low | Show "✅ Overtaget af S31" |

### UI Design

See [workplan-booking.md ASCII mockups](#ui-design-released-tickets-on-day-view) in git history for detailed wireframes.

**Key UX:**
- Available tickets shown in booking form: `🎟️ Ledige: [Voksen] 2 [Barn] 1`
- Guest row enabled only when released tickets exist
- Claimed tickets show provenance: `🔄 fra AR_1`

---

## 📋 Backlog (Future)

| Feature | Description |
|---------|-------------|
| PBS Export | Direct PBS file generation |
| Chef Budget View | Calculate budget from ticket counts |
| Ticket marketplace | List/browse released tickets |
