# Feature Proposal: Admin Can Edit Households and Move Inhabitants

**Status:** Proposed
**Date:** 2026-04-15

**Follows:** `feature-proposal-move-out-date.md` — once households can coexist at the same `heynaboId` and the admin can add a new household (Phase 4 there), the admin needs lifecycle tooling to correct residency dates, reassign inhabitants across households, and retire households.

## Business Rule

Admin can change a household's residency dates, move an inhabitant between households, and delete a household.

Heynabo-owned fields (`heynaboId`, `address`, `name`, household inhabitants as a set) are never edited by TheSlope — they are displayed read-only. Moving an inhabitant respects the target household's residency window through the existing rescaffold machinery; the resulting order changes are surfaced to the admin. Orders are per-inhabitant, never per-household — the move is a single FK update on `Inhabitant.householdId`.

## Architecture Decisions

### Decision 1: Reuse `InhabitantSelector` with Slots

The cooking-team component `app/components/cooking-team/InhabitantSelector.vue` already solves the "find an inhabitant across the community, show their current assignment, take an action" problem (search + pagination + status badge + action buttons, with immediate save via parent). Generalize it into a single shared component.

**Move to:** `app/components/shared/InhabitantSelector.vue`

**API:**

| Prop | Type | Notes |
|------|------|-------|
| `inhabitants` | `Inhabitant[]` | Parent-fed (ADR-007: parent owns fetching) |
| `currentGroupKey` | `number \| null` | Drives "current vs other" styling |
| `sortPriority` | `(inhabitant) => number` | Custom sorter; default = name |
| `searchPlaceholder` | `string` | Defaults to generic |
| `statusHeader` | `string` | Column header label |
| `actionsHeader` | `string` | Column header label |
| `emptyText` | `string` | Empty-state copy |
| `pageSize` | `number` | Defaults to 8 |
| `loading` | `boolean` | Pass-through to `UTable` |

**Slots:** `#status` (scoped `{ row }`), `#actions` (scoped `{ row }`). Both call-sites (cooking team, household) render their own domain-specific badges and buttons.

### Decision 2: Move = Update `Inhabitant.householdId` via Existing Endpoint

`POST /api/admin/household/inhabitants/[id]` currently strips `householdId` from the body (`.omit({householdId: true, id: true})`), so inhabitants cannot be moved today. Drop `householdId` from the omit and pass it into the existing `rescaffoldOnFieldChange` fields map. The endpoint already returns `{ inhabitant, scaffoldResult }` — no new response shape, no new rescaffold path.

Target household is rescaffolded because `rescaffoldOnFieldChange` is called with `updatedInhabitant.householdId` (= the new household). Source household needs no rescaffold — the inhabitant is no longer on it, so the source scaffolder has nothing to reconcile regarding them.

### Decision 3: Move Feedback Is Always Visible

`scaffoldResult` from the move is surfaced identically to preference changes and move-out date: toast (success summary) + persistent alert beneath the edit panel (last-operation summary). No silent rescaffolds.

### Decision 4: Delete via DangerButton Two-Click

Household deletion CASCADE-removes inhabitants (ADR-005). DangerButton's second-click state surfaces the consequence inline ("2 beboere slettes — historiske ordrer bevares") and offers `[→ Flyt beboere først]` as the recommended path when active inhabitants exist.

### Decision 5: Heynabo-Owned Fields Are Read-Only

`heynaboId`, `address`, `name`, and the household's inhabitant set come from Heynabo via `mergeHouseholdForUpdate`. The edit panel displays these as read-only. TheSlope-owned fields (`movedInDate`, `moveOutDate`) remain editable via the existing Residens pencil-gate pattern from `HouseholdSettings.vue`. `pbsId` is locked after create.

## UX

Edit lives in the same `v-model:expanded` row that Phase 4 of the preceding proposal introduces for create. The panel has no form-level save — every edit path is either immediate (move, delete) or governed by its own pencil-gate (Residens).

