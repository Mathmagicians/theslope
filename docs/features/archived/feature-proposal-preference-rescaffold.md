# Feature Proposal: Preference-Triggered Re-Scaffolding

**Status:** 🔄 In Progress | **Date:** 2025-12-31

## ✅ Implemented

- `POST /api/admin/household/inhabitants/[id]` returns `InhabitantUpdateResponse` with `scaffoldResult`
- `scaffoldPrebookings` refactored: accepts `{seasonId?, householdId?}` options
- `InhabitantUpdateResponseSchema` in `useBookingValidation.ts`
- `getScaffoldableDinnerEvents` extracted to `useSeason.ts`
- E2E tests: DINEIN→orders created, NONE→orders deleted, USER_CANCELLED respected
- UI E2E test: ADR-015 scaffolding via HouseholdCard
- Fixed year-rollover bug in `seasonImport`
- Updated `features.md` and `user-guide.md` with auto-scaffolding documentation

## 🐛 BUG: Delete vs Release After Deadline

**Problem:** Scaffolder DELETEs orders when preference→NONE. After deadline, should RELEASE instead (user pays, ticket available).

**Business Rules:**
- Before deadline: DELETE (no charge)
- After deadline: RELEASE (state→RELEASED, user pays)

**Fix Strategy:** Use `pruneAndCreate`'s `update` bucket for past-deadline orders instead of `delete`:
1. Modify `createHouseholdOrderScaffold` to check deadline when categorizing orders
2. Orders past deadline go to `update` (with state=RELEASED), not `delete`
3. Update `ScaffoldResultSchema` to include `released` count
4. Handle `result.update` in scaffoldPrebookings to release orders

## 🔄 Remaining: Toast & Loading State

| File | Change |
|------|--------|
| `app/stores/households.ts` | Return `ScaffoldResult` from update methods |
| `app/components/household/HouseholdCard.vue` | Add loading state + toast notification |

### Toast Messages (Danish)

| Scenario | Title | Description |
|----------|-------|-------------|
| Orders created | "Bookinger opdateret" | "3 bookinger oprettet" |
| Orders deleted | "Bookinger opdateret" | "2 bookinger fjernet" |
| Orders released | "Bookinger frigivet" | "1 booking frigivet til andre" |
| Mixed | "Bookinger opdateret" | "2 oprettet, 1 fjernet, 1 frigivet" |
| No changes | "Ingen ændringer" | "Dine bookinger matcher allerede dine præferencer" |
| No active season | (no toast) | Preferences saved, no scaffolding |

---

## Key Concepts (Reference)

**Same scaffolding logic everywhere:** Season activation, daily maintenance, and preference changes all use `scaffoldPrebookings` with `pruneAndCreate`.

**USER_CANCELLED always respected:** Cancelling a specific dinner creates audit entry - scaffolder never recreates it.

**Scope:** Single inhabitant or power mode both scaffold the whole household (idempotent).
