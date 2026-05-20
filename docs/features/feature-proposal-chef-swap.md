# Feature Proposal: Chef Role Assignment & Swap

**Status:** Accepted
**Date:** 2026-03-30
**Updated:** 2026-05-20 — Meld afbud refinement: Self branch gains a resign trigger (was inert); `remove-role` realigned — `CHEF_LOSS_DINNER_UPDATES` lives in `useBooking` (no new composable), `RemoveRoleRequestSchema` drops the redundant `dinnerEventId` (it is the route `[id]`); resign panel commits via `DangerButton` 2-step (destructive — clears the menu)
**Updated:** 2026-04-30 — Phase 2 implemented; toast moved into store via `claimRoleForMe` (DRY with auto-claim); SSR-safe refresh refactor scheduled before Phase 3 (see Phase 2.5)
**Updated:** 2026-04-28 — design refinements: client-side auto-claim, business logic in composables, plain panel buttons, copy with date+team, `IdSchema`

## Problem

- Volunteering is ~100% of chef assignments. Swaps are ~2/month. UX optimises the volunteer path first.
- Chef portrait is inert — users tap it expecting to volunteer, nothing happens.
- The "Bliv chefkok" button sits in `WorkAssignment` far below the menu editor. Chefs editing a WANTED menu scroll past saving and forget to click it.
- No swap flow ("Byt Tjans" is a disabled placeholder).
- No flow for menu/Heynabo handling when a chef is replaced on an ANNOUNCED dinner.
- `Household.moveOutDate` doesn't cascade — future cooking assignments linger.
- Swaps aren't always 1-for-1 chef (e.g. trade 2× dishwashing for 1× chef).

## Scope

- Tap target next to the chef portrait for volunteering. Inline panel with confirm/cancel.
- Swap flow: tap portrait row or "Byt" when someone else is chef → inline panel with multi-select assignment checkboxes, menu decision (when ANNOUNCED), confirm.
- Two paths to claim chef:
  - **Explicit:** trigger button → `POST /api/team/cooking/[id]/assign-role`.
  - **Implicit:** save menu on a WANTED dinner → client orchestrates `assign-role` then `chef/dinner/[id]`.
- Move-out cascade on `Household.moveOutDate`: delete future `CookingTeamAssignment` rows, fully reset future dinners where the moving inhabitant was chef. "Flytter {date}" badge in team rosters.
- Generic `RoleAssignment` component, role-keyed (CHEF mounted this iteration).
- Accessible from `/dinner` and `/chef`.

## UX Design

### Entry Points

The trigger next to the portrait is binary: **`Bliv chefkok`** when the dinner is
vacant, **`Ændre tjans`** when a chef is assigned. The panel sub-branches by viewer
— resign (Meld afbud) when the viewer is the chef, swap when it is someone else.

**Vacant — adjacent "Bliv chefkok" trigger:**

```
+-----------------------------------------------+
|  (hat)                                        |
|  (?)  WANTED   [(chef-hat) Bliv chefkok (+)]  |
|       Chefkok                                 |
+-----------------------------------------------+
```

**Has a chef (self or other) — adjacent "Ændre tjans" trigger:**

```
+-----------------------------------------------+
|  (hat)                                        |
|  (AH) Anna H.    [(chef-hat) Ændre tjans (v)] |
|       Chefkok                                 |
+-----------------------------------------------+
```

### Vacant Claim Panel

Copy uses `dinnerEvent.date` (via `formatDate`) and `dinnerEvent.cookingTeam.name` (via `useCookingTeam.getTeamShortName`). Generic across roles via `ROLE_LABELS[role]`. The "sammen med …" clause is omitted when the dinner has no cooking team.

```
+--------------------------------------------------------+
|  🍳 Spisning søger chefkok!                            |
|                                                        |
|  Du tager chefkok-tjansen for fællesspisning           |
|  den 15. apr, sammen med Madhold A.                    |
|                                                        |
|             [Fortryd]      [👨‍🍳 Bliv chefkok]          |
+--------------------------------------------------------+
```

