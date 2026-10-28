# 0.9.1 chores

**Status:** Next release | **Date:** 2026-10-08 | **Builds on:** release 0.9 (`archived/release-0.9.0.md` § Prisma bundle)

The release carries one migration, four indexes (defect 131, `migrations/0019_indexes.sql`, c4d3c44); the other schema
work is in `../release-0.9.3/feature-0.9.3.md`.

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
| Delete responses | A bulk delete reports the ids it read before the delete; a single delete answers the deleted id (ADR-009 rule 7) | – | done f4bb23f |
| Avatar ring colours | Each face rings in its surface's semantic colour (`docs/ui.md` § Faces) | – | done f4bb23f, signed off 2026-10-28 |

## In flight

Updated 2026-10-28. Release 0.9 shipped in f5b5205 (#168).

| Delivery | Description or spec | Gherkin | Status |
|---|---|---|---|
| Notification delivery | [feature-notification-delivery.md](feature-notification-delivery.md) | `booking-notifications.feature`, `billing-notifications.feature`, `chef-deadline-notifications.feature`, `delivery-records.feature`, `test-message.feature` (16586f1) | partly committed (8fa59aa, 39e14a6, 16586f1, 542b274, f4bb23f, 34ff620); open: defects 136–140, agent finishing |

## Notification delivery

Priority: high, issue #170. Spec: [feature-notification-delivery.md](feature-notification-delivery.md).