```
┌─ Husstande på Skråningen ──────────────────────────── [+ Ny husstand] ─┐
│ …                                                                        │
│ ▾ │ Skr_14      │ 115 ➡ Fraflytter  │ Skråningen 14 │ Emil, Frida│       │
│ ╔══════════════════════════════════════════════════════════════════╗    │
│ ║  ── Stamdata ──────────────────────────────────                   ║    │
│ ║  🔢 PBS-nummer      115                                           ║    │
│ ║  🏠 Adresse         Skråningen 14      (Heynabo)                  ║    │
│ ║  🔗 Heynabo-ID      42                                            ║    │
│ ║  🏷 Forkortelse     Skr_14                                        ║    │
│ ║                                                                    ║    │
│ ║  ── Residens ──────────────────────────────────────── [✎]        ║    │
│ ║  🏠 Indflyttet      15/08/2020                                    ║    │
│ ║  ➡ Fraflytter       01/06/2026                                    ║    │
│ ║                                                                    ║    │
│ ║  ── Beboere ─────────────────────────────────────────────────     ║    │
│ ║  [🔍 Søg navn, PBS eller adresse…]                 [⇅ Status]    ║    │
│ ║  ┌──────────────────────────────────────────────────────────┐    ║    │
│ ║  │ Navn           │ Nuværende husstand  │ Handling          │    ║    │
│ ║  ├────────────────┼──────────────────────┼───────────────────┤    ║    │
│ ║  │ 👤 Emil S.     │ [Skr_14 PBS 115] ✓  │ (i denne husstand)│    ║    │
│ ║  │ 👤 Frida S.    │ [Skr_14 PBS 115] ✓  │ (i denne husstand)│    ║    │
│ ║  │ 👤 Anna H.     │ [Skr_12 PBS 100]    │ [→ Flyt hertil]   │    ║    │
│ ║  │ 👤 Bo H.       │ [Skr_12 PBS 100]    │ [→ Flyt hertil]   │    ║    │
│ ║  │ 👤 Carl J.     │ [Skr_17 PBS 101]    │ [→ Flyt hertil]   │    ║    │
│ ║  │ 👤 Greta L.    │ [Skr_20 PBS 102]⊗   │ (fraflyttet)      │    ║    │
│ ║  └──────────────────────────────────────────────────────────┘    ║    │
│ ║                                                     «  1 2 3  »  ║    │
│ ║                                                                    ║    │
│ ║  ──────────────────────────────────────────────                   ║    │
│ ║  [🗑 Slet husstand]                                   [✕ Luk]    ║    │
│ ╚══════════════════════════════════════════════════════════════════╝    │
└──────────────────────────────────────────────────────────────────────────┘
```

**Delete first-click (DangerButton state 2, with active inhabitants):**
```
⚠ Klik igen for at slette Skr_14 (PBS 115)  — 9s
   2 beboere slettes (CASCADE). Historiske ordrer bevares.
   [→ Flyt beboere først] hvis du vil bevare dem
```

**Move toast:**
```
🤖  Emil S. flyttet til Skr_14 (PBS 116)
    4 bookinger oprettet · 2 bookinger slettet · 8 uændret
```

## Progress

### ✅ Done

