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
BOOKED/RELEASED ──[dinner time]───> CLOSED (transaction created, owner charged)
CLOSED ──[retention period]───────> HARD DELETE (cleanup after ~3 months)
```

**States:**
- `BOOKED` - Normal state, ticket assigned and paid for
- `RELEASED` - Available in marketplace for anyone to claim
- `CLOSED` - Past dinner, transaction created, awaiting cleanup
- No CANCELLED or PENDING states

### Business Rules

**Cancellation (Before Deadline)**
- Deadline: `Season.ticketIsCancellableDaysBefore` calendar days before event at midnight UTC
- Action: HARD DELETE order from database
- Result: No transaction created, order completely removed
- History: Create OrderHistory entry with order snapshot in auditData before deletion

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
- Creates Transaction for ALL orders (BOOKED or RELEASED) at dinner time
- After transaction creation, order state changes to CLOSED
- Financial liability rules:
  - BOOKED order → owner pays (`bookedByUserId`)
  - RELEASED unclaimed order → original owner STILL pays (`bookedByUserId` unchanged)
  - RELEASED claimed order → BOOKED -> new owner pays (new `bookedByUserId`)
  - CLOSED - transaction has been generated, and shows in the economy tab of the household. Will be added to monthly statement
  - Only DELETED orders (cancelled before deadline) don't generate transactions
- Uses frozen `priceAtBooking` amount

**Closed Orders (After Dinner)**
- Orders in CLOSED state have transaction already created
- Order CLOSED <-> 1:1 Transaction
- Cannot be cancelled, released, or claimed
- Retained for ~3 months for dispute resolution
- Cleaned up via cron job after retention period
- OrderHistory preserved even after cleanup

** Transactions **
- Available in economy tab of household
- Monthly statement, and monthly billing (future work)

### Order History

**Purpose:** Dispute resolution and billing transparency

**Scenarios:**
- "I thought I had tickets but don't see them" → Show if user cancelled or someone claimed
- "Why was I charged?" → Prove user had order at dinner time

**Requirements:**
- Track all state changes (created, released, claimed, closed, deleted)
- Track ownership changes (inhabitantId changes on claim)
- Track who performed each action (`performedByUserId`)
- Preserve history even after order deletion (`OrderHistory.orderId` nullable with `onDelete: SetNull`)
- For deletions: Capture order snapshot in JSON

**History Fields:**
- `orderId` - Nullable, survives order deletion
- `action` - What happened (CREATED, RELEASED, CLAIMED, CLOSED, DELETED)
- `performedByUserId` - User who performed action
- `auditData` - JSON with action-specific data (state transitions, ownership changes, snapshots)
- `timestamp` - When action occurred

### Data Retention

- Keep orders for ~3 months after dinner for disputes
- Cron job cleans up old orders after retention period
- OrderHistory preserved even after order cleanup

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
- OrderHistory → Order (orderId) - preserve history if order deleted
- OrderHistory → User (performedByUserId) - preserve history if user deleted

## Implementation Phases

### Phase 1: Database Schema

#### 1.1 New OrderState Enum
```prisma
enum OrderState {
  BOOKED    // Normal state - ticket assigned and will be paid for
  RELEASED  // Available in marketplace for claiming, will be paid for by owner in unclaimed
  CLOSED    // Order consumed and can not be changed, transaction created, awaiting cleanup
}
```

#### 1.2 Updated Order Model
```prisma
model Order {
  id              Int          @id @default(autoincrement())
  dinnerEventId   Int
  dinnerEvent     DinnerEvent  @relation(fields: [dinnerEventId], references: [id], onDelete: Cascade)
  inhabitantId    Int
  inhabitant      Inhabitant   @relation(fields: [inhabitantId], references: [id], onDelete: Cascade)
  bookedByUserId  Int?         // User who pays (changes on claim)
  bookedByUser    User?        @relation("BookedByUser", fields: [bookedByUserId], references: [id], onDelete: SetNull)
  ticketType      TicketType
  priceAtBooking  Int          // Frozen price at booking time
  state           OrderState   @default(BOOKED)
  releasedAt      DateTime?    // When order was released
  closedAt        DateTime?    // When transaction was created
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  Transaction     Transaction?
  orderHistory    OrderHistory[]
}
```

#### 1.3 New OrderHistory Model
```prisma
model OrderHistory {
  id                Int         @id @default(autoincrement())
  orderId           Int?        // Nullable to survive order deletion
  order             Order?      @relation(fields: [orderId], references: [id], onDelete: SetNull)
  action            String      // "CREATED", "RELEASED", "CLAIMED", "CLOSED", "DELETED"
  performedByUserId Int?        // User who performed the action
  performedByUser   User?       @relation(fields: [performedByUserId], references: [id], onDelete: SetNull)
  auditData         String      // JSON with action-specific data
  timestamp         DateTime    @default(now())

  @@index([orderId])
  @@index([performedByUserId])
  @@index([timestamp])
}
```

**auditData JSON Examples:**

**CREATED:**
```json
{
  "inhabitantId": 123,
  "bookedByUserId": 456,
  "ticketType": "ADULT",
  "priceAtBooking": 45
}
```

**RELEASED:**
```json
{
  "previousState": "BOOKED"
}
```

**CLAIMED:**
```json
{
  "previousInhabitantId": 123,
  "newInhabitantId": 789,
  "previousBookedByUserId": 456,
  "newBookedByUserId": 101
}
```

**CLOSED:**
```json
{
  "finalState": "BOOKED",
  "finalInhabitantId": 789,
  "finalBookedByUserId": 101,
  "transactionId": 555,
  "amount": 45
}
```

**DELETED:**
```json
{
  "order": {
    "id": 999,
    "dinnerEventId": 42,
    "inhabitantId": 123,
    "bookedByUserId": 456,
    "ticketType": "ADULT",
    "priceAtBooking": 45,
    "state": "BOOKED"
  },
  "reason": "cancelled_before_deadline"
}
```

#### 1.4 Updated User Model Relations
```prisma
model User {
  // ... existing fields ...

  // NEW relations for booking
  bookedOrders   Order[]        @relation("BookedByUser")
  orderHistory   OrderHistory[]
}
```

#### 1.6 CASCADE/SET NULL Decisions Rationale

**Strong Relationships (CASCADE):**
- **Order → DinnerEvent**: Order cannot exist without its dinner event
- **Order → Inhabitant**: Order must have a ticket holder
- **Transaction → Order**: Transaction tied to specific order

**Weak Relationships (SET NULL):**
- **Order → User (bookedByUserId)**: Preserve orders if booking user deleted
- **OrderHistory → Order**: History must survive order deletion for disputes
- **OrderHistory → User**: Preserve history even if user deleted

#### 1.7 Migration Strategy
1. Add new fields with nullable constraints initially
2. Populate `state = CLOSED` for orders with existing transactions
3. Populate `state = BOOKED` for orders without transactions
4. Set `priceAtBooking` from current ticket prices
5. Set `bookedByUserId` from Inhabitant's User relation where exists
6. Make required fields non-nullable after data migration

### Phase 2: API Endpoints

| Method | Endpoint | Purpose | Input Schemas | Output Schema | Notes |
|--------|----------|---------|---------------|---------------|-------|
| POST | `/api/booking/order` | Create order(s) | `CreateOrderSchema` (body) | `Order[]` | Creates one or more orders for a user |
| DELETE | `/api/booking/order/[id]` | Cancel order | `IdSchema` (params) | `Order` | Hard delete before deadline only. Creates history entry. |
| POST | `/api/booking/order/[id]/release` | Release order | `IdSchema` (params) | `Order` | Changes state to RELEASED. Only owner can release. |
| POST | `/api/booking/order/[id]/swap-order` | Swap order | `IdSchema` (params), `SwapOrderRequestSchema` (body) | `Order` | Assigns released order to claimer's inhabitant |
| GET | `/api/booking/order/[id]` | Get order details | `IdSchema` (params) | `OrderDetail` | Order with full relations (dinnerEvent, inhabitant, user) |
| GET | `/api/booking/order/[id]/history` | Get order history | `IdSchema` (params) | `OrderHistory[]` | Timeline of state changes for dispute resolution |
| GET | `/api/booking/user/orders` | List user's orders | `OrderQuerySchema` (query) | `Order[]` | Current user's orders, optionally filtered by state/date |
| GET | `/api/booking/dinner-event/[id]/orders` | List event orders | `IdSchema` (params), `OrderQuerySchema?` (query) | `Order[]` | All orders for dinner event (admin/chef view) |
| GET | `/api/booking/dinner-event/[id]/available` | List released orders | `IdSchema` (params) | `Order[]` | Marketplace - only RELEASED state orders |

#### Required Zod Schemas

**Input Schemas (in `composables/useOrderValidation.ts`):**

```typescript
// Create order(s)
const CreateOrderSchema = z.object({
  dinnerEventId: z.number().int().positive(),
  orders: z.array(z.object({
    inhabitantId: z.number().int().positive(),
    ticketType: z.nativeEnum(TicketType)
  })).min(1).max(20) // Max 20 tickets per request
})