### Meld afbud Panel (Self)

When the viewer is the dinner's chef, `Ændre tjans` opens the resign panel. Clears
the chef + menu + allergens server-side and reverts the dinner to `SCHEDULED`.

```
+--------------------------------------------------------+
|  ❌ Meld afbud som chefkok                             |
|                                                        |
|  Du melder afbud som chefkok. Tjansen bliver           |
|  ledig igen, og din menu slettes.                      |
|                                                        |
|             [Fortryd]   [❌ Meld afbud →]              |
+--------------------------------------------------------+
```

The commit is a `DangerButton` 2-step (`Meld afbud` → `Tryk igen for at melde afbud`)
— the documented exception to "panels use plain `UButton`": resigning is destructive
(deletes the menu), so it warrants the inline two-step confirm.

### Swap Panel

Shows the dinner being taken over and the caller's assignments (multi-select). Selecting 1+ assignments switches the commit button label and the agreement question.

```
+------------------------------------------------+
|  Du overtager fra Anna H:                      |
|  +------------------------------------------+  |
|  |  Tirs. 1. apr · Madhold A                |  |
|  |  Tatziki med bagt kartoffel              |  |
|  |  👨‍🍳 Chefkok · 42 kuverter              |  |
|  +------------------------------------------+  |
|                                                |
|  Byt med dine tjans:                           |
|  +------------------------------------------+  |
|  | [ ]  Tors. 3. apr · Madhold C            |  |
|  |      👨‍🍳 Chefkok · 38 kuv.              |  |
|  +------------------------------------------+  |
|  | [ ]  Ons. 9. apr · Madhold B             |  |
|  |      🧽 Opvask · 50 kuv.                 |  |
|  +------------------------------------------+  |
|                                                |
|  ℹ Har du aftalt med Anna at du               |
|    overtager hendes chefkok-tjans?             |
|                                                |
|  ℹ Husk at sige til Anna at hun skal           |
|    genannoncere sin middag bagefter            |
|                                                |
|             [Fortryd]   [👨‍🍳 Overtag tjans]   |
+------------------------------------------------+
```

The re-announce note (second `ℹ` line) shows only when any swap-side dinner is currently `ANNOUNCED`.

### Contextual Commit Button

| State | Selection | Label | Icon |
|---|---|---|---|
| WANTED | n/a | Bliv chefkok | chef-hat |
| Other chef, none selected | none | Overtag chefkok-tjans | chef-hat |
| Other chef, 1+ selected | assignments | Byt tjans | swap-arrows |

The panel itself is the confirmation surface — commit is a plain `UButton`, cancel is `Fortryd`. `DangerButton` is reserved for inline destructive actions outside panels (Aflys, Slet hold) — plus one in-panel exception: the Meld afbud commit (resigning deletes the menu).

### Menu Decision (ANNOUNCED dinners, swap only, role=CHEF)

| Target ANNOUNCED | Swap assignment ANNOUNCED | Options |
|---|---|---|
| No | No | No question |
| Yes | No | Behold menu / Nulstil menu |
| No | Yes | Behold menu / Nulstil menu |
| Yes | Yes | Byt menuer / Behold menuer / Nulstil menuer |

Commit button disabled until a menu choice is made (when applicable).

### Heynabo Token Flow (swap)

Heynabo events are owned by their publisher's HN account. Editing an existing event requires the publisher's token; no other token can modify it (system token can only delete).

When chefs swap on an ANNOUNCED dinner, the new chef cannot edit the old chef's event. Forced behaviour:

| ANNOUNCED dinner whose chef changes | Old HN event | New HN event |
|---|---|---|
| Target (caller becomes chef) | Delete via system token | Recreate under caller's token (caller as publisher) |
| Swap-side (other person becomes chef) | Delete via system token | Not recreated — no token for the other person |