| File | Change |
|------|--------|
| `app/components/shared/InhabitantSelector.vue` | New generic component with `#status`, `#actions`, `#expanded` slots, parent-fed data, sort toggle, pagination |
| `app/components/cooking-team/InhabitantSelector.vue` | Deleted (replaced by shared) |
| `app/components/cooking-team/CookingTeamCard.vue` | Refactored to use shared `InhabitantSelector`; data via pure merge function; multi-team badges with percentage + affinity; "Tilføj"/"Rediger" expand inline form below row; member list shows percentage + affinity |
| `app/components/cooking-team/TeamMemberAddForm.vue` | New inline form: role select, percentage select, weekday affinity (parent-restricted, hidden restricted days); DS-compliant; pre-fills for edit mode |
| `app/composables/useCookingTeam.ts` | `mergeInhabitantsWithAssignments()` pure function (no store dependency); returns ALL assignments per inhabitant with percentage + affinity |
| `app/composables/useCookingTeamValidation.ts` | Added `ROLE_OPTIONS`, `ALLOCATION_PERCENTAGE_OPTIONS` constants |
| `app/components/admin/AdminTeams.vue` | Updated emits (`add:member` + `update:member` with percentage/affinity); `?team=` query param for stable selection; `FormMode` import |
| `app/components/calendar/WeekDayMapDisplay.vue` | Added `hideRestricted` prop; compact view only renders active days (no 7-slot grid) |
| `tests/component/components/shared/InhabitantSelector.nuxt.spec.ts` | 22 parametrized tests |
| `tests/component/composables/useCookingTeam.nuxt.spec.ts` | Rewritten for pure function (23 tests, proper types) |
| `app/components/admin/HouseholdEditPanel.vue` | New; read-only Stamdata/Residens, InhabitantSelector for move, DangerButton delete. Pure prop-driven, emits to parent |
| `app/components/admin/AdminHouseholds.vue` | Added row expansion with edit button, wired HouseholdEditPanel, event handlers call store |
| `app/stores/households.ts` | Added `moveInhabitant()`, `deleteHousehold()`, `lastMoveResult` ref. Toasts + error handling in store |
| `server/routes/api/admin/household/inhabitants/[id].post.ts` | Dropped `householdId` from `.omit`; added `householdId` to `rescaffoldOnFieldChange` fields |
| `tests/component/components/admin/HouseholdEditPanel.nuxt.spec.ts` | 11 tests (stamdata, residens, beboere, emits, delete label) |
| `tests/e2e/api/parallel/admin/inhabitant.e2e.spec.ts` | 4 new move tests (basic move, scaffold on target, moved-out residency, preserve preferences) |
| `app/composables/useHeynabo.ts` | Added `classifyInhabitantForImport()` — sibling-aware classification for HNI admin-move support |
| `app/composables/useHousehold.ts` | `buildResolvedHouseholdMap()` now returns `{resolved, siblingInhabitants}` |
| `app/utils/batchUtils.ts` | Added `ReconciliationBucket` type |
| `server/utils/heynaboImportService.ts` | Create bucket checks siblings before creating — prevents duplicate on admin-moved inhabitants |
| `tests/component/composables/useHeynabo.unit.spec.ts` | 6 new parametrized tests for `classifyInhabitantForImport` |
| `tests/component/composables/useHousehold.nuxt.spec.ts` | Updated for new return shape + 2 new sibling inhabitant lookup tests |
| `tests/e2e/api/serial/admin/heynabo.e2e.spec.ts` | New test: admin-move preserved across HNI import |

### ⚠️ Known bugs

| Bug | Status |
|-----|--------|
| `?team=` query param bleeds to other tabs and form modes when navigating away from AdminTeams EDIT | Parked — `useQueryParam` auto-sync doesn't support conditional removal; `onBeforeUnmount` approach caused mode param stripping. Needs `useTabNavigation` to selectively preserve params, or a dedicated cleanup mechanism. |

### ❌ Remaining

| File | Change |
|------|--------|
| `docs/adr.md` (ADR-005) | Document inhabitant reassignment |

## ADR Impact Analysis

| ADR | Impact |
|-----|--------|
| **ADR-005** (Cascade/SET NULL) | Update: inhabitants may be reassigned to another household; delete still CASCADEs remaining inhabitants |
| **ADR-009** (Index Data Inclusion) | `InhabitantSelector` consumes `Inhabitant` with nested `Household` (shortName, pbsId, moveOutDate) — within existing Display cardinality |
| **ADR-016** (Unified Booking) | Target-household rescaffold after move reuses the existing per-event filter; no new code path |

## Verification Plan

