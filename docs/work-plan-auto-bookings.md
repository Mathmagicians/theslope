# Work Plan: Auto-Generate Dinner Preferences and Bookings

## Executive Summary

Implement automatic creation of default dining preferences for inhabitants and automatic generation of dinner bookings (Orders) when a season's dinner events are generated. This feature will streamline the booking process by setting sensible defaults and creating initial bookings based on inhabitants' weekly preferences.

## Current State Analysis

### What Exists

1. **Database Schema** (✅ Ready)
   - `Inhabitant.dinnerPreferences`: JSON string field for `WeekDayMap<DinnerMode>`
   - `Order` model with relationships to `DinnerEvent` and `Inhabitant`
   - `TicketType` enum: `ADULT`, `CHILD`, `HUNGRY_BABY`, `BABY`
   - `DinnerMode` enum: `DINEIN`, `TAKEAWAY`, `NONE`
   - `TicketPrice` model with `maximumAgeLimit` for age-based ticket determination

2. **Dinner Event Generation** (✅ Implemented)
   - Endpoint: `POST /api/admin/season/[id]/generate-dinner-events`
   - Composable: `useSeason().generateDinnerEventDataForSeason()`
   - Creates dinner events for all cooking days excluding holidays
   - Events created with `dinnerMode: 'NONE'` by default

3. **Validation & Serialization** (✅ Ready)
   - `useHouseholdValidation()` includes `dinnerPreferences` validation
   - `useWeekDayMapValidation<DinnerMode>()` configured for preferences
   - ADR-010 compliant serialization/deserialization utilities
   - `useTicketPriceValidation()` for ticket price management

4. **Default Configuration** (✅ Ready)
   - `app.config.ts` defines default ticket prices with age limits:
     - BABY: 0 kr, max age 2
     - HUNGRY_BABY: 0 kr, max age 2
     - CHILD: 17 kr, max age 12
     - ADULT: 40 kr

### What's Missing

1. **Order Validation Schema**
   - No `useOrderValidation` composable exists
   - Need schemas for `OrderCreate`, `OrderUpdate`, `OrderBulkCreate`

2. **Order Repository Methods**
   - No CRUD operations for Orders in `prismaRepository.ts`
   - Need bulk creation for efficiency

3. **Preference Generation Logic**
   - No logic to create default preferences for inhabitants
   - Defaults - should be DINEIN for everyone

4. **Booking Generation Logic**
   - No logic to convert preferences → Orders
   - Need ticket type determination based on inhabitant age

5. **Integration Point**
   - Dinner event generation doesn't trigger preference/booking creation
   - Need to hook into the generation flow, orchestrated by plan store

## Architecture Decisions

### Where to Implement

1. **Order Validation** → New composable: `app/composables/useOrderValidation.ts`
   - Following ADR-001 pattern for shared validation
   - Domain types with serialization support

2. **Repository Methods** → Extend `server/data/prismaRepository.ts`
   - `createOrders()` for bulk creation
   - `fetchOrdersForDinnerEvent()`, `fetchOrdersForInhabitant()`
   - `deleteOrder()`, `updateOrder()`

3. **Preference Generation** → New utility: `server/utils/preferenceGenerator.ts`
   - `generateDefaultPreferences()` - creates sensible defaults
   - `shouldHavePreferences()` - determines who needs preferences

4. **Booking Generation** → New utility: `server/utils/bookingGenerator.ts`
   - `generateOrdersFromPreferences()` - main conversion logic
   - `determineTicketType()` - age-based ticket selection
   - `calculateAge()` - utility for age calculation

5. **Integration** → Extend existing endpoint
   - Create `POST /api/admin/season/[id]/generate-dinner-bookings`
   - Add optional `?generateBookings=true` query parameter
   - Call preference and booking generation after dinner events

### Data Flow

```
Season Creation → Generate Dinner Events → Generate Default Preferences → Generate Orders
                                         ↓                              ↓
                                   (for inhabitants              (for each dinner event,
                                    without preferences)          create orders based on
                                                                 preferences != NONE)
```

