# Workplan: Dinner Preference Change Tests

## Goal

Add comprehensive test coverage for dinner preference changes, verifying scaffold result counts match expected business behavior.

## Business Rules (Scaffold Behavior)

| Preference Change | Expected Scaffold Result | Reason |
|-------------------|-------------------------|--------|
| NONE → DINEIN | `created > 0` | User now wants to eat, create orders |
| NONE → TAKEAWAY | `created > 0` | User now wants food (takeaway), create orders |
| DINEIN → NONE | `released > 0` | User no longer wants to eat, release orders |
| TAKEAWAY → NONE | `released > 0` | User no longer wants food, release orders |
| DINEIN → TAKEAWAY | `unchanged` or `released=0` | User still wants food, just mode change - orders NOT released |
| TAKEAWAY → DINEIN | `unchanged` or `released=0` | User still wants food, just mode change - orders NOT released |
| Same preference | `unchanged > 0` | Idempotent, no changes |

**Key insight:** Mode changes between eating modes (DINEIN/DINEINLATE/TAKEAWAY) should NOT release orders - user still wants food, just different delivery.

## Test Strategy

### Part 1: Store Tests ✅ COMPLETE

**File:** `tests/component/stores/households.nuxt.spec.ts` - 15 tests passing

### Part 2: API Tests (E2E) ✅ COMPLETE

**File:** `tests/e2e/api/household/preferences.e2e.spec.ts` - 12 tests passing

**Bug Fix Applied:** `scaffoldPrebookings.ts` update loop now correctly handles:
- NONE after deadline → release order (user charged)
- Mode changes between eating modes → update mode only, keep BOOKED

**Tests implemented:**
- NONE → DINEIN: verify `created` count matches dinner events ✅
- DINEIN → NONE: verify `released` count matches existing orders ✅
- DINEIN → TAKEAWAY: verify orders NOT released (released=0) ✅
- Same preference: verify `unchanged` count ✅

### Part 3: UX Tests (E2E)

**File:** `tests/e2e/ui/HouseholdCard.e2e.spec.ts`

**Existing coverage (verify adequate):**
- Individual inhabitant preference editing via UI
- ADR-015 scaffolding test (NONE → DINEIN creates orders)

**New: Power mode bulk update test:**
- Create household with 2+ inhabitants, all with NONE preferences
- Navigate to household members page
- Click power mode toggle (bolt icon)
- Change all cooking days to DINEIN via power mode row
- Save and verify ALL inhabitants get orders scaffolded
- Verify order count = inhabitants × cooking days in season

## Test Data Setup

All tests use:
- Singleton active season pattern (cleaned up by global teardown)
- Test household created per test/describe block with salted names
- Known initial preferences set via API before UI interaction

## Implementation Order

1. Store tests first (fastest feedback loop, no browser)
2. API tests second (verify scaffold counts directly)
3. UX tests last (verify UI triggers correct scaffold behavior)

## Verification

```bash
# After each part, verify parallel-safe
npx vitest run tests/component/stores/households.nuxt.spec.ts --reporter=verbose
npx playwright test tests/e2e/api/household/preferences.e2e.spec.ts --workers=4
npx playwright test tests/e2e/ui/HouseholdCard.e2e.spec.ts --workers=4
```
