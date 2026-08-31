# Bug Fix: Chef Takeover — "Ja tak, jeg overtager chefkokketjansen" Cannot Be Pressed

**Status:** Implemented
**Date:** 2026-08-31 | **Updated:** 2026-09-01
**Builds on:** [feature-proposal-chef-swap.md](feature-proposal-chef-swap.md) (panel spec, menu decision, Heynabo token flow)

## Problem

On a dinner that already has a chef, another member opens "Rediger chefkokketjans" and gets
the takeover panel — but the commit button "Ja tak, jeg overtager chefkokketjansen" is
permanently disabled. Taking over an occupied chef duty is impossible. Reported by users,
confirmed on dev.

## Red Tests First

These went RED against the broken code, drove the fix, and are all 🟢 GREEN now:

| Layer | Test | Outcome |
|---|---|---|
| Component (`RoleAssignmentForm.nuxt.spec.ts`, 10 tests, parametrized over mode × dinner state) | Swap commit ENABLED on a non-ANNOUNCED dinner; on an ANNOUNCED dinner disabled until a menu choice is made (radio rendered); volunteer enabled, no radio; resign renders `DangerButton` | 🔴 → 🟢 |
| Component (`RoleAssignment.nuxt.spec.ts`) | Takeover: swap save calls `claimRoleForMe` and emits `role-assigned` | 🔴 → 🟢 |
| E2E UI (`ChefSwap.e2e.spec.ts`, takeover flow on `/chef` and `/dinner`) | Dinner cheffed by inhabitant A; member B opens "Rediger chefkokketjans", commits → B is chef (verified via API) | 🔴 → 🟢 |
| API (`assign-role.e2e.spec.ts`) | (a) SCHEDULED dinner cheffed by A, B assigns CHEF → `chefId` = B | 🟢 already — contract pin so the server's takeover semantics can never silently change |
| API | (b) ANNOUNCED + `menuStrategy: CLEAR` → dinner reset to clean SCHEDULED, B is chef | 🔴 → 🟢 |
| API | (c) ANNOUNCED + `menuStrategy: PRESERVE` → menu and state kept, B is chef, `heynaboEventId` re-pointed | 🔴 → 🟢 |
| API | (d) ANNOUNCED + `PRESERVE` with a stale/undeletable Heynabo event → assignment stands, response is 207 (degraded sync, ADR-013) | 🟢 new |

### Test-layer contract (applied to `ChefSwap.e2e.spec.ts`)

Component tests verify UI rendering (labels, modes, enabled states); E2E tests verify
**trigger → API** from a deterministic starting state, asserting outcomes via API — never via
UI settling. The lifecycle test reloads the page between the volunteer and resign phases so
each trigger starts from a freshly rendered state; mid-session re-render propagation is
component-test territory (and the `/chef` refresh-chain item on the v0.9 release plan).

## Root Cause — regression chain

Takeover was intended, shipped behavior: `WorkAssignment`'s "Bliv chefkok" (chef-swap Phase 2)
let a member claim the chef duty whether or not it was occupied — assign-role's overwrite
semantics (`decideRoleAssignmentWrites`: `nextChefId = inhabitantId` for CHEF) are deliberate.

1. **#112** built the `RoleAssignment` panel; its swap commit was parked for Phase 3b
   (`RoleAssignment.handleSubmit`: `if (theirs !== undefined) return`). Harmless — the
   `WorkAssignment` button still provided takeover.
2. **#125** (2026-05-29) consolidated to a single entry point: removed the `WorkAssignment`
   button, assuming the panel covered takeover — and added `:disabled="isSwap"` to the
   panel's commit. Net: a shipped capability was removed; the label and the disabled flag are
   the same condition, so the button is dead 100% of the time it is readable.

## Why the Green Suite Missed It

- `ChefSwap.e2e.spec.ts` covers only the volunteer flow (vacant → claim → resign → cancel).
  No scenario renders swap mode: a dinner cheffed by someone else, viewed by another member.
- The assign-role API spec covers promote/demote/role-upgrade — the server-side takeover
  semantics — but no UI-level test exercised the takeover entry point, so #125's entry-point
  refactor failed nothing.

## Why Not a Minimal Re-enable (parity-only rejected)

