# 0.9.1 chores

**Status:** Next release | **Date:** 2026-10-08 | **Builds on:** release 0.9 (`archived/release-0.9.0.md` § Prisma bundle)

The release carries one migration, four indexes (defect 131); the other schema work is in
`../release-0.9.3/feature-0.9.3.md`.

QA with human eyes: [qa.md](qa.md). Review defects: [defects.md](defects.md).

## Delivered

| Delivery | Description or spec | Gherkin | Status |
|---|---|---|---|
| Workflow checks | `run:` reads `${{ }}` through `env`; `pre:all` runs CodeQL's Actions queries | – | done 93834f4 |
| Household data access and GET previews | ADR-004 § Access; previews are GETs | – | done 52c5d68 |
| Three faces on a phone (#171) | Three faces below md, five from md | – | done 0b6d7d0, signed off 2026-10-27 |
| One master-detail layout (#169) | `LAYOUTS.masterDetailPage` on the list-and-detail pages | – | done 0b6d7d0, signed off 2026-10-27 |
| Tests at the lowest level | Access cases per `docs/testing.md` Rule 0 | – | done ef54aa6 |
| Ticket counts per person | `personTicketCounts` in `useOrder` for the grid's name cell | – | done 4349c92, 8401b44, a7f6285 |
| UI cases fail on an unexpected API error | An undeclared 4xx or 5xx fails the UI case (`apiErrorGuard.ts`) | – | done 52c5d68, fc87352 |
| Dev-server flakes in CI | Three retry flakes fixed; a dropped D1 connection answers 503 | – | done 4349c92, fc87352 |
| Preferences at an inhabitant's creation | `InhabitantCreateSchema` omits `dinnerPreferences` | – | done 6a0b5e7 |
| User saves and deserializers | Partial save by id; one deserializer per user type | – | done f7a4b6f, signed off 2026-10-27 |
| The job boxes' latest run | Each job box reads its own latest run (`AdminSystem.vue`) | – | done 17c3401, signed off 2026-10-27 |
| Zero-portion tickets get a place | Books and cancels as before the deadline (ADR-016) | – | done 17c3401, signed off 2026-10-27 |
| Tables keep their columns on a phone | Job history and users scroll sideways | – | done d159610, signed off 2026-10-27 |
| Tables key their rows by id | `getRowId`, `useExpandableRow` | – | done ea978dd, d159610, 6a4f22e, 542b274, signed off 2026-10-27 |
| The grid shows the day view's tickets | `BookingGridView.vue` header | – | done ea978dd, aa1e6e3, 002c4ae, 6a4f22e, signed off 2026-10-27 |
| Chef calendar visit | A member opens another team's dinners from the chef calendar; mockups in `pages/chef/index.vue`, `MyTeamSelector.vue` | – | done 002c4ae, fba24af; open: defect 101 |
| One path for the grid and the day view | ADR-016 compliance 13; `personOnDinner`, `guestItemsOf`, `useExpectedBookings`, `isDinnerCancelled` | – | done 9e75cef, fba24af, a7f6285, 2c32354 |
| Scaffold: a save naming an order bought by another household | The save lists it in `failed` and the rest lands; unit case `scaffoldPrebookings.unit.spec.ts:314` | – | done f5b5205 |
| Minimal test seasons | A season spans the dinners its cases prove (`docs/testing.md` § Strategy: Control the Season, Control the Deadline): `AdminEconomy`, `HouseholdBookingsCrossHousehold`, `HouseholdScaffolding`, `seasonLiveEdit`, `waitlistAssignment` | – | done 2c32354 |
| The app reads the time through `useClock` | ADR-017 compliance 8; the server render and the client agree on the minute | – | done 542b274 |

## In flight

Updated 2026-10-28. Release 0.9 shipped in f5b5205 (#168).

| Delivery | Description or spec | Gherkin | Status |
|---|---|---|---|
| Notification delivery | [feature-notification-delivery.md](feature-notification-delivery.md) | `booking-notifications.feature`, `billing-notifications.feature`, `chef-deadline-notifications.feature`, `delivery-records.feature`, `test-message.feature` (16586f1) | partly committed (8fa59aa, 39e14a6, 16586f1, 542b274); open: chef deadlines, defect 33 |
| Dinner page remounts on claim | § Dinner page remounts on claim | – | specified |
| Delete responses | § Delete responses | – | brief signed 2026-10-28 |
| DRY improvements | § DRY improvements | – | specified |
| Avatar ring colours | § Avatar ring colours | – | • in your test since 2026-10-28 (QA #123–#129)<br>• signed off 2026-10-28 |

## Dinner page remounts on claim

### Problem

Claiming or resigning a role on `/dinner` swaps the whole page for the loader and mounts it again: `assignRoleToDinner`
in `app/stores/plan.ts` awaits `refreshSelectedSeason()`, the dataset turns `pending`, `isPlanStoreReady` turns false,
and `app/pages/dinner/index.vue` replaces `<UPage>` with `<Loader>` until the refresh resolves.

### Solution

The page shows the loader on first load only; a refresh keeps the mounted tree and the store exposes a separate
`isRefreshing` flag for inline feedback (ADR-007 status computeds).

### TDD

`plan.nuxt`: a refresh after initialization keeps `isPlanStoreReady` true. `Chef.e2e` or `Dinner.e2e`: claiming a role
keeps the page mounted (the calendar keeps its open state, no loader).

### Affected

`app/stores/plan.ts`, `app/pages/dinner/index.vue`.

## Delete responses

### Problem

`deleteMany` on D1 reports the statement's change counter: the adapter returns `meta.changes` (`@prisma/adapter-d1`),
which the runtime computes from SQLite's `total_changes()`, and that total includes the rows a foreign key action
changes. The Heynabo import adds up the counts of `deleteInhabitantsByHeynaboId` and `deleteHouseholdsByHeynaboId`
(`server/utils/heynaboImportService.ts`), whose rows have cascading children, so its report counts the children too;
`deleteUsersByInhabitantHeynaboId` counts the inhabitant rows its SET NULL changes.
`DELETE /api/admin/team/assignment/[id]` is a single delete that answers a count; ADR-009 rule 7 gives a single delete
the deleted id.

### Solution

The bulk deletes read the ids they delete before the delete and report that length, as `deleteDinnerEvent` does
(`server/data/financesRepository.ts`). The assignment delete answers the deleted id through `IdSchema`, as the team and joker slot
deletes do.

### TDD

- Serial API: an import that removes an inhabitant with an allergy and a user reports one deleted inhabitant and one
  deleted user.
- API: the assignment delete case asserts the deleted id; its 404 case stays.

### Affected

`server/data/prismaRepository.ts`, `server/utils/heynaboImportService.ts`, the assignment delete route,
`app/stores/plan.ts`, `app/composables/useCoreValidation.ts` (`DeletedCountSchema` goes),
`tests/e2e/testDataFactories/seasonFactory.ts`, `team.e2e.spec.ts`, `heynabo.e2e.spec.ts`, `docs/adr-compliance-backend.md`.

## DRY improvements

### Route and composable leftovers

#### Problem

Six routes still spell a coerced id in a query schema (`order/index.get.ts`, `admin/dinner-event/index.get.ts`,
`admin/team/index.get.ts`, `household/allergy/index.get.ts`, `billing/index.get.ts`, `admin/household/inhabitants/[id].post.ts`
`seasonId`) beside `RouteIdSchema`. `useQueryParam.ts` repeats the normalize-or-default block three times. 
`app/stores/users.ts` exposes no `isEmpty` and `isStoreReady` (ADR-007 r2); `usePermissions.ts` and
`useUserRoles.ts` import `SystemRoleSchema` from the generated layer where ADR-001 routes it through `useCoreValidation`.
`chef/dinner/[id]/order-history.get.ts`, `expenses/index.get.ts` and `expenses/[expenseId].delete.ts` log no success line
(ADR-004).

#### Solution

`RouteIdSchema` / `RouteIdSchema.optional()` in the six query schemas; one `fallback(invalid)` in `useQueryParam`.
The users store gains the two flags with a case each; the two composables import the enum from `useCoreValidation`;
the three chef routes log one `console.info` on success.

#### Affected

The six query routes, the three chef routes, `app/composables/useQueryParam.ts`, `usePermissions.ts`, `useUserRoles.ts`,
`app/stores/users.ts` and its spec, `docs/adr-compliance-backend.md` rows.

## Notification delivery

Priority: high, issue #170. Status: design awaiting approval (2026-10-25). Spec:
[feature-notification-delivery.md](feature-notification-delivery.md).

## Avatar ring colours

Moved from release 0.9; brief presented 2026-10-20. `UserListItem` builds `md:ring-${color}` at runtime, which Tailwind
leaves out of the CSS, so from md up the faces on Præferencer and in the allergy alert ring in the text colour.

Signed 2026-10-28: each face rings in a colour already on its surface. The Alle row on Præferencer rings orange,
its Powermode badge's colour; an inhabitant rings amber; the allergy managers in the allergy alert ring ocean.
2026-10-28: each ring takes its semantic colour on the system's 700/400 light/dark pair. The raw `"ocean-500"` and the
hand-written `:ui` in `AllergyManagersList.vue` move into tokens; the prop takes the token's key, and the
`UserListItem` spec checks each key's token.
Where: `useTheSlopeDesignSystem.ts` `userListItem.ring`, `UserListItem.vue:143`, `HouseholdCard.vue:308`.
