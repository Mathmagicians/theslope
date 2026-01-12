# Feature: Unified Booking Through Scaffold (ADR-016)
# Status: Planning
# Created: 2026-01-11
# Updated: 2026-01-12

================================================================================
## 0. ROOT CAUSE ANALYSIS
================================================================================

### 0.1 THE CORE BUG: Abstract Keys vs Order IDs

Current `reconcilePreBookings` uses **abstract composite keys**:

```typescript
// useSeason.ts - CURRENT (BROKEN)
const reconcilePreBookings = pruneAndCreate<OrderDisplay, OrderCreateWithPrice, string>(
    (order) => `${order.inhabitantId}-${order.dinnerEventId}`,  // ← ABSTRACT KEY!
    ...
)
```

**How `pruneAndCreate` works:**
```
pruneAndCreate(existing)(incoming) returns {
    create: [],     // incoming keys NOT in existing
    update: [],     // incoming keys IN existing but NOT equal
    idempotent: [], // incoming keys IN existing AND equal
    delete: []      // existing keys NOT in incoming  ← THE BUG!
}
```

**Bug demonstration:**
```
User edits Anna's order (id=1) for dinner 456:
- desiredOrders: [{ inhabitantId: 123, dinnerEventId: 456, dinnerMode: "TAKEAWAY" }]

householdOrders from DB:
  [
    { id: 1, inhabitantId: 123, dinnerEventId: 456 },  // Anna - key "123-456"
    { id: 2, inhabitantId: 124, dinnerEventId: 456 },  // Bob  - key "124-456"
    { id: 3, inhabitantId: 125, dinnerEventId: 456 }   // Clara - key "125-456"
  ]

reconcilePreBookings result with ABSTRACT KEYS:
  - existingByKey: { "123-456": order1, "124-456": order2, "125-456": order3 }
  - incomingKeys: ["123-456"]

  Result:
  - update: [order1]              // "123-456" in both
  - delete: [order2, order3]      // "124-456", "125-456" NOT in incoming → DELETED!
```

**Bob and Clara's orders are deleted because their keys aren't in incoming!**

### 0.2 THREE BUGS FROM ONE ROOT CAUSE

| Bug | Symptom | Root Cause |
|-----|---------|------------|
| **BUG #1** | NONE after deadline deletes instead of releases | Generator returns wrong intent for user mode |
| **BUG #2** | Single-user edit deletes other household members | Abstract key reconciliation deletes unmentioned orders |
| **BUG #3** | Guest tickets can't be distinguished | Multiple guests have same abstract key `inhabitantId-dinnerEventId` |

### 0.3 ADDITIONAL BUG: Missing Handler