This is independent of `menuStrategy`. Strategy controls only what menu content sits in TheSlope DB after the chef change; HN republish (when applicable) uses whatever's there.

The other person's "needs re-announce" state is **derived** — banner shown when `state === SCHEDULED && heynaboEventId === null && menuTitle !== ''`. No schema change.

**Banner on the other person's dinner card:** "Din middag skal genannonceres på Heynabo" with [Annoncer] button — clicking it republishes under their token.

### Empty Assignment List

```
ℹ Du har ingen kommende tjans at bytte med.

[Fortryd]   [👨‍🍳 Overtag chefkok-tjans]
```

Commit active — pure takeover.

### Toasts

Single toast per outcome — re-announce reminder folded into the same toast's description. Lines composed via `formatAssignmentLine(role, date, cookingTeamName)` (new helper in `useCookingTeam`, returns `"chefkok · 15. apr · Madhold A"`).

| Scenario | title | description |
|---|---|---|
| Volunteer / takeover | `Du er nu chefkok!` | `formatAssignmentLine(CHEF, d.date, d.cookingTeam.name)` |
| Auto-claim on save | `Menu gemt — du er nu chefkok!` | same |
| Swap | `Tjans byttet med {name}` | `Du tog: …` per `ours[i]`; `{name} tog: …` per `theirs[i]`; menu outcome line; re-announce reminder line (when applicable) |

Description lines (in order):
- `Du tog: {role · date · team}` — one per `ours`.
- `{name} tog: {role · date · team}` — one per `theirs`.
- Menu outcome: `SWAP` → `Menuerne er byttet`; `CLEAR` → `Menuerne er nulstillet`; `PRESERVE` → no line.
- Re-announce reminder: `Husk at sige til {name} at hun skal genannoncere sin middag` — only when any `theirs` dinner was `ANNOUNCED` before the swap.

### Pre-commit Panel Note

When a swap will require the other person to re-announce, an inline note appears in the swap panel above the commit button (alongside the "Har du aftalt med …" agreement question):

> ℹ Husk at sige til {name} at hun skal genannoncere sin middag bagefter

Visibility: any `swapAssignment` dinner is currently `ANNOUNCED`. Same trigger as the post-toast reminder line.

## Auto-Claim Orchestration

Client-side, in the bookings store. HTTP isn't atomic; convergence on retry is the model.

```ts
// app/stores/bookings.ts
const updateDinnerEventField = async (
    dinnerEventId: number,
    updates: Partial<DinnerEventUpdate>,
    currentChefId: number | null
): Promise<{dinner: DinnerEventDetail, wasAutoClaimed: boolean} | null> => {
    const myInhabitantId = authStore.user?.Inhabitant?.id ?? null
    const wasAutoClaimed = currentChefId === null && myInhabitantId !== null

    if (wasAutoClaimed) {
        await planStore.assignRoleToDinner(dinnerEventId, myInhabitantId, TeamRole.CHEF)
    }
    const dinner = await updateDinner(dinnerEventId, updates)
    return {dinner, wasAutoClaimed}
}
```

**Failure modes:**

| Step 1 (claim) | Step 2 (menu) | DB state | UX |
|---|---|---|---|
| ok | ok | chef set, menu set | toast "Menu gemt — du er nu chefkok" |
| ok | fails | chef set, menu unchanged | toast error. Retry: claim is skipped (chef now set), menu saves. |
| fails | (skipped) | unchanged | toast error. Retry from scratch. |

The strict `requireChefForDinner` guard on `/api/chef/dinner/[id]` enforces the order: cannot update the menu without first being chef.

## Move-out Cascade

**Trigger:** `Household.moveOutDate` set or changed to a future date (via `/api/household/[id]/update.post.ts`).

**Behaviour:**