Inheriting an ANNOUNCED dinner as-is leaves the Heynabo event published under the OLD chef's
account. Heynabo events can only be edited by their publisher; the menu-sync fallback
(`updateHeynaboEventWithFallback`) covers an ABSENT token, not a rejected one — so the new
chef's menu edits would silently never reach Heynabo, which would show the old menu until the
dinner. Correct takeover of an announced dinner requires the proposal's token flow
(delete as system, recreate under the taker's token). The fix is therefore **the takeover
slice of Phase 3b**, not a one-line re-enable.

## Fix — takeover slice of Phase 3b

Panel spec, menu-decision table, and Heynabo token flow are as designed in
[feature-proposal-chef-swap.md](feature-proposal-chef-swap.md) →
"Swap Panel", "Contextual Commit Button", "Menu Decision", "Heynabo Token Flow".

- **`RoleAssignmentForm.vue`** — swap branch gets the takeover content ("Du overtager fra
  {chef.name}…", agreement note); when `dinnerEvent.state === ANNOUNCED` a menu decision
  radio: Behold menu (`PRESERVE`) / Nulstil menu (`CLEAR`), commit disabled until chosen;
  otherwise commit active, no question. Remove `:disabled="isSwap"`. Emit gains `menuStrategy?`.
- **`RoleAssignment.vue`** — guard narrows to `if (theirs?.length) return`: an empty offer is
  a pure takeover (proposal's contextual-commit table), a non-empty offer is the two-sided
  trade, still parked. Takeover calls the SAME `planStore.claimRoleForMe(dinnerEvent, role,
  menuStrategy?)` as volunteer — one path for "make me the chef".
- **`plan.ts claimRoleForMe`** — passes `menuStrategy` through in the assign-role body.
- **`assign-role` endpoint** — `AssignRoleSchema` gains optional
  `menuStrategy: 'PRESERVE' | 'CLEAR'` (`MenuSwapStrategySchema` in
  `useBookingValidation`, next to `AssignRoleSchema`; name per proposal). When taking over
  from a different chef on an ANNOUNCED dinner:
  - `CLEAR` → `removeChefRole(d1, dinner)` (shared util from the v0.9 bug sprint: HN event
    deleted via system token, `CHEF_LOSS_DINNER_UPDATES`, allergens cleared), then assign —
    clean SCHEDULED, the taker announces their own menu later.
  - `PRESERVE` → keep menu; `deleteHeynaboEventAsSystem(old)` then
    `createHeynaboEvent(takerToken, createHeynaboEventPayload(dinner, baseUrl))` +
    default-picture upload + persist the new `heynaboEventId`. Taker's token from session as
    in `chef/dinner/[id].post.ts`; HN failure degrades to 207, the local change stands.
  - Vacant claim / non-ANNOUNCED takeover: unchanged (`menuStrategy` ignored).

Everything reuses existing machinery: `removeChefRole`, `createHeynaboEvent`,
`createHeynaboEventPayload`, `deleteHeynaboEventAsSystem`, the announce path's picture upload.

## Chef-Swap Feature Status

| Phase | Content | Status |
|---|---|---|
| 0–1 | Proposal, security + `decideRoleAssignmentWrites` foundation | ✅ shipped |
| 2 | `RoleAssignment` panel + auto-claim (volunteer flow) | ✅ shipped |
| 2.5 | SSR-safe dinner-detail in bookings store | ✅ shipped (refresh order polished in #163) |
| 3a | `remove-role` + Meld afbud | ✅ shipped (core shared as `removeChefRole` since #163) |
| 3b | Swap + swap panel | ⚠️ **takeover slice ships with this fix**; two-sided trade (`theirs` multi-select, `assignment/swap`, Byt menuer, re-announce banner) still open |
| 4 | Move-out cascade + "Flytter" badge | ❌ not shipped (the import-deletion side is covered by `removeChefRoleForInhabitants`; the moveOutDate-set cascade is absent) |

**Verdict:** part regression (an intended, shipped capability removed by #125), part missing
feature (the menu decision + token flow that make takeover of announced dinners correct).
Shipped together as the takeover slice because the regression cannot be fixed correctly
without it.

## Affected Areas

- `app/components/shared/RoleAssignmentForm.vue`, `app/components/shared/RoleAssignment.vue`
- `app/stores/plan.ts` (`claimRoleForMe`, `assignRoleToDinner`)
- `app/composables/useBookingValidation.ts` (`MenuSwapStrategySchema`, `AssignRoleSchema.menuStrategy`)
- `server/routes/api/team/cooking/[id]/assign-role.post.ts` (takeover branch, 207 on degraded HN sync)
- Tests: `RoleAssignmentForm.nuxt.spec.ts` (new), `RoleAssignment.nuxt.spec.ts`,
  `ChefSwap.e2e.spec.ts`, `assign-role.e2e.spec.ts`, `dinnerEventFactory.ts`
  (`assignRoleToDinnerEvent` accepts `menuStrategy` + expected status)
- Docs when shipped: compliance rows (assign-role endpoint, RoleAssignmentForm), dated note in the chef-swap proposal
