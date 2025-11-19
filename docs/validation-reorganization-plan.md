# Validation Schema Reorganization Plan

**Goal:** Eliminate circular dependencies and organize validation schemas by domain, matching Prisma repository structure.

**Principles:**
- Domain-driven organization (core/planning/booking/health/financial)
- Shared fragments for cross-domain entities
- Single source of truth per entity
- ADR-001 & ADR-009 compliant (Display/Detail patterns)

---

## Current State Analysis

### Existing Files (10 validation composables)
```
app/composables/
├── useUserValidation.ts              [Core] User
├── useHouseholdValidation.ts         [Core] Household, Inhabitant
├── useSeasonValidation.ts            [Planning] Season
├── useCookingTeamValidation.ts       [Planning] CookingTeam, CookingTeamAssignment
├── useBookingValidation.ts           [Booking] DinnerEvent, Order
├── useAllergyValidation.ts           [Health] AllergyType, Allergy
├── useTicketPriceValidation.ts       [Booking] TicketPrice
├── useHeynaboValidation.ts           [External] Heynabo integration
├── useDateRangeValidation.ts         [Utility] DateRange
└── useWeekDayMapValidation.ts        [Utility] WeekDayMap
```

### Circular Dependencies Identified
1. **useUserValidation ↔ useHouseholdValidation**
   - User needs Inhabitant (lines 89-99 inlined)
   - Household needs User (line 54 imported)

2. **useBookingValidation ↔ useCookingTeamValidation**
   - Booking needs CookingTeam (line 22 imported)
   - CookingTeam needs DinnerEvent (lines 83-97 inlined)

3. **useAllergyValidation ↔ useHouseholdValidation**
   - Allergy needs Inhabitant (lines 10-17 inlined)
   - Household needs Allergy (line 55 imported)

---

## Target Architecture

### Domain Organization (Aligned with Prisma Repository Structure)

```
app/composables/
├── fragments/
│   └── domainFragments.ts            [NEW] Core entity fragments
├── validation/
│   ├── useCoreValidation.ts          [NEW] User, Inhabitant, Household
│   ├── usePlanningValidation.ts      [NEW] Season, CookingTeam, CookingTeamAssignment
│   ├── useBookingValidation.ts       [REFACTOR] DinnerEvent, Order, TicketPrice, OrderHistory
│   ├── useHealthValidation.ts        [RENAME] AllergyType, Allergy, DinnerEventAllergen
│   └── useFinancialValidation.ts     [NEW] Transaction, Invoice
└── integration/
    └── useHeynaboValidation.ts       [KEEP] External system integration
```

**Utilities remain unchanged:**
- `useDateRangeValidation.ts`
- `useWeekDayMapValidation.ts`

---

## Implementation Plan

### Phase 1: Create Domain Fragments ✅ 

**File:** `app/composables/fragments/domainFragments.ts`

**Purpose:** Single source of truth for minimal entity schemas (scalar fields only)

**Tests:** Unit tests verifying fragments match current schemas

**Outcome:** All domains can import fragments without circular dependencies

---

### Phase 2: Create useCoreValidation.ts ✅

**Merge:** `useUserValidation.ts` + `useHouseholdValidation.ts` into  `useCoreValidation` 

**Entities:** User, Inhabitant, Household

**Tests:**
- Copy existing tests from useUserValidation.unit.spec.ts + useHouseholdValidation.unit.spec.ts
- Add integration tests verifying User ↔ Inhabitant ↔ Household relations work

**Migration:**
- Update imports across codebase: `useUserValidation` → `useCoreValidation`
- Update imports: `useHouseholdValidation` → `useCoreValidation`
- Run full test suite

**Outcome:** Single composable for core domain, no circular dependencies

---

### Phase 3: Create usePlanningValidation.ts

**Merge:** `useSeasonValidation.ts` + `useCookingTeamValidation.ts`

**Entities:** Season, CookingTeam, CookingTeamAssignment

**Structure:**
```typescript
export const usePlanningValidation = () => {
    // Import fragments
    const {SeasonFragmentSchema, CookingTeamFragmentSchema, DinnerEventFragmentSchema} = useDomainFragments()
    const {InhabitantFragmentSchema} = useDomainFragments() // For chef/team members

    // SEASON SCHEMAS
    // - Extend SeasonFragmentSchema with relations (dinnerEvents, CookingTeams, ticketPrices)
    // - SeasonSchema, SerializedSeasonSchema
    // - serializeSeason(), deserializeSeason()

    // COOKING TEAM SCHEMAS
    // - Extend CookingTeamFragmentSchema with relations (assignments, dinnerEvents)
    // - CookingTeamDisplaySchema (for lists)
    // - CookingTeamDetailSchema (for detail view)
    // - CookingTeamAssignmentSchema
    // - serializeCookingTeam(), deserializeCookingTeam()

    return {
        // Enums
        RoleSchema,
        SeasonStatusSchema,
        // Season
        SeasonSchema,
        SerializedSeasonSchema,
        serializeSeason,
        deserializeSeason,
        // CookingTeam
        CookingTeamDisplaySchema,
        CookingTeamDetailSchema,
        CookingTeamAssignmentSchema,
        TeamRoleSchema,
        serializeCookingTeam,
        deserializeCookingTeam,
        // Utilities
        ROLE_LABELS,
        ROLE_ICONS,
        getTeamMemberCounts
    }
}
```