// Swap order
const SwapOrderRequestSchema = z.object({
  inhabitantId: z.number().int().positive() // Claimer's inhabitant
})

// Order query filters
const OrderQuerySchema = z.object({
  state: z.nativeEnum(OrderState).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional()
})

// Route params
const IdSchema = z.object({
  id: z.coerce.number().int().positive()
})
```

**Domain Types (inferred from schemas):**

```typescript
type Order = z.infer<typeof OrderSchema>
type OrderDetail = z.infer<typeof OrderDetailSchema>
type OrderHistory = z.infer<typeof OrderHistorySchema>
type CreateOrderInput = z.infer<typeof CreateOrderSchema>
type SwapOrderRequest = z.infer<typeof SwapOrderRequestSchema>
```

**Output Schemas:**

```typescript
// Basic order (list view)
const OrderSchema = z.object({
  id: z.number(),
  dinnerEventId: z.number(),
  inhabitantId: z.number(),
  bookedByUserId: z.number().nullable(),
  ticketType: z.nativeEnum(TicketType),
  priceAtBooking: z.number(),
  state: z.nativeEnum(OrderState),
  releasedAt: z.date().nullable(),
  closedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Order with relations (detail view)
const OrderDetailSchema = OrderSchema.extend({
  dinnerEvent: z.object({
    id: z.number(),
    date: z.date(),
    menuTitle: z.string()
  }),
  inhabitant: z.object({
    id: z.number(),
    name: z.string(),
    lastName: z.string()
  }),
  bookedByUser: z.object({
    id: z.number(),
    email: z.string()
  }).nullable()
})

// Order history entry
const OrderHistorySchema = z.object({
  id: z.number(),
  orderId: z.number().nullable(),
  action: z.enum(['CREATED', 'RELEASED', 'CLAIMED', 'CLOSED', 'DELETED']),
  performedByUserId: z.number().nullable(),
  auditData: z.string(), // JSON string
  timestamp: z.date()
})
```

**Serialized Schemas (for repository layer per ADR-010):**

```typescript
// Serialized for database (dates as ISO strings)
const SerializedOrderSchema = OrderSchema.extend({
  releasedAt: z.string().nullable(),
  closedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
})

const SerializedOrderHistorySchema = OrderHistorySchema.extend({
  timestamp: z.string()
})
```

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