| # | Verification | Test file | Status |
|---|-------------|-----------|--------|
| pre | **All** unit and E2E suites green before and after this feature | — | |
| 1 | E2E API — `POST /api/admin/household/inhabitants/:id` with `{ householdId: B }` updates FK and returns `scaffoldResult` | `tests/e2e/api/parallel/admin/inhabitant.e2e.spec.ts` | ✅ 4 tests |
| 2 | E2E API — after move, target B's residency window applied: orders past B's `moveOutDate` pruned from the inhabitant | `tests/e2e/api/parallel/admin/inhabitant.e2e.spec.ts` | ✅ |
| 3 | E2E API — delete of household with no inhabitants succeeds; delete with inhabitants CASCADEs them | `tests/e2e/api/parallel/admin/household.e2e.spec.ts` | |
| 4 | E2E UI — admin expands a row, moves an inhabitant via `InhabitantSelector` `[→ Flyt hertil]`; toast shows scaffold result; row updates in both source and target | `tests/e2e/ui/AdminHouseholds.e2e.spec.ts` | |
| 5 | E2E UI — DangerButton two-click delete; active-inhabitants variant surfaces `[→ Flyt beboere først]` | `tests/e2e/ui/AdminHouseholds.e2e.spec.ts` | |
| 6 | Unit — `InhabitantSelector` search, sort, pagination, slots, empty state | `tests/component/components/shared/InhabitantSelector.nuxt.spec.ts` | ✅ 22 tests |
| 6b | Unit — `mergeInhabitantsWithAssignments` pure function | `tests/component/composables/useCookingTeam.nuxt.spec.ts` | ✅ 23 tests |
| 7 | Unit — store `moveInhabitant` passes `householdId`, stores `scaffoldResult` in `lastMoveResult` | `tests/component/stores/households.nuxt.spec.ts` | |
| 8 | Unit — store `deleteHousehold` success + CASCADE behavior surfaced | `tests/component/stores/households.nuxt.spec.ts` | |
| 9 | Unit — `InhabitantUpdateSchema` accepts optional `householdId` | `tests/component/composables/useCoreValidation.unit.spec.ts` | |
| 10 | Factory — add `moveInhabitant(context, inhabitantId, targetHouseholdId)` and `deleteHousehold(context, householdId)` helpers | `tests/e2e/testDataFactories/householdFactory.ts` | |
| 11 | Existing cooking-team tests still pass after `InhabitantSelector` generalization | `tests/e2e/ui/AdminTeams.e2e.spec.ts` | |
| 12 | `npx vitest run` green | — | |
| 13 | `npx playwright test` relevant suites green | — | |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Generalized `InhabitantSelector` breaks cooking-team call-site | Medium | Medium | Parametrized test covers both call-sites; land refactor separately from new household call-site |
| Move creates stale orders outside target residency | Low | Medium | Target rescaffold via existing `rescaffoldOnFieldChange` — covered by verification #2 |
| Delete cascade removes inhabitants admin didn't intend to lose | Low | High | DangerButton two-click + active-inhabitants hint steers admin to move-first path |

## Dependencies

Depends on `feature-proposal-move-out-date.md` Phase 4 being merged — needs `v-model:expanded` scaffolding in `AdminHouseholds.vue` and the ability for multiple households to share a `heynaboId`.

## References

- `feature-proposal-move-out-date.md` — residency enforcement, URL disambiguation, schema migration, add-household
- `app/components/cooking-team/InhabitantSelector.vue` — source of the reusable finder pattern
- `server/routes/api/admin/household/inhabitants/[id].post.ts` — existing update endpoint with `rescaffoldOnFieldChange`
- `server/utils/scaffoldPrebookings.ts` — `rescaffoldOnFieldChange`, `isHouseholdActiveOnDay`
- `app/components/shared/DangerButton.vue` — two-click confirm pattern
- `app/components/household/HouseholdSettings.vue` — Residens pencil-gate pattern reused here