| Page | Component | Handler | Status |
|------|-----------|---------|--------|
| `/dinner` | `DinnerBookingForm` | `@save-bookings="handleSaveBookings"` | ✅ Has handler (but broken by BUG #2) |
| `/household/.../bookings` (day) | `DinnerBookingForm` | **NO HANDLER** | ❌ Missing! |
| `/household/.../bookings` (grid) | `BookingGridView` | `@save="handleGridSave"` | ✅ Has handler (but broken by BUG #2) |

### 0.4 SEMANTIC DIFFERENCE: System vs User Mode

| Mode | Meaning | Unmentioned Orders |
|------|---------|-------------------|
| **System mode** | "ALL orders that SHOULD exist" | DELETE (not in desired state) |
| **User mode** | "Orders user CHANGED" | LEAVE ALONE (user didn't touch) |

**Current implementation treats both modes the same → user mode deletes untouched orders!**

### 0.5 CODE SMELLS

| Smell | Location | Problem |
|-------|----------|---------|
| Too much if-else | `scaffoldPrebookings.ts` | Scaffolder has business logic that belongs in generator |
| Abstract keys | `reconcilePreBookings` | Can't track specific orders, can't distinguish guests |
| Missing orderId | `DesiredOrderSchema` | No way to specify which order to update |

================================================================================
## 1. CORRECT ARCHITECTURE
================================================================================

### 1.1 SEPARATION OF CONCERNS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GENERATOR                                       │
│  - Receives: desiredOrders + existingOrdersById + deadlines                 │
│  - Returns: UserBookingResult { create, update, delete, release, idempotent }│
│  - Owns: ALL business logic (deadline checks, mode resolution)              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SCAFFOLDER                                      │
│  - Receives: UserBookingResult from generator                               │
│  - Executes: Loop each bucket, call repository                              │
│  - Owns: NOTHING except execution                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 GENERATOR RETURNS CATEGORIZED INTENT

```typescript
// useSeason.ts - NEW TYPE

type OrderUpdate = {
    orderId: number
    dinnerMode: DinnerMode
    ticketPriceId?: number
    priceAtBooking?: number
}

type UserBookingResult = {
    create: OrderCreateWithPrice[]   // No orderId → INSERT
    update: OrderUpdate[]            // orderId + mode change → UPDATE
    delete: number[]                 // orderId + NONE + before deadline → DELETE
    release: number[]                // orderId + NONE + after deadline → RELEASE
    idempotent: number[]             // orderId + no change → NO-OP
}
```

### 1.3 GENERATOR DECISION MATRIX

| `orderId` | `dinnerMode` | `existing` | `deadline` | → Bucket |
|-----------|--------------|------------|------------|----------|
| ❌ absent | ≠ NONE | N/A | any | **CREATE** |
| ❌ absent | = NONE | N/A | any | **SKIP** (can't create NONE) |
| ✅ present | ≠ NONE | not found | any | **SKIP** (stale request) |
| ✅ present | ≠ NONE | found, same | any | **IDEMPOTENT** |
| ✅ present | ≠ NONE | found, diff | any | **UPDATE** |
| ✅ present | = NONE | found | before | **DELETE** |
| ✅ present | = NONE | found | after | **RELEASE** |
| ✅ present | = NONE | not found | any | **SKIP** (stale request) |

### 1.4 SCAFFOLDER JUST EXECUTES

```typescript
// scaffoldPrebookings.ts - USER MODE (simplified)

if (isUserMode) {
    const existingOrdersById = new Map(householdOrders.map(o => [o.id, o]))

    // Generator returns categorized intent
    const result = factory.fromDesiredOrders(
        options.desiredOrders!,
        existingOrdersById,
        options.userId!
    )

    // CREATE: Insert new orders
    for (const batch of chunkOrderBatch(result.create)) {
        await createOrders(d1Client, householdId, batch, auditContext)
    }

    // UPDATE: Change mode/price of existing orders
    for (const upd of result.update) {
        await updateOrder(d1Client, upd.orderId, {
            dinnerMode: upd.dinnerMode,
            ticketPriceId: upd.ticketPriceId,
            priceAtBooking: upd.priceAtBooking
        }, auditContext)
    }

    // DELETE: Remove orders (NONE before deadline)
    if (result.delete.length > 0) {
        await deleteOrder(d1Client, result.delete, options.userId)
    }

    // RELEASE: Update to RELEASED state (NONE after deadline)
    for (const orderId of result.release) {
        await updateOrder(d1Client, orderId, {
            state: 'RELEASED',
            dinnerMode: 'NONE',
            releasedAt: new Date()
        }, auditContext)
    }

    // IDEMPOTENT: nothing to do

    // UNTOUCHED: orders not in desiredOrders → nothing to do (implicit)
}
```

================================================================================
## 2. USE CASES
================================================================================

| UC  | Name                | User Action                          | When              |
|-----|---------------------|--------------------------------------|-------------------|
| UC1 | Single inhabitant   | User sets mode for one person        | Before deadline   |
| UC2 | Power mode          | User sets mode for ALL inhabitants   | Before deadline   |
| UC3 | Grid booking        | User edits multiple dinners in grid  | Before deadline   |
| UC4 | Add guest           | User adds guest ticket               | Before deadline   |
| UC5 | Release ticket      | User sets NONE after deadline        | After deadline    |
| UC6 | Claim ticket        | User claims RELEASED ticket (FIFO)   | After deadline    |

================================================================================
## 3. SCHEMAS (UPDATED)
================================================================================

### 3.1 DesiredOrderSchema (CRITICAL: includes orderId)

```typescript
// useBookingValidation.ts

const DesiredOrderSchema = z.object({
    // CRITICAL: orderId present for updates, absent for creates
    orderId: z.number().int().positive().optional(),

    inhabitantId: z.number().int().positive(),
    dinnerEventId: z.number().int().positive(),
    dinnerMode: DinnerModeSchema,
    ticketPriceId: z.number().int().positive(),
    isGuestTicket: z.boolean().default(false),
    allergyTypeIds: z.array(z.number().int().positive()).optional()
})

type DesiredOrder = z.infer<typeof DesiredOrderSchema>
```

### 3.2 ScaffoldOrdersRequestSchema

```typescript
const ScaffoldOrdersRequestSchema = z.object({
    householdId: z.number().int().positive(),
    seasonId: z.number().int().positive(),

    // Orders with orderId = update/delete/release
    // Orders without orderId = create
    orders: z.array(DesiredOrderSchema),
})
```

### 3.3 UserBookingResultSchema (Generator Output)

```typescript
const OrderUpdateSchema = z.object({
    orderId: z.number().int().positive(),
    dinnerMode: DinnerModeSchema,
    ticketPriceId: z.number().int().positive().optional(),
    priceAtBooking: z.number().int().nonnegative().optional()
})

const UserBookingResultSchema = z.object({
    create: z.array(OrderCreateWithPriceSchema),
    update: z.array(OrderUpdateSchema),
    delete: z.array(z.number().int().positive()),  // orderIds
    release: z.array(z.number().int().positive()), // orderIds
    idempotent: z.array(z.number().int().positive()) // orderIds
})
```

### 3.4 ScaffoldOrdersResponseSchema

```typescript
const ScaffoldOrdersResponseSchema = z.object({
    householdId: z.number().int().positive(),
    scaffoldResult: ScaffoldResultSchema.extend({
        // Add release count to existing schema
        released: z.number().int().nonnegative()
    })
})
```

================================================================================
## 4. GENERATOR IMPLEMENTATION
================================================================================

### 4.1 fromDesiredOrders (USER MODE)

```typescript
// useSeason.ts

const fromDesiredOrders = (
    desiredOrders: DesiredOrder[],
    existingOrdersById: Map<number, OrderDisplay>,
    dinnerEventDates: Map<number, Date>,
    ticketPrices: TicketPrice[],
    householdId: number,
    userId: number
): UserBookingResult => {
    const result: UserBookingResult = {
        create: [],
        update: [],
        delete: [],
        release: [],
        idempotent: []
    }

    for (const desired of desiredOrders) {
        const eventDate = dinnerEventDates.get(desired.dinnerEventId)
        if (!eventDate) continue  // Unknown event, skip

        const isBeforeDeadline = canModifyOrders(eventDate)
        const ticketPrice = ticketPrices.find(tp => tp.id === desired.ticketPriceId)
        const price = ticketPrice?.price ?? 0

        if (!desired.orderId) {
            // ─────────────────────────────────────────────────────
            // NO orderId → CREATE (or skip if NONE)
            // ─────────────────────────────────────────────────────
            if (desired.dinnerMode === DinnerMode.NONE) continue

            result.create.push({
                inhabitantId: desired.inhabitantId,
                dinnerEventId: desired.dinnerEventId,
                dinnerMode: desired.dinnerMode,
                ticketPriceId: desired.ticketPriceId,
                priceAtBooking: price,
                bookedByUserId: userId,
                householdId,
                state: OrderState.BOOKED,
                isGuestTicket: desired.isGuestTicket
            })
        } else {
            // ─────────────────────────────────────────────────────
            // HAS orderId → UPDATE, DELETE, RELEASE, or IDEMPOTENT
            // ─────────────────────────────────────────────────────
            const existing = existingOrdersById.get(desired.orderId)
            if (!existing) continue  // Order doesn't exist, skip (stale request)

            if (desired.dinnerMode === DinnerMode.NONE) {
                // NONE mode: DELETE or RELEASE based on deadline
                if (isBeforeDeadline) {
                    result.delete.push(desired.orderId)
                } else {
                    result.release.push(desired.orderId)
                }
            } else if (
                existing.dinnerMode === desired.dinnerMode &&
                existing.ticketPriceId === desired.ticketPriceId
            ) {
                // No change → IDEMPOTENT
                result.idempotent.push(desired.orderId)
            } else {
                // Mode or price change → UPDATE
                result.update.push({
                    orderId: desired.orderId,
                    dinnerMode: desired.dinnerMode,
                    ticketPriceId: desired.ticketPriceId,
                    priceAtBooking: price
                })
            }
        }
    }

    return result
}
```

================================================================================
## 5. EXAMPLE SCENARIOS
================================================================================

### Scenario 1: User updates Anna's mode (UPDATE)

```
Request: [{ orderId: 1, inhabitantId: 123, dinnerEventId: 456, dinnerMode: "TAKEAWAY", ticketPriceId: 5 }]

Existing orders: [
  { id: 1, inhabitantId: 123, dinnerMode: "DINEIN" },   // Anna
  { id: 2, inhabitantId: 124, dinnerMode: "DINEIN" },   // Bob
  { id: 3, inhabitantId: 125, dinnerMode: "DINEIN" }    // Clara
]

Generator result:
  - update: [{ orderId: 1, dinnerMode: "TAKEAWAY" }]
  - delete: []
  - release: []
  - idempotent: []
  - create: []

Scaffolder executes:
  - UPDATE order 1 → dinnerMode="TAKEAWAY"
  - Orders 2, 3: UNTOUCHED (not in request)
```

### Scenario 2: User cancels Anna before deadline (DELETE)

```
Request: [{ orderId: 1, inhabitantId: 123, dinnerEventId: 456, dinnerMode: "NONE", ticketPriceId: 5 }]
Deadline: NOT passed

Generator result:
  - delete: [1]

Scaffolder executes:
  - DELETE order 1
  - Orders 2, 3: UNTOUCHED
```

### Scenario 3: User releases Anna after deadline (RELEASE)

```
Request: [{ orderId: 1, inhabitantId: 123, dinnerEventId: 456, dinnerMode: "NONE", ticketPriceId: 5 }]
Deadline: PASSED

Generator result:
  - release: [1]

Scaffolder executes:
  - UPDATE order 1 → state=RELEASED, dinnerMode=NONE, releasedAt=now()
  - Orders 2, 3: UNTOUCHED
```

### Scenario 4: User creates new booking (CREATE)

```
Request: [{ inhabitantId: 123, dinnerEventId: 456, dinnerMode: "DINEIN", ticketPriceId: 5 }]
         (no orderId)

Generator result:
  - create: [{ inhabitantId: 123, dinnerEventId: 456, dinnerMode: "DINEIN", ... }]

Scaffolder executes:
  - INSERT new order
  - Existing orders: UNTOUCHED
```

### Scenario 5: Power mode (UPDATE multiple)

```
Request: [
  { orderId: 1, inhabitantId: 123, dinnerEventId: 456, dinnerMode: "TAKEAWAY", ticketPriceId: 5 },
  { orderId: 2, inhabitantId: 124, dinnerEventId: 456, dinnerMode: "TAKEAWAY", ticketPriceId: 5 },
  { orderId: 3, inhabitantId: 125, dinnerEventId: 456, dinnerMode: "TAKEAWAY", ticketPriceId: 5 }
]

Generator result:
  - update: [
      { orderId: 1, dinnerMode: "TAKEAWAY" },
      { orderId: 2, dinnerMode: "TAKEAWAY" },
      { orderId: 3, dinnerMode: "TAKEAWAY" }
    ]

Scaffolder executes:
  - UPDATE order 1 → TAKEAWAY
  - UPDATE order 2 → TAKEAWAY
  - UPDATE order 3 → TAKEAWAY
```

### Scenario 6: Guest ticket update (by orderId)

```
Existing guest orders (same inhabitantId-dinnerEventId!):
  { id: 10, inhabitantId: 5, dinnerEventId: 100 }  // Guest 1
  { id: 11, inhabitantId: 5, dinnerEventId: 100 }  // Guest 2

Request: [{ orderId: 11, inhabitantId: 5, dinnerEventId: 100, dinnerMode: "TAKEAWAY", ticketPriceId: 2 }]

Generator result:
  - update: [{ orderId: 11, dinnerMode: "TAKEAWAY" }]

Scaffolder executes:
  - UPDATE order 11 → TAKEAWAY
  - Order 10: UNTOUCHED
```

================================================================================
## 6. IMPLEMENTATION PHASES
================================================================================

### PHASE 1: Schema Updates

Files:
  - app/composables/useBookingValidation.ts

Tasks:
  [ ] Update DesiredOrderSchema to include optional orderId
  [ ] Add OrderUpdateSchema
  [ ] Add UserBookingResultSchema
  [ ] Update ScaffoldOrdersRequestSchema (use DesiredOrder[] not Record)
  [ ] Export new types

Tests:
  [ ] Unit tests for DesiredOrderSchema with/without orderId
  [ ] Unit tests for UserBookingResultSchema

### PHASE 2: Generator Refactor

Files:
  - app/composables/useSeason.ts
  - tests/component/composables/useSeason.fromDesiredOrders.unit.spec.ts (NEW)

Tasks:
  [ ] Create fromDesiredOrders() that returns UserBookingResult
  [ ] Implement decision matrix logic (see section 1.3)
  [ ] Handle all cases: CREATE, UPDATE, DELETE, RELEASE, IDEMPOTENT, SKIP
  [ ] Remove abstract key reconciliation for user mode

Unit Tests (CRITICAL - generator is pure business logic):

Strategy:
  - Use describe.each() for decision matrix (all 8 cases from section 1.3)
  - Parametrize by: orderId presence, dinnerMode, existing order, deadline state
  - Each test verifies order lands in correct bucket
  - Factory pattern for test data (per testing.md)

Test cases:
  [ ] Decision matrix: all 8 rows from section 1.3 (parametrized)
  [ ] CREATE: no orderId + each eating mode (DINEIN, TAKEAWAY, DINEINLATE)
  [ ] SKIP: no orderId + NONE (before and after deadline)
  [ ] UPDATE: orderId + mode changed (before and after deadline)
  [ ] IDEMPOTENT: orderId + same mode + same ticketPriceId
  [ ] DELETE: orderId + NONE + before deadline
  [ ] RELEASE: orderId + NONE + after deadline
  [ ] SKIP (stale): orderId not in existingOrdersById
  [ ] Mixed batch: CREATE + UPDATE + DELETE in single call
  [ ] Power mode: same dinnerEventId, multiple inhabitants with orderIds
  [ ] Guest tickets: multiple orders with same inhabitantId-dinnerEventId, different orderIds
  [ ] Edge cases: empty input, unknown dinnerEventId, unknown ticketPriceId
  [ ] Invariants: total buckets ≤ desiredOrders.length, each orderId in exactly one bucket

### PHASE 3: Scaffolder Simplification

Files:
  - server/utils/scaffoldPrebookings.ts

Tasks:
  [ ] For user mode: call generator.fromDesiredOrders()
  [ ] Loop CREATE bucket → createOrders()
  [ ] Loop UPDATE bucket → updateOrder(orderId, changes)
  [ ] Loop DELETE bucket → deleteOrder([orderIds])
  [ ] Loop RELEASE bucket → updateOrder(orderId, {state: RELEASED, ...})
  [ ] Remove all if-else business logic (moved to generator)
  [ ] Keep system mode unchanged (uses existing reconciliation)

Tests:
  [ ] Integration test: single inhabitant booking
  [ ] Integration test: power mode booking
  [ ] Integration test: NONE before deadline (delete)
  [ ] Integration test: NONE after deadline (release)
  [ ] Integration test: guest ticket by orderId

### PHASE 4: Component Updates

Files:
  - app/components/dinner/DinnerBookingForm.vue
  - app/components/booking/BookingGridView.vue
  - app/components/household/HouseholdBookings.vue
  - app/pages/dinner/index.vue

Tasks:
  [ ] DinnerBookingForm: include orderId in emitted DesiredOrder
  [ ] BookingGridView: include orderId in emitted changes
  [ ] HouseholdBookings: ADD missing @save-bookings handler for day view
  [ ] All handlers: pass orderId from existing order

Tests:
  [ ] E2E: Single inhabitant booking from /dinner
  [ ] E2E: Single inhabitant booking from /household day view
  [ ] E2E: Power mode booking
  [ ] E2E: Grid booking
  [ ] E2E: NONE before deadline
  [ ] E2E: NONE after deadline

### PHASE 5: Cleanup

Files:
  - app/composables/useBooking.ts
  - app/stores/bookings.ts

Tasks:
  [ ] DELETE reconcileSingleDinnerUserBooking()
  [ ] DELETE buildBookingFeedback()
  [ ] DELETE processBooking() from store
  [ ] DELETE processGridBooking() from store (if exists)
  [ ] Update ADR-016 in docs/adr.md

Tests:
  [ ] Full E2E regression
  [ ] Verify: changes ≤ length of desiredOrders

================================================================================
## 7. AUDIT TRAIL
================================================================================

### 7.1 AUDIT ACTIONS BY BUCKET

| Generator Bucket | Audit Action | Description |
|------------------|--------------|-------------|
| CREATE | USER_BOOKED | New order created |
| UPDATE | USER_BOOKED | Mode/price changed |
| DELETE | USER_CANCELLED | Cancelled before deadline |
| RELEASE | USER_BOOKED | Released after deadline |
| IDEMPOTENT | (none) | No change |

### 7.2 NONE MODE BEHAVIOR BY DEADLINE

| When | User Action | Generator Bucket | DB Operation | Order State |
|------|-------------|------------------|--------------|-------------|
| Before deadline | NONE | DELETE | DELETE | N/A (deleted) |
| After deadline | NONE | RELEASE | UPDATE | RELEASED |

================================================================================
## 8. SUCCESS CRITERIA
================================================================================

[ ] **BUG #0 FIXED:** HouseholdBookings day view has @save-bookings handler
[ ] **BUG #1 FIXED:** NONE after deadline → RELEASE bucket → UPDATE to RELEASED
[ ] **BUG #2 FIXED:** Single inhabitant edit only affects that inhabitant (by orderId)
[ ] **BUG #3 FIXED:** Guest tickets identified by orderId, not abstract key
[ ] **ARCHITECTURE:** Generator returns C/U/D/R/I buckets, scaffolder just executes
[ ] **INVARIANT:** Total DB operations ≤ length of desiredOrders
[ ] **INVARIANT:** Orders not in desiredOrders are UNTOUCHED
[ ] All 6 use cases work via UI
[ ] Claim stays separate (atomic FIFO)
[ ] Tests pass
[ ] ADR-016 documented

================================================================================
## 9. COMPONENT RESPONSIBILITY SUMMARY
================================================================================

| Component | Responsibility |
|-----------|---------------|
| **DesiredOrder** | User intent with `orderId` for updates |
| **Generator** | Business logic: deadline checks, mode resolution → C/U/D/R/I buckets |
| **Scaffolder** | Execution: loop each bucket, call repository |
| **Repository** | DB operations: createOrders, updateOrder, deleteOrder |

| Bucket | Generator decides | Scaffolder executes |
|--------|-------------------|---------------------|
| **CREATE** | No orderId + mode ≠ NONE | `createOrders()` |
| **UPDATE** | orderId + mode changed | `updateOrder(orderId, {mode, price})` |
| **DELETE** | orderId + NONE + before deadline | `deleteOrder([orderId])` |
| **RELEASE** | orderId + NONE + after deadline | `updateOrder(orderId, {state: RELEASED})` |
| **IDEMPOTENT** | orderId + no change | Nothing |
| **UNTOUCHED** | Not in desiredOrders | Nothing (implicit) |

================================================================================