**Tests:**
- Copy existing tests from useSeasonValidation.unit.spec.ts + useCookingTeamValidation.unit.spec.ts
- Add integration tests for Season ↔ CookingTeam ↔ DinnerEvent relations

**Migration:**
- Update imports: `useSeasonValidation` → `usePlanningValidation`
- Update imports: `useCookingTeamValidation` → `usePlanningValidation`
- Run full test suite

**Outcome:** Single composable for planning domain

---

### Phase 4: Refactor useBookingValidation.ts

**Add:** TicketPrice, OrderHistory (currently separate/missing)

**Entities:** DinnerEvent, Order, TicketPrice, OrderHistory

**Structure:**
```typescript
export const useBookingValidation = () => {
    // Import fragments
    const {DinnerEventFragmentSchema, OrderFragmentSchema, TicketPriceFragmentSchema} = useDomainFragments()
    const {InhabitantFragmentSchema} = useDomainFragments()
    const {CookingTeamFragmentSchema} = useDomainFragments()
    const {AllergyTypeFragmentSchema} = useDomainFragments()

    // DINNER EVENT SCHEMAS
    // - Extend DinnerEventFragmentSchema with relations (chef, cookingTeam, tickets, allergens)
    // - DinnerEventDisplaySchema (index)
    // - DinnerEventDetailSchema (detail with full relations)
    // - DinnerEventCreateSchema, DinnerEventUpdateSchema

    // ORDER SCHEMAS
    // - Extend OrderFragmentSchema with relations (dinnerEvent, inhabitant, bookedByUser, ticketPrice)
    // - OrderDisplaySchema (index)
    // - OrderDetailSchema (detail with full relations)
    // - OrderCreateSchema, CreateOrdersRequestSchema
    // - serializeOrder(), deserializeOrder()

    // TICKET PRICE SCHEMAS
    // - Move from useTicketPriceValidation.ts
    // - TicketPriceSchema, TicketPricesArraySchema

    // ORDER HISTORY SCHEMAS
    // - OrderHistorySchema (audit trail)
    // - serializeOrderHistory(), deserializeOrderHistory()

    return {
        // Enums
        DinnerStateSchema,
        DinnerModeSchema,
        OrderStateSchema,
        TicketTypeSchema,
        // DinnerEvent
        DinnerEventDisplaySchema,
        DinnerEventDetailSchema,
        DinnerEventCreateSchema,
        DinnerEventUpdateSchema,
        // Order
        OrderDisplaySchema,
        OrderDetailSchema,
        OrderCreateSchema,
        CreateOrdersRequestSchema,
        SwapOrderRequestSchema,
        OrderQuerySchema,
        serializeOrder,
        deserializeOrder,
        // TicketPrice
        TicketPriceSchema,
        TicketPricesArraySchema,
        // OrderHistory
        OrderHistorySchema,
        serializeOrderHistory,
        deserializeOrderHistory
    }
}
```

**Tests:**
- Keep existing useBookingValidation.unit.spec.ts tests
- Add tests from useTicketPriceValidation.unit.spec.ts
- Add OrderHistory validation tests

**Migration:**
- Delete `useTicketPriceValidation.ts` (merged into booking)
- Update imports across codebase
- Run full test suite

**Outcome:** Complete booking domain in single composable

---

### Phase 5: Rename useAllergyValidation.ts → useHealthValidation.ts

**Add:** DinnerEventAllergen (currently implicit)

**Entities:** AllergyType, Allergy, DinnerEventAllergen

**Structure:**
```typescript
export const useHealthValidation = () => {
    // Import fragments
    const {AllergyTypeFragmentSchema} = useDomainFragments()
    const {InhabitantFragmentSchema} = useDomainFragments()

    // ALLERGY TYPE SCHEMAS
    // - AllergyTypeDisplaySchema, AllergyTypeDetailSchema
    // - AllergyTypeCreateSchema, AllergyTypeUpdateSchema

    // ALLERGY SCHEMAS
    // - AllergyDisplaySchema (with allergyType relation)
    // - AllergyDetailSchema (with inhabitant relation)
    // - AllergyCreateSchema, AllergyUpdateSchema

    // DINNER EVENT ALLERGEN SCHEMAS (NEW)
    // - DinnerEventAllergenSchema (junction table)

    return {
        // AllergyType
        AllergyTypeDisplaySchema,
        AllergyTypeDetailSchema,
        AllergyTypeCreateSchema,
        AllergyTypeUpdateSchema,
        // Allergy
        AllergyDisplaySchema,
        AllergyDetailSchema,
        AllergyCreateSchema,
        AllergyUpdateSchema,
        // DinnerEventAllergen
        DinnerEventAllergenSchema,
        // Utilities
        InhabitantWithAllergiesSchema
    }
}
```

