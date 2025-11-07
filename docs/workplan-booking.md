# Booking Feature - Work Plan

## Business Requirements

### Core Model

**Order = One Ticket**
- One Order represents one ticket for one Inhabitant for one DinnerEvent
- User can create multiple Orders for the same Inhabitant (extra/guest tickets)
- Financial ownership: `bookedByUserId` (User who pays - changes on claim)
- Ticket holder: `inhabitantId` (Inhabitant who eats - changes on claim)
- Price: `priceAtBooking` (frozen at booking time - never changes)

**Household Booking Rules**
- Any User in a household can book tickets for ANY Inhabitant in that household
- User claims tickets for Inhabitants in their own household
- Example: Parent (User) books tickets for kids (Inhabitants)

### State Machine

```
BOOKED ──[cancel before deadline]──> HARD DELETE (order removed from DB)
BOOKED ──[release after deadline]──> RELEASED (available for marketplace)
RELEASED ──[claimed by user]──────> BOOKED (inhabitantId + bookedByUserId change)
BOOKED ──[dinner time]────────────> Transaction created by cron
```

**States:**
- `BOOKED` - Normal state, ticket assigned and paid for
- `RELEASED` - Available in marketplace for anyone to claim
- No CANCELLED or PENDING states

### Business Rules

**Cancellation (Before Deadline)**
- Deadline: `Season.ticketIsCancellableDaysBefore` calendar days before event at midnight UTC
- Action: HARD DELETE order from database
- Result: No transaction created, order completely removed
- Audit: Create audit entry with orderSnapshot before deletion

**Release (After Deadline)**
- Only original owner can release their BOOKED orders
- Order state changes to RELEASED
- Stays RELEASED until someone claims it (no time limit)
- Only original owner can delete RELEASED orders

**Claim (Marketplace)**
- Any authenticated user can claim RELEASED orders
- Claimer assigns to any Inhabitant in their household
- Claimer becomes financial owner (`bookedByUserId` changes)
- Ticket holder changes (`inhabitantId` changes)
- Price remains frozen (`priceAtBooking` unchanged)
- State changes back to BOOKED

**Transaction Creation (Cron)**
- Runs hourly via Cloudflare Worker
- Creates Transaction for all orders in BOOKED state at dinner time
- Uses frozen `priceAtBooking` amount
- Only BOOKED orders generate transactions (RELEASED orders do not)

### Audit Trail

**Purpose:** Dispute resolution and billing transparency

**Scenarios:**
- "I thought I had tickets but don't see them" → Show if user cancelled or someone claimed
- "Why was I charged?" → Prove user had order at dinner time

**Requirements:**
- Track all state changes (created, released, claimed, deleted)
- Track ownership changes (inhabitantId changes on claim)
- Track who performed each action (`performedByUserId`)
- Preserve audit even after order deletion (`OrderAudit.orderId` nullable with `onDelete: SetNull`)
- For deletions: Capture order snapshot (JSON) before removal

**Audit Fields:**
- `orderId` - Nullable, survives order deletion
- `fromState` / `toState` - State transitions
- `fromInhabitantId` / `toInhabitantId` - Ownership changes
- `performedByUserId` - User who performed action
- `orderSnapshot` - JSON snapshot for deleted orders
- `timestamp` - When action occurred

### Data Retention

- Keep orders for ~3 months after dinner for disputes
- Cron job cleans up old orders after retention period
- Audit trail preserved even after order cleanup

### Technical Constraints

- **Database**: Cloudflare D1 (SQLite) - no database transactions
- **Architecture**: Follow ADR-005 (CASCADE vs SET NULL)
- **Serialization**: Follow ADR-010 (domain-driven serialization)
- **API Validation**: Follow ADR-002 (separate validation/business logic)

### CASCADE vs SET NULL Decisions

**CASCADE (strong relationships):**
- Order → DinnerEvent (order can't exist without event)
- Order → Inhabitant (order can't exist without ticket holder)

**SET NULL (weak relationships - preserve data):**
- Order → User (bookedByUserId) - preserve orders if user deleted
- OrderAudit → Order (orderId) - preserve audit if order deleted
- OrderAudit → User (performedByUserId) - preserve audit if user deleted

## Implementation Phases

### Phase 1: Database Schema
- Add OrderState enum (BOOKED, RELEASED)
- Update Order model (add state, bookedByUserId, priceAtBooking)
- Create OrderAudit model
- Migration script

### Phase 2: API Endpoints
- POST /api/booking/order - Create order(s)
- DELETE /api/booking/order/:id - Cancel order
- PATCH /api/booking/order/:id/release - Release order
- PATCH /api/booking/order/:id/claim - Claim order
- GET /api/booking/dinner-event/:id/orders - List orders
- GET /api/booking/dinner-event/:id/available - List available orders

### Phase 3: Repository & Business Logic
- Composables (useOrderValidation, useOrderStateTransitions)
- Repository functions (create, cancel, release, claim)
- Business rules (deadline calculation, state validation)

### Phase 4: Cron Job
- Cloudflare Worker for transaction creation
- Process dinner events hourly
- Create transactions for BOOKED orders
- Cleanup old orders (3+ months)

### Phase 5: UI Components
- Booking dialog
- Order list/management
- Marketplace for available orders
- State indicators

## Open Questions

- [ ] Admin endpoints for order management?
- [ ] Notification system (email/SMS) for state changes?
- [ ] Waitlist functionality if dinner is "full"?
- [ ] Reports/analytics on booking patterns?