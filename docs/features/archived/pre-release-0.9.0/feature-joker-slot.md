# Joker slot — shipped in release 0.9

**Status:** ✅ shipped (c62dd6b, 427a625, 3cdb77c; weekday restriction 2026-10-08) | **Signed:** form 2026-10-06 | **Proposal:** `../release-0.9.3/feature-proposal-duty-roster.md` § Joker (the vacancy faces, overviews and calendar markers stay there)

A joker slot is a time-bound team assignment without a person: team, role, allocation and affinity weekdays, plus a period
and a note. It lives beside `CookingTeamAssignment` and the duty scaffolder of the roster expands it to vacant duties.

| Piece | Where |
|---|---|
| Model `JokerSlot` | `prisma/schema.prisma`, migration `0017_roster` |
| Schemas `JokerSlotSchema`, `JokerSlotCreateSchema`, the serializers | `app/composables/useDutyValidation.ts` |
| The form (period, weekdays restricted to the team's affinity, role, note) | `app/components/cooking-team/JokerSlotForm.vue`, the mockup in its header |
| The team card's Jokertjanser list with add and delete | `app/components/cooking-team/CookingTeamCard.vue` |
| Endpoints | `PUT /api/admin/team/[id]/joker-slot`, `DELETE /api/admin/team/[id]/joker-slot/[slotId]` |
| Specs | `JokerSlotForm.nuxt.spec.ts`, `CookingTeamCard.nuxt.spec.ts`, `tests/e2e/api/parallel/admin/jokerSlot.e2e.spec.ts`, `AdminTeams.e2e.spec.ts` |
