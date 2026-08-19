# Bug Fix Plan: v0.9 Bug Sprint (M1)

**Status:** Accepted
**Date:** 2026-08-19
**Branch:** `fix/bug-sprint-heynabo-allergies-holidays` (one branch, per-bug commits, TDD per ADR-003)
**Parent:** [release-plan-v0.9.md](proposals/release-plan-v0.9.md)

Covers B2–B5. B1 and B6 have their own docs:
[bug-fix-booking-desired-order-builder.md](bug-fix-booking-desired-order-builder.md) ·
[bug-fix-order-snapshot.md](bug-fix-order-snapshot.md)

---

## DRY Principles — the point of this sprint

Every bug below exists because the same logic was written more than once and the copies drifted.
**Each fix must delete the divergent copies — never add another variant.**

| Rule | One source of truth | Bugs it governs |
|------|---------------------|-----------------|
| One reconciliation scope per entity | Inhabitants reconcile **globally** by `heynaboId @unique` (mirror `reconcileUsers`, already global in the same file) — not per-household | B2 |
| One chef-loss routine | `server/utils/removeChefRole.ts` (extracted from `remove-role.post.ts`), called by every path that takes a chef off a dinner | B2 |
| One store fetch pattern | Canonical `useAsyncData` + `useRequestFetch` pattern (reference: `plan.ts`); extract shared status-computed helper | B3, B4 |
| One DesiredOrder builder | `buildDesiredOrder` (B1 doc) | B1 |
| One snapshot pattern | ADR-011 live-first fallback (Transaction; extended to `DinnerEvent.chefName`; B6's Order `ticketType`) | B2, B6 |
| DRY tests | Factories + `describe.each` per [testing.md](../testing.md); no copy-paste setup | all |

The store-fetch helper extracted here is the **pilot** for the M2 consistency sweep (I1/I2 in
the release plan) — allergies store converts first, the remaining stores follow in M2.

---

## B2 — Inhabitant deleted on Heynabo survives in TheSlope (appears in allergies)

### Domain rules

Canonical rules live in **ADR-013 → "Household & Inhabitant Lifecycle"** ([adr.md](../adr.md)),
added as part of this fix. In one line: households are preserved on move-out; inhabitants
always follow Heynabo (hard delete, global identity by `heynaboId @unique`); the nightly
cron order is intentionally safe (HN deletes users ~1 month post-move-out, no orders
scaffold past `moveOutDate`) — do not reorder.

### Root cause

`heynaboImportService.ts` reconciles inhabitants **per household**, against only the
*resolved* (winner) household at each address (`buildResolvedHouseholdMap`). The preserved
old-family household is a non-resolved **sibling** — its inhabitants are never in any delete
bucket, so members Heynabo deleted (the moved-out family) survive here. Sibling inhabitants
are consulted only for the *create* bucket (`classifyInhabitantForImport`). A second leak:
households whose `heynaboId` lookup misses are skipped with a `warn` — their inhabitants also
escape reconciliation.

### Fix — global inhabitant reconciliation, existing deletion machinery

`Inhabitant.heynaboId` is `@unique`, so identity is global; `reconcileUsers` in the same file
already reconciles globally — mirror it:

1. Delete bucket = all existing inhabitant `heynaboId`s − all incoming member `heynaboId`s (across ALL households, siblings included).
2. Execute with the **existing** helpers the import already calls — `deleteUsersByInhabitantHeynaboId` then `deleteInhabitantsByHeynaboId`. No new deletion logic.
3. **Remove** the per-household delete branch (the divergent copy).
4. Create/update buckets stay per-address (they need household routing) — unchanged.

**Pre-work check:** verify no production path mints inhabitants with synthetic `heynaboId`s
Heynabo would never send (admin household creation inherits the address's real `heynaboId`;
the admin move flow relocates existing inhabitants). If one exists, close it first.

### Blast radius of deleting an Inhabitant (schema-verified)

Deletion semantics are schema-driven (ADR-005), identical to the existing admin
delete-inhabitant action. Safety is designed in at the schema level (ADR-011):

| Relation | onDelete | Consequence |
|----------|----------|-------------|
| `Allergy` | CASCADE | Removed — **the bug fix** |
| `Order` (all states) | CASCADE | Removed; billing history survives via `Transaction.orderSnapshot` (`Transaction.orderId` SET NULL) |
| `CookingTeamAssignment` | CASCADE | Removed — they left |
| `OrderHistory` | SET NULL | Audit survives — denormalized `inhabitantId`/`dinnerEventId`/`seasonId` columns exist precisely for post-deletion queries |
| `DinnerEvent.chefId` | SET NULL | Dinner survives — see chef-loss + attribution below |
| `User` | explicit delete first (existing import step) | Payer preserved in `Transaction.userSnapshot` |

### Chef-loss: shared `removeChefRole` routine

The DB cascade only nulls `chefId` — it cannot run the business-level chef-loss handling
that today lives **only** in `remove-role.post.ts` (delete Heynabo event best-effort, apply
`CHEF_LOSS_DINNER_UPDATES`, clear allergens). Without it, a deleted chef leaves an ANNOUNCED
dinner with a ghost menu, a live orphaned Heynabo event, and open bookings nobody will cook for.

**Extract the endpoint's core into `server/utils/removeChefRole.ts`** — server util, not
composable: it orchestrates D1 + Heynabo I/O and all callers are server-side. The pure
field-set `CHEF_LOSS_DINNER_UPDATES` **stays in `useBooking.ts`** (chef-swap decision); the
util imports it — same composable→server-util split as `scaffoldPrebookings.ts` /
`isHouseholdActiveOnDay` (ADR-016: composable decides, server executes).

Callers (all converge on the one routine):
1. `remove-role.post.ts` (existing "Meld afbud" endpoint — refactored to call the util)
2. `/api/admin/household/inhabitants/[id].delete.ts` (admin delete)
3. `heynaboImportService.ts` delete path (this fix)

Applied to **future non-CONSUMED** dinners where the deleted inhabitant is chef, before the
inhabitant delete executes.

### Chef attribution on old menus: `DinnerEvent.chefName` snapshot

Past dinners must keep "who cooked" after the chef's inhabitant row is deleted
(ADR-011 snapshot pattern, live-first fallback — no tombstone inhabitants):

- **Migration:** add `chefName String?` to `DinnerEvent`.
- **Write site (single):** `assign-role` sets it alongside `chefId`.
- **Cleared by** `CHEF_LOSS_DINNER_UPDATES` (a resigned chef didn't cook) — add `chefName: null` to the field set.
- **NOT cleared by deletion** — `chefId` SET NULLs, the name survives on old menus.
- **Display:** live `chef` relation → else `chefName`.
- Duty roster (F5) later carries full attribution history; this column is the cheap interim.

### Delete-consistency sweep

Audit step: list every business-level leftover a plain cascade misses when an
inhabitant/user is deleted, fix via the shared routine or log as follow-up. Known candidates:

- [ ] Stale `DinnerEventAllergen` rows derived from a deleted inhabitant's allergies (chef-facing allergen list may name an allergen no attendee has)
- [ ] `Order.bookedByUserId → null` display fallbacks (payer shown as "—"?)
- [ ] `OrderHistory.performedByUserId → null` rendering in audit timeline
- [ ] Team roster views when an assignment cascade empties a role

### TDD

- **Red (E2E, extends the #106 multi-household import suite):**
  - Old family in preserved sibling household; Heynabo stops sending its members → inhabitants deleted, allergies gone from poster/catalog/household queries, **household row remains** with `moveOutDate` intact.
  - Member still in Heynabo (in resolved OR sibling household) → untouched (idempotency).
  - Billing: transaction with `orderSnapshot` survives the inhabitant deletion.
  - Deleted inhabitant is chef on a future ANNOUNCED dinner → dinner reverts to clean SCHEDULED (menu cleared, allergens cleared, `heynaboEventId` null).
  - Past CONSUMED dinner keeps `chefName` after the chef's deletion.
- **Unit:** global reconciliation bucket function, parametrized (in resolved household / in sibling / not in DB / not in Heynabo); `removeChefRole` against dinner states (parametrized).

---

## B3 — `/admin/allergies` intermittently shows no data

### Root cause (high confidence)

`app/stores/allergies.ts` mixes **three** fetch patterns:

| Data | Pattern | Problem |
|------|---------|---------|
| Allergy type catalog | `useFetch` at store creation (`immediate: true, watch: false`) | The SSR-fragile pattern documented in [proposals/bare-fetch-fix.md](proposals/bare-fetch-fix.md): store instantiated during SSR → hydration/payload mismatch → `status === 'success'` with empty data, or stuck idle on client-side nav |
| Selected type + allergies | `useAsyncData` + `useRequestFetch` | ✅ the pattern we want |
| All mutations | bare `$fetch` | inconsistent, no SSR context |

Additionally `isAllergyTypesInitialized` checks only `status === 'success'`, not data
presence — violates ADR-007 compliance rule 3, so a failed hydration renders as
"initialized, empty" instead of surfacing the failure.

### Fix

Convert the catalog fetch to `useAsyncData` + `useRequestFetch`; extract the repeated
status-computed boilerplate (`isLoading` / `isErrored` / `isInitialized` / `isEmpty` /
`refresh`) into a shared store helper and adopt it in this store first (pilot for M2).
`isInitialized` must check data presence.

### TDD

- **Red:** store component test reproducing the empty-hydration state (existing allergies
  store spec + `registerEndpoint` + `clearNuxtData`); assert `isInitialized` is false when
  data is absent.
- **Green:** convert store; assert catalog loads on both direct SSR load and client nav.

---

## B4 — Errors editing allergies in `/admin/allergies`

Not yet reproduced. Users report errors on edit (allergy types via `formMode` edit flow, or
inhabitant allergies). Likely the same store (mutations are bare `$fetch` + full-catalog
reload on every mutation); may collapse into B3's conversion.

**Plan:** reproduce (which action, which status code — check ADR-004 logs), failing test
capturing the repro, fix inside the B3-converted store.

---

## B5 — Errors adding holidays to a new season

### Suspects (repro first)

1. **Create-mode auto-calc overwrites user input.** `AdminPlanning.vue` watches
   `currentModel.seasonDates` (`deep: true, immediate: true`) and replaces
   `currentModel.holidays` with `getDefaultHolidays(...)` on every change — a user-added
   holiday is silently wiped or collides with re-inserted defaults.
2. **Overlap refine vs auto-inserted defaults.** A user-added range overlapping an
   auto-inserted default holiday fails `areRangesOverlapping` with an error that looks
   spurious ("I only added one range").
3. **Inside-season refine.** Holiday outside `seasonDates` fails `isDateRangeInside`;
   error text may not make the cause obvious.
4. **`dd/MM/yyyy` parse round-trip** in `serializeSeason` / `deserializeSeason`.

### Fix

1. **Red (E2E):** create-flow repro — new season, adjust dates, add a holiday, assert no
   validation error, save, verify holidays persisted.
2. Auto-calc writes defaults only while the user hasn't touched holidays (dirty flag) — or
   merges instead of overwrites.
3. Picker error messages name the offending range (extend `mapZodErrorsToFormErrors` output,
   don't fork it).
4. **Component test:** user-added holiday survives a subsequent `seasonDates` edit in create
   mode; parametrized refine cases extended in the `useSeasonValidation` spec.

---

## Sprint Order & Exit Criteria

| Order | Bug | Why this order |
|-------|-----|----------------|
| 1 | B2 | Data correctness + safety-relevant (allergy poster); largest piece (migration + shared routine) |
| 2 | B3 + B4 | One store conversion covers both; produces the shared helper for M2 |
| 3 | B5 | Needs repro time; independent of the others |
| 4 | B6 | Small, self-contained (own doc) |

**Done when:** all new E2E/unit tests green with `--workers=4`, `npm run pre:all` passes,
compliance tables updated (allergy endpoints + allergies store rows), and each fix has
*removed* the duplicated logic it replaced.