## Implementation Phases

### Phase 1: Foundation (Order Model & Validation)

1. **Create `useOrderValidation` composable**
   ```typescript
   // Domain schemas
   OrderSchema, OrderCreateSchema, OrderBulkCreateSchema
   // Serialization (if needed for future features)
   serializeOrder(), deserializeOrder()
   ```

2. **Add Order repository methods**
   ```typescript
   createOrder(d1Client, orderData)
   createOrders(d1Client, ordersData[]) // Bulk creation
   fetchOrdersForDinnerEvent(d1Client, dinnerEventId)
   fetchOrdersForInhabitant(d1Client, inhabitantId)
   updateOrder(d1Client, id, data)
   deleteOrder(d1Client, id)
   ```

3. **Write tests for Order CRUD**
   - E2E tests in `tests/e2e/api/admin/order.e2e.spec.ts`
   - Unit tests for validation schemas

### Phase 2: Preference Generation

1. **Create preference generator utility**
   ```typescript
   interface PreferenceConfig {
     defaultAdultMode: DinnerMode // Default: DINEIN
     defaultChildMode: DinnerMode // Default: DINEIN
     childAgeThreshold: number    // Default: 15
   }

   generateDefaultPreferences(inhabitants: Inhabitant[], config?: PreferenceConfig)
   ```

2. **Add repository method for bulk preference updates**
   ```typescript
   updateInhabitantPreferences(d1Client, updates: {id: number, preferences: WeekDayMap<DinnerMode>}[])
   ```

3. **Write tests**
   - Unit tests for preference generation logic
   - E2E test for preference creation

### Phase 3: Booking Generation

1. **Create booking generator utility**
   ```typescript
   interface BookingConfig {
     skipNonePreferences: boolean  // Default: true
     includeGuests: boolean        // Default: false (future feature)
   }

   generateOrdersFromPreferences(
     dinnerEvents: DinnerEvent[],
     inhabitants: InhabitantWithPreferences[],
     ticketPrices: TicketPrice[],
     config?: BookingConfig
   ): OrderCreate[]

   determineTicketType(inhabitant: Inhabitant, eventDate: Date, ticketPrices: TicketPrice[]): TicketType
   ```

2. **Age calculation utility**
   ```typescript
   calculateAgeOnDate(birthDate: Date, targetDate: Date): number
   ```

3. **Write tests**
   - Unit tests for ticket type determination
   - Unit tests for order generation logic
   - Edge cases: no birthdate, exact age boundaries

### Phase 4: Integration

1. **Extend dinner event generation endpoint**
   ```typescript
   // Add query parameter validation
   const querySchema = z.object({
     generateBookings: z.coerce.boolean().optional().default(false)
   })

   // After generating dinner events:
   if (generateBookings) {
     // 1. Generate default preferences for inhabitants without any
     const preferencesGenerated = await generateAndSaveDefaultPreferences(d1Client, seasonId)

     // 2. Generate orders from all inhabitants' preferences
     const ordersGenerated = await generateAndSaveOrders(d1Client, savedEvents, seasonId)

     return {
       seasonId,
       eventCount: savedEvents.length,
       preferencesGenerated,
       ordersGenerated,
       events: savedEvents
     }
   }
   ```

2. **Create orchestration functions**
   ```typescript
   generateAndSaveDefaultPreferences(d1Client, seasonId)
   generateAndSaveOrders(d1Client, dinnerEvents[], seasonId)
   ```

3. **Write integration tests**
   - E2E test for complete flow: season → events → preferences → orders
   - Test with and without `generateBookings` parameter

### Phase 5: UI Integration (Future - Not Part of This Task)

- Update AdminPlanning to show booking counts
- Update HouseholdCard to display auto-generated bookings
- Add UI controls for regenerating bookings

## ADR Compliance

### ADR-001: Core Framework
- ✅ Use Zod schemas in composables for Order validation
- ✅ Leverage auto-imports for new composables
- ✅ Repository pattern for Order operations