1. Delete future `CookingTeamAssignment` rows for every inhabitant in the household.
2. For every future `DinnerEvent` where `chefId = inhabitant.id AND date > moveOutDate`: apply `CHEF_LOSS_DINNER_UPDATES` + clear allergens; if dinner was ANNOUNCED, also delete the Heynabo event via system token (best-effort).

Move-out is one-way — clearing `moveOutDate` later does not restore deleted assignments. Distinct from swap's preserve-menu semantic (the other person is still around to re-announce; the moving inhabitant is not).

**UI:** in `CookingTeamCard.vue`, members whose household has a future `moveOutDate` show `<UBadge color="warning">Flytter {formatDate(moveOutDate)}</UBadge>`.

## Architecture

### Component Structure

```
RoleAssignment.vue (NEW — generic, role-agnostic)
  Props:
    - dinnerEvent: DinnerEventDetail
    - role: "CHEF" | "COOK" | "JUNIORHELPER"
    - currentHolder?: InhabitantDisplay   (null = vacant)
    - default slot: portrait content
  Trigger branches (binary label):
    - Vacant      → trigger UButton "Bliv {role}" (role-icon + plus-circle)
    - Has a chef  → trigger UButton "Ændre tjans" (role-icon + chevron-down)
  Panel branches (sub-mode derived from chef vs caller):
    - volunteer (vacant)        → intro + commit UButton + Fortryd
    - resign    (caller = chef) → Meld afbud copy + DangerButton 2-step + Fortryd
    - swap      (other chef)    → swap form + commit UButton + Fortryd
  Click outside or Fortryd collapses the panel.
  Menu decision rendered when role === "CHEF" and ANNOUNCED (swap only).

Mounted this iteration:
  ChefMenuCard.vue      — wraps chef portrait
  CookingTeamCard.vue   — chef row, via #chef-action slot from /chef and /dinner
```

### API

| Method | Path | Status |
|---|---|---|
| POST | `/api/team/cooking/[id]/assign-role` | existing — refactored in Phase 1 to call `decideRoleAssignmentWrites` |
| POST | `/api/team/cooking/[id]/remove-role` | new (Phase 3) |
| POST | `/api/team/cooking/assignment/swap` | new (Phase 3) |
| POST | `/api/chef/dinner/[id]` | existing — Phase 1 adds `requireChefForDinner` guard |

**`/remove-role` body:**

```ts
{ role: TeamRole, inhabitantId?: number }  // dinner = route [id]; inhabitantId defaults to caller
```

When removing CHEF: applies `CHEF_LOSS_DINNER_UPDATES` + clears allergens; deletes the Heynabo event best-effort (200 on full success, 207 when the HN delete failed — consistent with `chef/dinner`). Authz: self-remove allowed; other-remove requires admin.

**`/assignment/swap` body:**

```ts
{
    targetDinnerEventId: number
    swapAssignments: { dinnerEventId: number, role: TeamRole }[]   // empty = pure takeover
    menuStrategy: 'PRESERVE' | 'SWAP' | 'CLEAR'                    // default 'PRESERVE'
}
```

**Authorization (all four):**

1. Caller holds every role in `swapAssignments`.
2. `targetDinnerEvent` has no chef or a different chef (rejects if caller is already chef).
3. All dinners are future and not in `(CONSUMED, CANCELLED)`.
4. All dinners are in the active season.

**Strategy validation:** `SWAP` requires every affected dinner to be `ANNOUNCED` AND every `swapAssignments[i].role === CHEF` (else 400).

**Execution:**

1. Apply `decideRoleAssignmentWrites` for caller as chef on `targetDinnerEvent` → `ours`.
2. Apply `decideRoleAssignmentWrites` for the other person on each swap dinner → `theirs`.
3. Apply `menuStrategy` to TheSlope DB:
   - `PRESERVE` — no menu writes.
   - `SWAP` — copy menu fields target ↔ each swap dinner (server-side, cross-dinner).
   - `CLEAR` — apply `CHEF_LOSS_DINNER_UPDATES` to all affected dinners + clear allergens.