**Tests:**
- Rename useAllergyValidation.unit.spec.ts → useHealthValidation.unit.spec.ts
- Add DinnerEventAllergen tests

**Migration:**
- Rename file: `useAllergyValidation.ts` → `useHealthValidation.ts`
- Update imports across codebase
- Run full test suite

**Outcome:** Health domain properly named and complete

---

### Phase 6: Create useFinancialValidation.ts (NEW)

**Entities:** Transaction, Invoice

**Structure:**
```typescript
export const useFinancialValidation = () => {
    const {OrderFragmentSchema} = useDomainFragments()
    const {HouseholdFragmentSchema} = useDomainFragments()

    // TRANSACTION SCHEMAS
    // - TransactionDisplaySchema
    // - TransactionCreateSchema
    // - deserializeTransaction()

    // INVOICE SCHEMAS
    // - InvoiceDisplaySchema (with household summary)
    // - InvoiceDetailSchema (with transactions array)
    // - InvoiceCreateSchema
    // - deserializeInvoice()

    return {
        // Transaction
        TransactionDisplaySchema,
        TransactionCreateSchema,
        deserializeTransaction,
        // Invoice
        InvoiceDisplaySchema,
        InvoiceDetailSchema,
        InvoiceCreateSchema,
        deserializeInvoice
    }
}
```

**Tests:**
- Create useFinancialValidation.unit.spec.ts

**Migration:**
- NEW file, no migration needed
- Add to ADR compliance docs

**Outcome:** Financial domain properly validated

---

## Migration Strategy

### Step 1: Feature Branch
```bash
git checkout -b refactor/validation-domain-organization
```

### Step 2: Parallel Implementation (No Breaking Changes)
1. Create fragments file (Phase 1)
2. Create new domain composables alongside old ones
3. Write comprehensive unit tests for new composables
4. Verify all tests green

### Step 3: Gradual Migration
1. Update one domain at a time
2. Update imports in stores first
3. Update imports in components
4. Update imports in API routes
5. Run full test suite after each domain

### Step 4: Cleanup
1. Delete old composable files
2. Update ADR-001 compliance documentation
3. Update adr-compliance-frontend.md
4. Run final test suite (all green)

### Step 5: Documentation
1. Update CLAUDE.md with new structure
2. Update validation composable section in docs/adr.md
3. Create migration guide for team

---

## Success Criteria

### Must Have
- ✅ All existing tests pass
- ✅ No circular dependencies (verified by TypeScript compilation)
- ✅ Fragment pattern proven via POC tests
- ✅ ADR-001 & ADR-009 compliant
- ✅ Type exports maintained (no breaking changes)

### Should Have
- ✅ Reduced file count (10 → 6 validation files)
- ✅ Clear domain boundaries (core/planning/booking/health/financial)
- ✅ Single source of truth per entity (fragments)
- ✅ Improved maintainability (less duplication)

### Nice to Have
- Performance benchmarks (fragment vs inline schemas)
- Documentation screenshots for team onboarding
- Migration script for automated import updates

---

## Risk Assessment

### Low Risk
- Fragment pattern proven via POC (all tests green)
- Parallel implementation (no breaking changes during dev)
- Gradual migration (one domain at a time)

### Medium Risk
- Large refactor across many files (mitigated by comprehensive tests)
- Potential merge conflicts if team working on validation (coordinate timing)

### High Risk
- None identified (proven approach, gradual migration, full test coverage)

---

## Timeline Estimate

**Total: 8-12 hours** (for AI pair programming session)

- Phase 1 (Fragments): 1-2 hours
- Phase 2 (Core): 2-3 hours
- Phase 3 (Planning): 2-3 hours
- Phase 4 (Booking): 1-2 hours
- Phase 5 (Health): 1 hour
- Phase 6 (Financial): 1-2 hours
- Testing & Documentation: 1-2 hours

**Recommended Approach:** 2-3 focused sessions of 4 hours each

---

## Next Steps

1. **Review & Approve Plan** - Senior architect approval
2. **Create Feature Branch** - `refactor/validation-domain-organization`
3. **Phase 1 (Fragments)** - Start with proven POC approach
4. **Iterate** - One phase at a time, all tests green before next phase
5. **Document** - Update ADRs and team docs
6. **Merge** - PR with comprehensive testing evidence

---

**Questions for Senior Architect:**

1. Approve domain boundaries (core/planning/booking/health/financial)?
2. Confirm merge strategy (User+Household → Core, Season+CookingTeam → Planning)?
3. Financial domain needed now or defer to future?
4. Prefer single fragments file or split by domain (domainFragments.ts vs core/planning/health fragments)?