### ADR-002: Error Handling
- ✅ Separate try-catch for validation vs business logic
- ✅ Use H3 validation helpers in any new endpoints
- ✅ Return appropriate error codes (400 for validation, 500 for server)

### ADR-003: Testing Strategy
- ✅ Start with E2E tests defining behavior
- ✅ Create OrderFactory in `tests/e2e/testDataFactories/`
- ✅ Use BDD structure (GIVEN/WHEN/THEN)

### ADR-004: Logging Standards
- ✅ Use appropriate log levels (info/warn/error)
- ✅ Never log sensitive data (only IDs and counts)
- ✅ Format: `🎫 > ORDER > [METHOD] message`

### ADR-005: Repository Patterns
- ✅ Single atomic operations where possible
- ✅ Leverage Prisma's cascade behavior for Order deletion

### ADR-007: Store Pattern
- ✅ Stores not involved (backend-only feature)
- ✅ Future UI updates will follow reactive pattern

### ADR-009: Data Inclusion
- ✅ Order index endpoints to include lightweight inhabitant info
- ✅ Use select for minimal fields

### ADR-010: Serialization
- ✅ Repository handles any date serialization for Orders
- ✅ API works with domain types throughout

## Test Strategy

### Unit Tests
1. `useOrderValidation.unit.spec.ts` - Schema validation
2. `preferenceGenerator.unit.spec.ts` - Default preference logic
3. `bookingGenerator.unit.spec.ts` - Order generation logic
4. `calculateAge.unit.spec.ts` - Age calculation edge cases

### E2E Tests
1. `order.e2e.spec.ts` - CRUD operations
2. `generate-dinner-events-with-bookings.e2e.spec.ts` - Full flow

### Test Scenarios
- Inhabitants with/without birthdate
- Age boundaries (turning 3, 13 on event date)
- Mixed preferences (DINEIN, TAKEAWAY, NONE)
- Households with no inhabitants
- Events on non-cooking days (should not happen)
- Partial week preferences

## Edge Cases to Handle

### Age-Based Ticket Types
- **No birthdate**: Default to ADULT ticket
- **Birthday on event date**: Use new age (child becomes adult)
- **Future birthdate**: Treat as invalid, skip or use ADULT

### Preference Handling
- **No preferences set**: Generate defaults on first season creation
- **Partial preferences**: Fill missing days with sensible defaults
- **Invalid preferences**: Log warning, skip inhabitant

### Order Generation
- **NONE preference**: Don't create order for that day
- **Missing ticket prices**: Log error, fail generation
- **Duplicate orders**: Use upsert to prevent duplicates

### Performance
- **Large households**: Batch operations in chunks
- **Many events**: Use Promise.all with concurrency limit
- **Transaction safety**: D1 has no transactions, use careful ordering

## Implementation Order

1. **Phase 1**: Order validation and repository (2-3 hours)
2. **Phase 2**: Preference generation (1-2 hours)
3. **Phase 3**: Booking generation with age logic (2-3 hours)
4. **Phase 4**: Integration into dinner event generation (2 hours)
5. **Testing**: Comprehensive test coverage (2-3 hours)

**Total Estimate**: 9-14 hours

## Success Criteria

1. ✅ When season generates dinner events, inhabitants without preferences get defaults
2. ✅ Orders are automatically created based on preferences
3. ✅ Correct ticket types assigned based on age
4. ✅ No duplicate orders created
5. ✅ Process is idempotent (can be re-run safely)
6. ✅ Comprehensive test coverage
7. ✅ Performance acceptable for 100 households × 7 inhabitants × 200 events

## Future Enhancements (Out of Scope)

1. UI to trigger regeneration of bookings
2. Guest ticket support
3. Preference templates (e.g., "School days only")
4. Bulk preference editing UI
5. Notification system for auto-generated bookings
6. Undo/rollback mechanism
7. Preference history tracking

## Notes

- Initial implementation focuses on backend logic only
- UI integration will be handled in Task 4 of the household booking feature
- Consider making auto-generation opt-in initially for testing
- May need to add a flag to track auto-generated vs manual orders for future features