4. For each ANNOUNCED dinner whose chef changed (best-effort, ADR-013): delete old HN event via system token; recreate under caller's token only for the target side.
5. Returns `SwapResult { ours: DinnerEventDetail[], theirs: DinnerEventDetail[] }` (caller's perspective). `ours.length === 1`; `theirs.length === 0` for pure takeover, ≥1 for swap.

The swap panel's "my upcoming assignments" list is derived client-side from `usersStore.myTeams` (existing). No new GET endpoint.

### Business Logic — composables

Pure decision functions, unit-tested without I/O. Endpoints execute the plans.

```ts
// app/composables/useCookingTeam.ts
decideRoleAssignmentWrites(cookingTeamId: number, inhabitantId: number, role: TeamRole): RoleAssignmentPlan
  // Returns: { chefId: number | null, assignment: CookingTeamAssignmentCreate }
  // chefId is the inhabitantId when role === CHEF, else null.

// app/composables/useBooking.ts (existing — no new composable)
export const CHEF_LOSS_DINNER_UPDATES = {
    chefId: null,
    menuTitle: '',
    menuDescription: '',
    menuPictureUrl: null,
    totalCost: 0,
    heynaboEventId: null,
    state: DinnerStateSchema.enum.SCHEDULED
} satisfies Partial<DinnerEventUpdate>
```

`decideRoleAssignmentWrites` is used by `assign-role` (Phase 1 refactor), `remove-role` (Phase 3), and `assignment/swap` (Phase 3).

`CHEF_LOSS_DINNER_UPDATES` is used by `remove-role` (when removing CHEF), `assignment/swap` (when `menuStrategy === 'CLEAR'`), and the move-out cascade (Phase 4). Endpoints apply it via `updateDinnerEvent(d1, dinner.id, CHEF_LOSS_DINNER_UPDATES)` plus `updateDinnerEventAllergens(d1, dinner.id, [])`. Heynabo deletion is endpoint-side I/O — captures `dinner.heynaboEventId` before applying the constant, then calls `deleteHeynaboEventAsSystem` separately.

### Authorization

```
server/utils/authorizationHelper.ts
  requireChefForDinner(event, dinnerEventId): UserDetail
    - 200 when caller has CookingTeamAssignment role=CHEF for dinner.cookingTeamId
    - 401 when not authenticated
    - 403 when caller has no Inhabitant or is not in the team's chef pool
    - 404 when dinner missing or has no cookingTeamId
```

Mirrors the UI gate: any team chef can act on any dinner of their team (chefs help each other). No admin bypass.

### Validation Schemas

```ts
// app/composables/useCoreValidation.ts (NEW shared building block)
const IdSchema = z.number().int().positive()

// app/composables/useCookingTeamValidation.ts
const RoleAssignmentPlanSchema = z.object({
    chefId: IdSchema.nullable(),
    assignment: CookingTeamAssignmentCreateSchema
})

// app/composables/useBookingValidation.ts — reuses AssignRoleSchema (DRY).
// dinner is the route [id]; inhabitantId optional, defaults to caller.
const RemoveRoleRequestSchema = AssignRoleSchema.partial({inhabitantId: true})

// app/composables/useCookingTeamValidation.ts
const MenuSwapStrategySchema = z.enum(['PRESERVE', 'SWAP', 'CLEAR'])

const SwapAssignmentsRequestSchema = z.object({
    targetDinnerEventId: IdSchema,
    swapAssignments: z.array(z.object({
        dinnerEventId: IdSchema,
        role: TeamRoleSchema
    })).default([]),
    menuStrategy: MenuSwapStrategySchema.default('PRESERVE')
})

// app/composables/useBookingValidation.ts
const SwapResultSchema = z.object({
    ours: z.array(DinnerEventDetailSchema),
    theirs: z.array(DinnerEventDetailSchema)
})
```

`IdSchema` is a foundational cleanup — 114 inline `z.number().int().positive()` sites in `app/composables/` exist today. Phase 1 introduces the shared schema; wide migration is out of scope for this PR.

### ADR Compliance

- **ADR-001** — schemas in validation composables; business logic in domain composables (`useCookingTeam`, `useBooking`); `IdSchema` shared in `useCoreValidation`.
- **ADR-002** — separate try-catch for validation vs business logic in all new endpoints.
- **ADR-004** — `console.info` for swap completion; `console.warn` for Heynabo failures; never log tokens.
- **ADR-005** — existing `onDelete` behaviour unchanged. Move-out cascade is a business rule, not a DB cascade.
- **ADR-006** — swap panel state in component refs.
- **ADR-007** — API calls via store methods.
- **ADR-009** — endpoints return `DinnerEventDetail`. Swap returns operation result `SwapResult`.
- **ADR-013** — Heynabo: user token for recreate (logged-in side); system token for deletes; best-effort on admin ops; user-facing failures surface to toast.

## Phases

Each phase ships as one or more commits, each red-first per ADR-003.

### Phase 0 — Update the proposal ✅

Design corrections applied: composables for business logic; client-side auto-claim; plain panel buttons; copy with date+team; `IdSchema`; strict `requireChefForDinner`; single `chef/dinner.e2e.spec.ts` per-endpoint test file.

### Phase 1 — Security + composable foundation ✅

Shipped:
- `IdSchema` added to `useCoreValidation` (shared building block; 114 inline `z.number().int().positive()` sites remain for opportunistic migration).
- `RoleAssignmentPlanSchema { nextChefId, assignment }` in `useCookingTeamValidation`; `decideRoleAssignmentWrites(cookingTeamId, inhabitantId, role, currentDinnerChefId)` in `useCookingTeam`. Returns the desired post-operation `dinner.chefId` (promote → me; demote of myself → null; otherwise unchanged).
- `/api/team/cooking/[id]/assign-role` refactored to delegate to the composable; endpoint contract unchanged. **New behaviour**: demoting from CHEF (when caller is the dinner's current chef) clears `dinner.chefId`. Pinned by new e2e test.
- `requireChefForDinner` in `server/utils/authorizationHelper.ts` — strict (any team chef of dinner.cookingTeamId passes), 401/403/404 codes. No admin bypass.
- Wired into `/api/chef/dinner/[id].post.ts` validation block (ADR-002). Closes the security gap that allowed any authenticated `Inhabitant` to mutate any dinner's menu.
- Test file consolidation: `dinnerAnnounce.e2e.spec.ts` + `dinnerAllergens.e2e.spec.ts` merged into single `chef/dinner.e2e.spec.ts` (flat, single `beforeAll` sets up season + team + member-as-chef).

Tests: 8 new unit cases (`useCoreValidation.unit.spec.ts`), 8 new (`useCookingTeam.nuxt.spec.ts`), 8 new (`authorizationHelper.unit.spec.ts`), 14 e2e (`chef/dinner.e2e.spec.ts` — 12 regression + 2 permission), 10 e2e (`assign-role.e2e.spec.ts` — 9 regression + 1 demotion). All green; lint + ts clean.

### Phase 2 — `RoleAssignment` + auto-claim ✅

Shipped:
- `app/components/shared/RoleAssignment.vue`: wrapper component with `UCollapsible` panel; vacant / swap branches; trigger styled with `heroPrimary` + chef icon + chevron-down rotation; `defineExpose({open})` for portrait-click. Past-dinner gate via `useSeason.isDinnerPast`. Watch on `dinnerEvent.id` closes panel on navigation.
- `RoleAssignmentForm.vue`: dumb form, emits `submit({ours, theirs?})`; commit label adapts to volunteer vs swap (`Ja tak, jeg bliver chefkok` / `Ja tak, jeg overtager chefkok-tjansen`). `LAYOUTS.formButtonRow` for stacked-on-mobile cancel/save.
- Mounted in `ChefMenuCard.vue` (next to portrait, ref-opened on portrait click) and `CookingTeamCard.vue` `#chef-action` slot (from `/chef` and `/dinner`).
- `useCookingTeam`: `isNotAssignedToMe(holder, myId)` predicate, `tryAutoClaim<T>(currentChefId, myId, claim)` generic auto-claim, `formatRoleClaimedTitle(dinner, role)` shared toast formatter (DRY across volunteer + auto-claim).
- `bookings.updateDinnerEventField`: orchestrates auto-claim via `tryAutoClaim` + `withLoadingAndErrorHandler` wrappers; toast title built via `formatRoleClaimedTitle`; returns `{dinner, wasAutoClaimed}`.
- `plan.claimRoleForMe(dinner, role)`: store-owned wrapper around `assignRoleToDinner`; shows the `formatRoleClaimedTitle` toast on success; returns `DinnerEventDetail | null`. Pages stripped of toast logic — `RoleAssignment` calls `claimRoleForMe`, pages just refresh.
- Tests: `RoleAssignment.nuxt.spec.ts` (10 cases: branch labels, open/close, single-click commit, exposed `open()`, past-dinner gate, panel-closes-on-id-change), `RoleAssignmentForm.nuxt.spec.ts` (6 cases: copy, cancel, submit shape), `bookings.nuxt.spec.ts` (4 cases: auto-claim parametrized + `isDinnerUpdating` toggling), `useCookingTeam.nuxt.spec.ts` (8 cases for `decideRoleAssignmentWrites` + 5 for `isNotAssignedToMe`), `ChefSwap.e2e.spec.ts` (parametrized over `/chef` and `/dinner` mounts: API state + UI assertions for trigger disappearance and `chef-display`/`chef-wanted` flip).

Cleanup along the way:
- Deleted dead `POST /api/admin/dinner-event/[id]` endpoint (zero production callers; was masquerading as the failing CI test path).
- `LAYOUTS.formButtonRow` extracted to design system; `IdSchema` in `useCoreValidation`; `authStore.inhabitantId` computed (replaces `user?.Inhabitant?.id ?? null` repetition across codebase).

Known issue surfaced: `/dinner` chef portrait does not visibly update after volunteering — `refreshDinnerEventDetail()` short-circuits against the SSR payload cache. `/chef` works only via `onMounted(() => refreshDinnerEventDetail())` workaround at `chef/index.vue:196-198`. ChefSwap.e2e's new UI assertion (`role-assignment-trigger` disappears, `chef-display` appears) reproduces the bug. **Fixed in Phase 2.5.**

### Phase 2.5 — SSR-safe reactive-key dinner-detail in bookings store

Symptom: `/dinner` chef portrait stale after volunteer. Root cause: `bookings.fetchDinnerEventDetail` is a one-shot `$fetch` (drops SSR cookies), wrapped page-side in `useAsyncData` whose `refresh()` then short-circuits against `nuxtApp.payload.data[key]` after hydration. `/chef` masks this with an `onMounted` refresh hack.

Fix (architect-approved, mirrors `bookings.ts:538-551 selectedBillingPeriodDetail` and `:580-592 selectedInvoiceTransactions`):

- `bookings.ts`: add `selectedDinnerEventId` ref + `useAsyncData` with reactive key `` `/api/admin/dinner-event/${selectedDinnerEventId.value || 'null'}` ``, `useRequestFetch` (closes SSR auth hole), `DinnerEventDetailSchema.parse` in transform. Setter `loadDinnerEventDetail(id)`. Status computeds `isSelectedDinnerEventDetailLoading` etc. `refreshSelectedDinnerEventDetail` exposed.
- `plan.assignRoleToDinner`: chain a cross-store `useBookingsStore().refreshSelectedDinnerEventDetail()` after `refreshSelectedSeason()` (line 489-491). Cycle is fine; bookings already imports plan store.
- `/dinner` and `/chef` pages: drop inline `useAsyncData(dinner-detail-…)` blocks. Add `watchEffect(() => bookingsStore.loadDinnerEventDetail(selectedDinnerId.value))` bridge. Bind `bookingsStore.selectedDinnerEventDetail` in template. Drop `onMounted` workaround on `/chef`.
- Page mutation handlers (`handleFormUpdate`, `handleAdvanceState`, `handleCancelDinner`, etc.) drop their `await refreshDinnerEventDetail()` calls — store self-refreshes after each mutation in `bookings.ts`.
- ADR-007 amendments (`useRequestFetch` rule + SSR payload cache rule + reactive-key-detail-belongs-in-store rule) — see separate review.

Order: implement /dinner first (where bug lives), validate ChefSwap.e2e turns green, then migrate /chef, drop the `onMounted` hack.

### Phase 3a — `remove-role` + Meld afbud (resign) ✅ shipping with this release

- `CHEF_LOSS_DINNER_UPDATES` constant in `useBooking`.
- `RemoveRoleRequestSchema` in `useBookingValidation` (`AssignRoleSchema.partial({inhabitantId})`).
- `POST /api/team/cooking/[id]/remove-role` + `plan.ts → resignRoleForMe`.
- `RoleAssignment.vue` Self branch: `Ændre tjans` trigger → resign panel (Meld afbud copy + `DangerButton` 2-step).

### Phase 3b — `swap` + swap panel

- `SwapAssignmentsRequestSchema`, `MenuSwapStrategySchema` in `useCookingTeamValidation`. `SwapResultSchema` in `useBookingValidation`.
- `POST /api/team/cooking/assignment/swap` + `plan.ts → swapAssignments`.
- Expand `RoleAssignment.vue` with swap form (assignments from `usersStore.myTeams`, filtered + projected client-side), menu decision, pre-commit re-announce note.
- "Needs re-announce" banner in `ChefMenuCard.vue`.

### Phase 4 — Move-out cascade + "Flytter" badge

- `server/utils/cleanupAssignmentsOnMoveOut.ts` using `CHEF_LOSS_DINNER_UPDATES`.
- Wire into `server/routes/api/household/[id]/update.post.ts` on `moveOutDate` change.
- Surface `household.moveOutDate` on team-assignment projection.
- Badge in `CookingTeamCard.vue` for members with future `moveOutDate`.
- Tests: `cleanupAssignmentsOnMoveOut.unit.spec.ts`, `moveout-cascade.e2e.spec.ts`, `CookingTeamCard.nuxt.spec.ts`.

## Reuse

| Existing | Used for |
|---|---|
| `fetchMyTeams` → `/api/team/my` → `usersStore.myTeams` | Swap panel's "my upcoming assignments" list |
| `fetchDinnerEvent`, `updateDinnerEvent`, `updateDinnerEventAllergens` | Dinner writes in swap and chef-loss |
| `createTeamAssignment`, `findTeamAssignmentByTeamAndInhabitant`, `updateTeamAssignment` | Team-assignment writes |
| `deleteHeynaboEventAsSystem`, `createHeynaboEvent` | Heynabo lifecycle in swap and chef-loss |
| `requireHouseholdAccess` pattern | Shape for `requireChefForDinner` |
| `rescaffoldOnFieldChange` pattern | Shape for move-out cascade hook |
| `getTeamShortName` (`useCookingTeam`) | Team name in panel copy |
| `formatDate` (`utils/date`) | Date in panel copy |
| `isChefFor` (`useSeason`) | Per-team chef check |