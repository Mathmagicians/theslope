# Feature: Chef Role Assignment & Swap

**Status:** Shipped (Phases 0–2.5, 3a) | **Date:** 2026-03-30 | **Archived:** 2026-10-05

Volunteer/claim/resign for the CHEF role, single entry point at the `ChefMenuCard` portrait.

## Pointers

| Piece | Where |
|---|---|
| Role assignment endpoint | `server/routes/api/team/cooking/[id]/assign-role.post.ts` (`decideRoleAssignmentWrites`, chef-takeover Heynabo flow) |
| Resign endpoint | `server/routes/api/team/cooking/[id]/remove-role.post.ts` (shared `removeChefRole` util, 207 on degraded HN sync) |
| Decision logic | `useCookingTeam().decideRoleAssignmentWrites`; `CHEF_LOSS_DINNER_UPDATES` in `useBooking` |
| UI | `RoleAssignment.vue` at the `ChefMenuCard` portrait (vacant claim / self resign / other swap trigger); auto-claim on menu save of a WANTED dinner |
| Store | `plan.ts → assignRoleToDinner, claimRoleForMe, resignRoleForMe`; `bookings.ts → selectedDinnerEventId` reactive-key detail (SSR-safe, Phase 2.5) |
| Auth | `requireChefForDinner` |
| Specs | `ChefSwap.e2e.spec.ts`, `useCookingTeam` unit specs |
| Takeover menu/Heynabo handling | `archived/bug-fix-chef-takeover.md` |

## Not shipped here

- **Phase 3b (assignment swap endpoint + swap panel):** superseded — cross-team duty swap in
  `this-pr/feature-proposal-duty-roster.md` Phase 5 covers the swap need.
- **Phase 4 (move-out cascade + "Flytter" badge):** moved to `this-pr/feature-proposal-duty-roster.md`
  (move-out section under Phase 5).
